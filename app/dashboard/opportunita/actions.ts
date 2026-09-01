'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { puoRiassegnare } from '@/lib/auth/permessi'
import { nomePersona } from '@/lib/persone'
import {
  ETICHETTE_STATO,
  eStatoFinale,
  eStatoValido,
  normalizzaStato,
  transizioneAmmessa,
} from '@/lib/pipeline'

type Risultato = { ok: true } | { ok: false; errore: string }

// L'opportunita' e' della PERSONA: le richieste (enquiries, inviti) sono cio'
// che l'ha generata. Cosi' due moduli compilati dalla stessa persona non
// diventano due trattative lavorate in parallelo.
//
// Le colonne di stato sulle richieste restano allineate da un trigger sul
// database (specchia_stato_opportunita), non da qui: vale anche per una
// modifica fatta fuori dall'app.
//
// Risultato come valore di ritorno e non un throw: in produzione Next.js
// oscura il messaggio di un errore lanciato da una Server Action.
const PAGINE = [
  '/dashboard',
  '/dashboard/invita-amico',
  '/dashboard/contatti/adulti',
  '/dashboard/contatti/junior',
  '/dashboard/persone',
]

function rinfresca() {
  for (const pagina of PAGINE) revalidatePath(pagina)
}

function emailCorrente(): string | null {
  const email = headers().get('x-tca-user-email')
  return email ? email.trim().toLowerCase() : null
}

function stessoOperatore(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
}

async function leggiOpportunita(id: string) {
  const supabase = createSupabaseServiceClient()
  return supabase
    .from('opportunita')
    .select('id, stato, assegnato_a, assegnato_il, persona_id, persone(nome, cognome, email)')
    .eq('id', id)
    .maybeSingle()
}

// Nome della persona nel registro operatori: l'id da solo non dice nulla a
// chi rilegge il registro.
function dettagliLog(opportunita: Record<string, any>) {
  return {
    persona: nomePersona(opportunita.persone),
    email_persona: opportunita.persone?.email ?? null,
    persona_id: opportunita.persona_id,
  }
}

// Il primo che la prende in carico ne diventa il titolare. Nessuna nota
// richiesta: deve restare un click, altrimenti nessuno lo fa e il dato di
// presa in carico non vale niente.
export async function prendiInGestione(id: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const supabase = createSupabaseServiceClient()
  const { data: opportunita, error: fetchError } = await leggiOpportunita(id)

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!opportunita) return { ok: false, errore: 'Opportunità non trovata: ricarica la pagina.' }

  const stato = normalizzaStato(opportunita.stato)
  if (stato !== 'nuovo') {
    return {
      ok: false,
      errore: opportunita.assegnato_a
        ? `Questa opportunità è già assegnata a ${opportunita.assegnato_a} (${ETICHETTE_STATO[stato]}).`
        : `Questa opportunità non è più da prendere in carico (${ETICHETTE_STATO[stato]}).`,
    }
  }

  const adesso = new Date().toISOString()

  const { data: aggiornate, error } = await supabase
    .from('opportunita')
    .update({
      stato: 'in_gestione',
      assegnato_a: email,
      assegnato_il: adesso,
      stato_da: email,
      stato_il: adesso,
    })
    .eq('id', id)
    // Fra la lettura e la scrittura c'e' sempre una finestra: se nel
    // frattempo l'ha preso qualcun altro questa update non tocca nulla.
    .eq('stato', 'nuovo')
    .select('id')

  if (error) return { ok: false, errore: error.message }
  if (!aggiornate?.length) {
    return { ok: false, errore: 'Un altro operatore l’ha presa in carico un istante prima di te.' }
  }

  await registraLog(email, 'opportunita_presa_in_gestione', {
    entita: 'opportunita',
    entitaId: id,
    dettagli: { ...dettagliLog(opportunita), assegnato_a: email },
  })

  rinfresca()

  return { ok: true }
}

