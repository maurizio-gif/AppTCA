'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'
import { eAppuntamento } from '@/lib/agenda'

// Le tre pagine che mostrano una richiesta: le due sezioni Enquiries e
// l'agenda condivisa, dove gli appuntamenti prenotati dal sito compaiono nel
// giorno fissato (vedi lib/agenda.ts).
function rinfresca() {
  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
  revalidatePath('/dashboard/agenda')
}

type Risultato = { ok: true } | { ok: false; errore: string }

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action (non
// distingue un messaggio "sicuro" da uno sensibile), quindi l'unico modo per
// far arrivare un messaggio leggibile al client e' restituirlo come dato
// normale (stesso criterio di app/dashboard/timbratura/actions.ts).
//
// Lo stato di lavorazione non e' piu' qui: sta sull'opportunita' della persona
// (vedi app/dashboard/opportunita/actions.ts). Della singola richiesta restano
// la chiusura dell'appuntamento prenotato dal sito e la cancellazione.
//
// Chiudere un appuntamento e' cosa diversa dal chiudere la trattativa: la
// visita e' avvenuta, la trattativa puo' restare aperta per settimane. Senza
// questo, in agenda un appuntamento di ieri restava "da fare" per sempre.
//
// Lo puo' fare chiunque veda la sezione, anche se l'opportunita' e' in mano a
// una collega: chi era in sede quando il cliente e' arrivato deve poter
// scrivere com'e' andata, altrimenti non lo scrive nessuno. Chi ha chiuso
// cosa resta nel registro operatori, e in "Da fare" ci resta solo quello che
// c'e' davvero da fare.
async function leggiAppuntamento(id: string) {
  const supabase = createSupabaseServiceClient()

  const { data: contatto } = await supabase
    .from('form_contatti')
    .select('nome, cognome, email, data_richiesta, ora_richiesta, tipo_richiesta')
    .eq('id', id)
    .maybeSingle()

  if (!contatto) return { errore: 'Richiesta non trovata: ricarica la pagina.' as string, contatto: null }

  // Una richiesta che non e' un appuntamento non ha niente da chiudere:
  // controllo qui perche' la Server Action resta chiamabile a mano.
  if (!eAppuntamento(contatto)) {
    return { errore: 'Questa richiesta non è un appuntamento: non c’è niente da segnare come fatto.', contatto: null }
  }

  return { errore: null, contatto }
}

export async function completaAppuntamento(id: string, esito: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const { errore, contatto } = await leggiAppuntamento(id)
  if (errore) return { ok: false, errore }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('form_contatti')
    .update({
      appuntamento_completato_il: new Date().toISOString(),
      appuntamento_completato_da: email,
      appuntamento_esito: esito.trim() || null,
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  // L'esito entra nel log: e' la sostanza dell'azione, e in Controllo
  // Operatori serve poter leggere com'e' andata senza aprire il contatto (che
  // nel frattempo puo' essere stato modificato o cancellato).
  await registraLog(email, 'appuntamento_completato', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(contatto),
      email_contatto: contatto?.email ?? null,
      esito: esito.trim() || null,
    },
  })

  rinfresca()

  return { ok: true }
}

export async function riapriAppuntamento(id: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const { errore, contatto } = await leggiAppuntamento(id)
  if (errore) return { ok: false, errore }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('form_contatti')
    .update({ appuntamento_completato_il: null, appuntamento_completato_da: null })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  // L'esito non si cancella: se l'appuntamento e' stato riaperto per errore,
  // quello che era stato scritto non va perso.
  await registraLog(email, 'appuntamento_riaperto', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(contatto), email_contatto: contatto?.email ?? null },
  })

  rinfresca()

  return { ok: true }
}

// Verifica lato server (non solo lato UI, altrimenti la Server Action resta
// chiamabile a mano bypassando il permesso): solo chi ha "puo_cancellare"
// puo' cancellare definitivamente un contatto.
export async function eliminaContatto(id: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: chiamante } = await supabase
    .from('staff_users')
    .select('puo_cancellare')
    .eq('email', email ?? '')
    .maybeSingle()

  if (!chiamante?.puo_cancellare) {
    return { ok: false, errore: 'Non hai il permesso di cancellare i record.' }
  }

  // Il contatto intero si legge PRIMA di cancellarlo e finisce nel log:
  // dopo la delete non esiste piu' nulla da consultare, e un registro che
  // dice solo "cancellato il contatto <id>" non permette di verificare
  // cosa e' stato buttato via.
  const { data: record } = await supabase.from('form_contatti').select('*').eq('id', id).maybeSingle()

  const { error } = await supabase.from('form_contatti').delete().eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'contatto_cancellato', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(record),
      email_contatto: (record?.email as string | null) ?? null,
      record_cancellato: record ?? null,
    },
  })

  rinfresca()

  return { ok: true }
}
