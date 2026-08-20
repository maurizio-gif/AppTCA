'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { puoCancellare as puoCancellareRecord } from '@/lib/auth/permessi'
import { isoDaOraRoma } from '@/lib/timbratura'

// Risultato come valore di ritorno e non un throw, per lo stesso motivo
// spiegato in timbratura/actions.ts: in produzione Next.js oscura il
// messaggio di un errore lanciato da una Server Action.
type Risultato = { ok: true } | { ok: false; errore: string }

// Ogni azione qui rifa' da capo il controllo dei permessi: una Server
// Action resta chiamabile a mano anche da chi non vede il pulsante, quindi
// nascondere l'interfaccia non e' mai una protezione.
async function chiamante(): Promise<{ email: string } | { errore: string }> {
  const email = headers().get('x-tca-user-email')
  if (!email) return { errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  const sezioni = await getSezioniConsentite(email)
  if (!sezioni.includes('log-operatori')) {
    return { errore: 'Non hai accesso a Controllo Operatori.' }
  }
  return { email }
}

function formattaPerLog(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
}

// Correzione manuale di un turno gia' registrato (es. un'uscita timbrata
// il giorno sbagliato, che fa risultare un turno di 144 ore). Si aggiorna
// solo l'orario delle righe esistenti: qui non si creano timbrature
// mancanti, perche' ogni riga porta con se' le coordinate GPS del timbro
// (vedi timbratura/actions.ts) e inventarle renderebbe il dato non piu'
// distinguibile da un timbro reale.
export async function modificaTurno(
  idEntrata: number,
  idUscita: number | null,
  entrataLocale: string,
  uscitaLocale: string | null
): Promise<Risultato> {
  const chi = await chiamante()
  if ('errore' in chi) return { ok: false, errore: chi.errore }

  const isoEntrata = isoDaOraRoma(entrataLocale)
  if (!isoEntrata) return { ok: false, errore: "Data e ora di entrata non valide." }

  const isoUscita = idUscita !== null ? isoDaOraRoma(uscitaLocale ?? '') : null
  if (idUscita !== null && !isoUscita) return { ok: false, errore: "Data e ora di uscita non valide." }
  if (isoUscita && Date.parse(isoUscita) <= Date.parse(isoEntrata)) {
    return { ok: false, errore: "L'uscita deve essere successiva all'entrata." }
  }

  const supabase = createSupabaseServiceClient()

  const idCoinvolti = idUscita !== null ? [idEntrata, idUscita] : [idEntrata]
  const { data: righeTurno, error: erroreLettura } = await supabase
    .from('timbrature')
    .select('id, email, tipo, created_at')
    .in('id', idCoinvolti)

  if (erroreLettura) return { ok: false, errore: erroreLettura.message }

  const rigaEntrata = righeTurno?.find((r) => r.id === idEntrata)
  const rigaUscita = idUscita !== null ? righeTurno?.find((r) => r.id === idUscita) : null
  if (!rigaEntrata || rigaEntrata.tipo !== 'entrata' || (idUscita !== null && rigaUscita?.tipo !== 'uscita')) {
    return { ok: false, errore: 'Turno non trovato: ricarica la pagina, potrebbe essere già stato modificato.' }
  }

  // Le altre timbrature della stessa persona devono restare in sequenza:
  // un turno corretto "a mano" non puo' finire a cavallo di un altro,
  // altrimenti l'accoppiamento entrata/uscita (accoppiaTurni) produrrebbe
  // turni assurdi su righe che non si e' nemmeno toccato.
  const { data: altreRighe, error: erroreAltre } = await supabase
    .from('timbrature')
    .select('id, tipo, created_at')
    .eq('email', rigaEntrata.email)
    .order('created_at')

  if (erroreAltre) return { ok: false, errore: erroreAltre.message }

  const rimanenti = (altreRighe ?? [])
    .filter((r) => !idCoinvolti.includes(r.id))
    .map((r) => ({ tipo: r.tipo, quando: Date.parse(r.created_at) }))
  const inizio = Date.parse(isoEntrata)
  const fine = isoUscita ? Date.parse(isoUscita) : inizio

  if (rimanenti.some((r) => r.quando > inizio && r.quando < fine)) {
    return { ok: false, errore: 'Nel nuovo intervallo cadono altre timbrature della stessa persona.' }
  }
  const precedente = [...rimanenti].reverse().find((r) => r.quando <= inizio)
  if (precedente?.tipo === 'entrata') {
    return { ok: false, errore: 'Il turno finirebbe dentro un altro turno della stessa persona.' }
  }

  const { error: erroreEntrata } = await supabase
    .from('timbrature')
    .update({ created_at: isoEntrata })
    .eq('id', idEntrata)
  if (erroreEntrata) return { ok: false, errore: erroreEntrata.message }

  if (idUscita !== null && isoUscita) {
    const { error: erroreUscita } = await supabase
      .from('timbrature')
      .update({ created_at: isoUscita })
      .eq('id', idUscita)
    if (erroreUscita) return { ok: false, errore: erroreUscita.message }
  }

  // Nel log finiscono sia il valore vecchio sia quello nuovo: una
  // correzione manuale sulle ore lavorate deve restare ricostruibile.
  await registraLog(chi.email, 'timbratura_modificata', {
    entita: 'timbrature',
    entitaId: String(idEntrata),
    dettagli: {
      operatore: rigaEntrata.email,
      entrata_prima: formattaPerLog(rigaEntrata.created_at),
      entrata_dopo: formattaPerLog(isoEntrata),
      ...(rigaUscita && isoUscita
        ? { uscita_prima: formattaPerLog(rigaUscita.created_at), uscita_dopo: formattaPerLog(isoUscita) }
        : {}),
    },
  })

  revalidatePath('/dashboard/log-operatori')
  revalidatePath('/dashboard/timbratura')

  return { ok: true }
}

// Cancella entrambe le righe del turno (entrata e uscita): cancellarne una
// sola lascerebbe l'altra a farsi accoppiare con il turno vicino, cioe' un
// dato ancora piu' sbagliato di quello che si voleva togliere.
export async function eliminaTurno(idEntrata: number, idUscita: number | null): Promise<Risultato> {
  const chi = await chiamante()
  if ('errore' in chi) return { ok: false, errore: chi.errore }

  if (!(await puoCancellareRecord(chi.email))) {
    return { ok: false, errore: 'Non hai il permesso di cancellare i record.' }
  }

  const supabase = createSupabaseServiceClient()
  const idCoinvolti = idUscita !== null ? [idEntrata, idUscita] : [idEntrata]

  const { data: righeTurno } = await supabase
    .from('timbrature')
    .select('id, email, tipo, created_at')
    .in('id', idCoinvolti)

  const { error } = await supabase.from('timbrature').delete().in('id', idCoinvolti)
  if (error) return { ok: false, errore: error.message }

  const rigaEntrata = righeTurno?.find((r) => r.id === idEntrata)
  const rigaUscita = idUscita !== null ? righeTurno?.find((r) => r.id === idUscita) : null
  await registraLog(chi.email, 'timbratura_eliminata', {
    entita: 'timbrature',
    entitaId: String(idEntrata),
    dettagli: {
      operatore: rigaEntrata?.email ?? null,
      entrata: rigaEntrata ? formattaPerLog(rigaEntrata.created_at) : null,
      uscita: rigaUscita ? formattaPerLog(rigaUscita.created_at) : null,
    },
  })

  revalidatePath('/dashboard/log-operatori')
  revalidatePath('/dashboard/timbratura')

  return { ok: true }
}
