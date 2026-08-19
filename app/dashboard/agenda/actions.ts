'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { puoAmministrare } from '@/lib/auth/permessi'
import { DURATA_PREDEFINITA, eTipoValido, ETICHETTE_TIPO, normalizzaOra } from '@/lib/agenda'

type Risultato = { ok: true } | { ok: false; errore: string }

export type DatiNuovoTask = {
  titolo: string
  tipo: string
  data: string
  ora?: string | null
  // Minuti occupati in agenda: se non arriva, si usa il default del tipo
  // (vedi DURATA_PREDEFINITA). Serve per il calcolo della disponibilita'.
  durataMinuti?: number | null
  note?: string | null
  assegnatoA?: string | null
  // Collegamento opzionale a un record di un'altra sezione (vedi la tabella
  // task): oggi lo usa la tendina "collega a" del form, domani serve per i
  // task creati direttamente da una riga di un'altra tabella.
  entita?: string | null
  entitaId?: string | null
}

// Le pagine che mostrano voci d'agenda: un task nuovo o completato deve
// comparire nella sezione Agenda, nel calendario delle Enquiries Adulti (che
// e' lo stesso calendario, vedi lib/agenda.ts) e nel blocco "In agenda"
// dentro la riga dei record collegati (vedi TaskEntita).
const PAGINE_AGENDA = ['/dashboard/agenda', '/dashboard/contatti/adulti', '/dashboard/invita-amico']

function rinfrescaAgenda() {
  for (const pagina of PAGINE_AGENDA) revalidatePath(pagina)
}

function emailCorrente(): string | null {
  const email = headers().get('x-tca-user-email')
  return email ? email.trim().toLowerCase() : null
}

// Un task lo puo' chiudere/annullare/cancellare chi ce l'ha in mano, chi lo
// ha creato (tipico: la segreteria fissa un appuntamento per una collega e
// poi lo sposta) o un amministratore. Gli altri lo vedono e basta:
// l'agenda e' condivisa in lettura, non in scrittura.
async function verificaPermesso(task: { assegnato_a: string; creato_da: string }, email: string): Promise<boolean> {
  if (task.assegnato_a.toLowerCase() === email) return true
  if (task.creato_da.toLowerCase() === email) return true
  return puoAmministrare(email)
}

export async function creaTask(dati: DatiNuovoTask): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const titolo = dati.titolo.trim()
  if (!titolo) return { ok: false, errore: 'Scrivi un titolo: è quello che si legge nel calendario.' }
  if (!eTipoValido(dati.tipo)) return { ok: false, errore: 'Tipo non riconosciuto.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dati.data)) return { ok: false, errore: 'Scegli il giorno del task.' }

  const ora = normalizzaOra(dati.ora)
  if (dati.ora && !ora) return { ok: false, errore: 'Orario non valido: usa il formato HH:MM.' }

  const durata = Math.round(dati.durataMinuti ?? DURATA_PREDEFINITA[dati.tipo])
  if (!Number.isFinite(durata) || durata < 5 || durata > 480) {
    return { ok: false, errore: 'La durata deve essere fra 5 e 480 minuti.' }
  }

  const supabase = createSupabaseServiceClient()

  // Assegnare a se stessi e' il caso normale; assegnare a una collega deve
  // pero' restare possibile, ed e' proprio il senso dell'agenda condivisa.
  const assegnatoA = (dati.assegnatoA ?? email).trim().toLowerCase()
  if (assegnatoA !== email) {
    const { data: staff } = await supabase.from('staff_users').select('email').eq('email', assegnatoA).maybeSingle()
    if (!staff) return { ok: false, errore: 'Quella persona non è fra gli operatori del CRM.' }
  }

  const entita = dati.entita?.trim() || null
  const entitaId = dati.entitaId?.trim() || null
  if (!!entita !== !!entitaId) {
    return { ok: false, errore: 'Collegamento incompleto: scegli un record o lascia il task libero.' }
  }

  const { data: creato, error } = await supabase
    .from('task')
    .insert({
      titolo,
      tipo: dati.tipo,
      data: dati.data,
      ora,
      durata_minuti: durata,
      note: dati.note?.trim() || null,
      assegnato_a: assegnatoA,
      creato_da: email,
      entita,
      entita_id: entitaId,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'task_creato', {
    entita: 'task',
    entitaId: creato?.id ?? undefined,
    dettagli: {
      titolo,
      tipo: ETICHETTE_TIPO[dati.tipo],
      data: dati.data,
      ora,
      durata_minuti: durata,
      assegnato_a: assegnatoA,
      collegato_a: entita ? `${entita}:${entitaId}` : null,
    },
  })

  rinfrescaAgenda()

  return { ok: true }
}

async function aggiornaStato(
  id: string,
  nuovoStato: 'aperto' | 'completato' | 'annullato',
  azione: string,
  esito?: string
): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const supabase = createSupabaseServiceClient()

  const { data: task, error: fetchError } = await supabase
    .from('task')
    .select('titolo, tipo, data, assegnato_a, creato_da, stato')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!task) return { ok: false, errore: 'Task non trovato: forse è stato cancellato.' }

  if (!(await verificaPermesso(task, email))) {
    return { ok: false, errore: `Questo task è di ${task.assegnato_a}: non puoi modificarlo.` }
  }

  const { error } = await supabase
    .from('task')
    .update({
      stato: nuovoStato,
      completato_il: nuovoStato === 'completato' ? new Date().toISOString() : null,
      esito: nuovoStato === 'completato' ? esito?.trim() || null : null,
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, azione, {
    entita: 'task',
    entitaId: id,
    dettagli: { titolo: task.titolo, data: task.data, assegnato_a: task.assegnato_a, esito: esito?.trim() || null },
  })

  rinfrescaAgenda()

  return { ok: true }
}

export async function completaTask(id: string, esito?: string): Promise<Risultato> {
  return aggiornaStato(id, 'completato', 'task_completato', esito)
}

export async function annullaTask(id: string): Promise<Risultato> {
  return aggiornaStato(id, 'annullato', 'task_annullato')
}

export async function riapriTask(id: string): Promise<Risultato> {
  return aggiornaStato(id, 'aperto', 'task_riaperto')
}

export async function eliminaTask(id: string): Promise<Risultato> {
  const email = emailCorrente()
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const supabase = createSupabaseServiceClient()

  // Il task intero si legge PRIMA di cancellarlo e finisce nel log: dopo la
  // delete non resta piu' nulla da consultare (stesso criterio della
  // cancellazione di un contatto).
  const { data: task } = await supabase.from('task').select('*').eq('id', id).maybeSingle()
  if (!task) return { ok: false, errore: 'Task non trovato: forse è già stato cancellato.' }

  if (!(await verificaPermesso(task, email))) {
    return { ok: false, errore: `Questo task è di ${task.assegnato_a}: non puoi cancellarlo.` }
  }

  const { error } = await supabase.from('task').delete().eq('id', id)
  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'task_eliminato', {
    entita: 'task',
    entitaId: id,
    dettagli: { titolo: task.titolo, data: task.data, assegnato_a: task.assegnato_a, record_cancellato: task },
  })

  rinfrescaAgenda()

  return { ok: true }
}