export async function cambiaStato(id: string, nuovoStato: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }
  if (!eStatoValido(nuovoStato)) return { ok: false, errore: 'Stato non riconosciuto.' }

  const supabase = createSupabaseServiceClient()
  const { data: opportunita, error: fetchError } = await leggiOpportunita(id)

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!opportunita) return { ok: false, errore: 'Opportunità non trovata: ricarica la pagina.' }

  const stato = normalizzaStato(opportunita.stato)

  // Prendere in carico e' l'unico passaggio aperto a tutti ed e' anche quello
  // che assegna il lead: ha un'azione dedicata, qui la richiamiamo invece di
  // duplicarne le regole.
  if (stato === 'nuovo' && nuovoStato === 'in_gestione') {
    return prendiInGestione(id)
  }

  if (!transizioneAmmessa(stato, nuovoStato)) {
    return {
      ok: false,
      errore: `Da «${ETICHETTE_STATO[stato]}» non si può passare a «${ETICHETTE_STATO[nuovoStato]}».`,
    }
  }

  // Lo stato lo cambia chiunque, anche su un'opportunita' di un collega e anche
  // quando e' gia' chiusa: chi risponde al telefono non e' detto sia chi l'ha
  // presa in carico, e uno stato sbagliato che nessuno puo' correggere resta
  // sbagliato. La titolarita' continua a valere per la riassegnazione, e ogni
  // passaggio finisce in opportunita_storico e nel registro operatori.

  const adesso = new Date().toISOString()

  const { data: aggiornate, error } = await supabase
    .from('opportunita')
    .update({
      stato: nuovoStato,
      stato_da: email,
      stato_il: adesso,
      chiuso_il: eStatoFinale(nuovoStato) ? adesso : null,
    })
    .eq('id', id)
    .eq('stato', opportunita.stato)
    .select('id')

  if (error) return { ok: false, errore: error.message }
  if (!aggiornate?.length) {
    return { ok: false, errore: 'Lo stato è cambiato mentre stavi lavorando: ricarica la pagina e riprova.' }
  }

  await registraLog(email, 'opportunita_stato_cambiato', {
    entita: 'opportunita',
    entitaId: id,
    dettagli: {
      ...dettagliLog(opportunita),
      da: ETICHETTE_STATO[stato],
      a: ETICHETTE_STATO[nuovoStato],
    },
  })

  rinfresca()

  return { ok: true }
}

// Riportare in gestione un'opportunita' chiusa: la puo' fare qualsiasi
// operatore, come ogni altro cambio di stato. L'opportunita' torna allo stesso
// titolare, non a chi riapre - chi riapre sta correggendo un errore, non
// prendendosi il lavoro di un collega.
export async function riapriGestione(id: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const supabase = createSupabaseServiceClient()
  const { data: opportunita } = await leggiOpportunita(id)
  if (!opportunita) return { ok: false, errore: 'Opportunità non trovata: ricarica la pagina.' }

  const stato = normalizzaStato(opportunita.stato)
  if (!eStatoFinale(stato)) {
    return { ok: false, errore: `Questa opportunità non è chiusa (${ETICHETTE_STATO[stato]}): non c'è nulla da riaprire.` }
  }

  // Una sola opportunita' aperta per persona (indice unico parziale sul DB):
  // se nel frattempo ne e' nata un'altra, riaprire questa la violerebbe.
  const { data: altraAperta } = await supabase
    .from('opportunita')
    .select('id')
    .eq('persona_id', opportunita.persona_id)
    .is('chiuso_il', null)
    .maybeSingle()

  if (altraAperta) {
    return {
      ok: false,
      errore: 'Questa persona ha già un’opportunità aperta: lavora quella invece di riaprire la precedente.',
    }
  }

  const adesso = new Date().toISOString()

  const { error } = await supabase
    .from('opportunita')
    .update({ stato: 'in_gestione', stato_da: email, stato_il: adesso, motivo_perso: null, chiuso_il: null })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'opportunita_riaperta', {
    entita: 'opportunita',
    entitaId: id,
    dettagli: { ...dettagliLog(opportunita), da: ETICHETTE_STATO[stato] },
  })

  rinfresca()

  return { ok: true }
}

export async function riassegna(id: string, nuovoAssegnato: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const destinatario = nuovoAssegnato.trim().toLowerCase()
  if (!destinatario) return { ok: false, errore: 'Scegli a chi assegnare l’opportunità.' }

  const supabase = createSupabaseServiceClient()

  const { data: staff } = await supabase.from('staff_users').select('email').eq('email', destinatario).maybeSingle()
  if (!staff) return { ok: false, errore: 'Quella persona non è fra gli operatori del CRM.' }

  const { data: opportunita } = await leggiOpportunita(id)
  if (!opportunita) return { ok: false, errore: 'Opportunità non trovata: ricarica la pagina.' }

  // Chi ha il lead in mano lo puo' sempre passare a un collega; per gli altri
  // serve il permesso "Puo' riassegnare i lead" (Gestione utenti). Il
  // controllo e' qui e non solo nella UI: la Server Action resta chiamabile a
  // mano.
  if (!stessoOperatore(opportunita.assegnato_a, email) && !(await puoRiassegnare(email))) {
    return { ok: false, errore: 'Non hai il permesso di riassegnare un’opportunità di qualcun altro.' }
  }

  const stato = normalizzaStato(opportunita.stato)
  const adesso = new Date().toISOString()

  const { error } = await supabase
    .from('opportunita')
    .update({
      assegnato_a: destinatario,
      // Da qui parte il tempo di gestione del nuovo titolare; il precedente
      // resta nel registro operatori.
      assegnato_il: adesso,
      // Un'opportunita' ancora da prendere in carico, assegnata a mano, entra
      // in gestione: senza questo resterebbe fra quelle da prendere in carico
      // pur avendo un titolare.
      stato: stato === 'nuovo' ? 'in_gestione' : stato,
      stato_da: email,
      stato_il: adesso,
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'opportunita_riassegnata', {
    entita: 'opportunita',
    entitaId: id,
    dettagli: { ...dettagliLog(opportunita), da: opportunita.assegnato_a ?? null, a: destinatario },
  })

  rinfresca()

  return { ok: true }
}
