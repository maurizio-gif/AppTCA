'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { puoAmministrare } from '@/lib/auth/permessi'
import { nomePersona } from '@/lib/persone'
import { normalizzaStato, type StatoPipeline } from '@/lib/pipeline'

type Risultato = { ok: true } | { ok: false; errore: string }

// Colonne che puntano a una persona: unire due schede vuol dire spostare
// tutte queste su quella che resta. Elencate qui una volta sola, cosi'
// aggiungere un modulo domani e' una riga in piu' e non una dimenticanza.
const RIFERIMENTI: { tabella: string; colonna: string }[] = [
  { tabella: 'form_contatti', colonna: 'persona_id' },
  { tabella: 'form_invita_amico', colonna: 'persona_id' },
  { tabella: 'form_invita_amico', colonna: 'persona_socio_id' },
  { tabella: 'form_scuola_tennis', colonna: 'persona_id' },
  { tabella: 'form_scuola_tennis', colonna: 'persona_minore_id' },
  { tabella: 'form_summer_camp', colonna: 'persona_id' },
  { tabella: 'form_summer_camp', colonna: 'persona_minore_id' },
  { tabella: 'iscrizioni_eventi', colonna: 'persona_id' },
  { tabella: 'task', colonna: 'persona_id' },
  // I figli seguono il genitore che resta.
  { tabella: 'persone', colonna: 'genitore_id' },
]

// Quanto e' avanti un lead: serve a decidere quale resta aperto quando si
// uniscono due schede che ne hanno una ciascuna.
const AVANZAMENTO: Record<StatoPipeline, number> = {
  perso: 0,
  nuovo: 1,
  in_gestione: 2,
  vinto: 3,
  credito_caricato: 4,
}

function emailCorrente(): string | null {
  const email = headers().get('x-tca-user-email')
  return email ? email.trim().toLowerCase() : null
}

function rinfresca() {
  revalidatePath('/dashboard/persone')
  revalidatePath('/dashboard/persone/duplicati')
}

// Unione di due schede: irreversibile, quindi solo amministratori, e il
// record assorbito finisce per intero nel registro operatori - dopo la
// cancellazione non resta piu' niente da consultare.
export async function unisciPersone(idTenuta: string, idAssorbita: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }
  if (!(await puoAmministrare(email))) {
    return { ok: false, errore: 'Solo un amministratore può unire due schede.' }
  }
  if (idTenuta === idAssorbita) return { ok: false, errore: 'Sono la stessa scheda.' }

  const supabase = createSupabaseServiceClient()

  const { data: coppia } = await supabase.from('persone').select('*').in('id', [idTenuta, idAssorbita])
  const tenuta = (coppia ?? []).find((p) => p.id === idTenuta)
  const assorbita = (coppia ?? []).find((p) => p.id === idAssorbita)

  if (!tenuta || !assorbita) return { ok: false, errore: 'Una delle due schede non esiste più: ricarica la pagina.' }
  if (tenuta.tipo !== assorbita.tipo) {
    return { ok: false, errore: 'Non si può unire un minore con un adulto.' }
  }

  // Una sola opportunita' aperta per persona (indice unico parziale sul DB):
  // se entrambe ne hanno una, resta aperta la piu' avanti e l'altra viene
  // chiusa come persa, con il motivo scritto - non si perde traccia.
  const { data: aperte } = await supabase
    .from('opportunita')
    .select('id, persona_id, stato')
    .in('persona_id', [idTenuta, idAssorbita])
    .is('chiuso_il', null)

  const apertaTenuta = (aperte ?? []).find((o) => o.persona_id === idTenuta)
  const apertaAssorbita = (aperte ?? []).find((o) => o.persona_id === idAssorbita)

  if (apertaTenuta && apertaAssorbita) {
    const perdente =
      AVANZAMENTO[normalizzaStato(apertaAssorbita.stato)] > AVANZAMENTO[normalizzaStato(apertaTenuta.stato)]
        ? apertaTenuta
        : apertaAssorbita

    const { error } = await supabase
      .from('opportunita')
      .update({
        stato: 'perso',
        motivo_perso: `Unione anagrafica: scheda duplicata di ${nomePersona(tenuta)}`,
        chiuso_il: new Date().toISOString(),
        stato_da: email,
        stato_il: new Date().toISOString(),
      })
      .eq('id', perdente.id)

    if (error) return { ok: false, errore: error.message }
  }

  const { error: erroreLead } = await supabase
    .from('opportunita')
    .update({ persona_id: idTenuta })
    .eq('persona_id', idAssorbita)

  if (erroreLead) return { ok: false, errore: erroreLead.message }

  for (const { tabella, colonna } of RIFERIMENTI) {
    const { error } = await supabase
      .from(tabella as 'form_contatti')
      .update({ [colonna]: idTenuta } as never)
      .eq(colonna, idAssorbita)

    if (error) return { ok: false, errore: `${tabella}.${colonna}: ${error.message}` }
  }

  // I dati che mancano sulla scheda che resta li prende da quella assorbita;
  // quelli che ha gia' non si toccano.
  const { error: erroreArricchimento } = await supabase
    .from('persone')
    .update({
      nome: tenuta.nome ?? assorbita.nome,
      cognome: tenuta.cognome ?? assorbita.cognome,
      email: tenuta.email ?? assorbita.email,
      cellulare: tenuta.cellulare ?? assorbita.cellulare,
      cellulare_norm: tenuta.cellulare_norm ?? assorbita.cellulare_norm,
      codice_fiscale: tenuta.codice_fiscale ?? assorbita.codice_fiscale,
      data_nascita: tenuta.data_nascita ?? assorbita.data_nascita,
      pgm_member_id: tenuta.pgm_member_id ?? assorbita.pgm_member_id,
      genitore_id: tenuta.genitore_id ?? assorbita.genitore_id,
      // Se una delle due ha compilato qualcosa sul sito, la scheda unita non
      // e' piu' "solo storico".
      storico: tenuta.storico && assorbita.storico,
      aggiornato_il: new Date().toISOString(),
    })
    .eq('id', idTenuta)

  if (erroreArricchimento) return { ok: false, errore: erroreArricchimento.message }

  const { error: erroreCancellazione } = await supabase.from('persone').delete().eq('id', idAssorbita)
  if (erroreCancellazione) return { ok: false, errore: erroreCancellazione.message }

  await registraLog(email, 'persone_unite', {
    entita: 'persone',
    entitaId: idTenuta,
    dettagli: {
      tenuta: nomePersona(tenuta),
      assorbita: nomePersona(assorbita),
      email_tenuta: tenuta.email ?? null,
      email_assorbita: assorbita.email ?? null,
      record_assorbito: assorbita,
    },
  })

  rinfresca()

  return { ok: true }
}

// "Non sono la stessa persona": senza questo la pagina riproporrebbe per
// sempre le stesse coppie (tipicamente familiari con lo stesso cognome).
export async function ignoraDuplicato(idA: string, idB: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const supabase = createSupabaseServiceClient()

  // La vista genera le coppie con id_a < id_b: rispettiamo lo stesso ordine,
  // altrimenti la coppia ignorata non corrisponderebbe a quella proposta.
  const [primo, secondo] = idA < idB ? [idA, idB] : [idB, idA]

  const { error } = await supabase
    .from('duplicati_ignorati')
    .upsert({ id_a: primo, id_b: secondo, ignorato_da: email })

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'duplicato_ignorato', {
    entita: 'persone',
    entitaId: primo,
    dettagli: { coppia: [primo, secondo] },
  })

  rinfresca()

  return { ok: true }
}
