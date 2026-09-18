'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { puoAmministrare } from '@/lib/auth/permessi'
import { DURATA_PREDEFINITA, eEventoDaCompletareInAutomatico, eTipoValido, ETICHETTE_TIPO, normalizzaOra } from '@/lib/agenda'

type Risultato = { ok: true } | { ok: false; errore: string }
// creaTask segnala anche se ha chiuso la voce da sola (vedi
// eEventoDaCompletareInAutomatico): il form lo mostra, cosi' non sembra un
// comportamento silenzioso e strano.
type RisultatoTask = { ok: true; completatoSubito: boolean } | { ok: false; errore: string }

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
  // task): lo usa il blocco "In agenda" dentro la riga di un record, e la
  // tendina "collega a" del form.
  entita?: string | null
  entitaId?: string | null
  // Persona e opportunita': se non arrivano ma il task e' collegato a una richiesta,
  // si ricavano da quella (vedi sotto) - l'operatore non deve ridirli.
  personaId?: string | null
  opportunitaId?: string | null
  // Chi e' l'appuntamento quando non e' ancora in anagrafica: si crea la
  // persona e la si collega, perche' una voce senza anagrafica non si salva
  // (vedi risolviPersona).
  nuovaPersona?: DatiNuovaPersona | null
}

export type DatiNuovaPersona = {
  nome: string
  cognome: string
  email?: string | null
  cellulare?: string | null
}

// Richieste da cui si puo' ricavare persona e opportunita' di un task.
const TABELLE_CON_PERSONA = ['form_contatti', 'form_invita_amico'] as const

// Le pagine che mostrano voci d'agenda: un task nuovo o completato deve
// comparire nella sezione Agenda, nel calendario delle Enquiries Adulti (che
// e' lo stesso calendario, vedi lib/agenda.ts) e nel blocco "In agenda"
// dentro la riga dei record collegati (vedi TaskEntita).
const PAGINE_AGENDA = ['/dashboard/agenda', '/dashboard/contatti/adulti', '/dashboard/invita-amico']

// La scheda di una persona ha lo stesso blocco "In agenda" (vedi TaskEntita),
// ma e' una rotta dinamica: il suo percorso vero (/dashboard/persone/<uuid>)
// qui non lo conosciamo, e passare il pattern con 'page' e' il modo con cui
// Next.js revalida tutte le schede in un colpo solo. Senza questo, chi
// completava o spostava una voce dalla scheda persona non vedeva cambiare
// nulla fino al ricarico.
const ROTTA_SCHEDA_PERSONA = '/dashboard/persone/[id]'

function rinfrescaAgenda() {
  for (const pagina of PAGINE_AGENDA) revalidatePath(pagina)
  revalidatePath(ROTTA_SCHEDA_PERSONA, 'page')
}

function emailCorrente(): string | null {
  const email = headers().get('x-tca-user-email')
  return email ? email.trim().toLowerCase() : null
}

// L'agenda e' condivisa anche in scrittura: chiudere un task o annullarlo lo
// puo' fare chiunque, non solo l'assegnatario. Chi risponde al telefono al
// posto di una collega deve poter scrivere com'e' andata subito, altrimenti
// l'esito non viene scritto da nessuno - e chi ha fatto cosa resta comunque
// nel registro operatori.
//
// La CANCELLAZIONE resta di chi ce l'ha in mano, di chi lo ha creato o di un
// amministratore: e' irreversibile, e non c'e' nessun motivo di fretta che la
// giustifichi al posto di un collega.
async function verificaPermesso(task: { assegnato_a: string; creato_da: string }, email: string): Promise<boolean> {
  if (task.assegnato_a.toLowerCase() === email) return true
  if (task.creato_da.toLowerCase() === email) return true
  return puoAmministrare(email)
}

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// I tipi generati da Supabase marcano i parametri di trova_o_crea_persona come
// non nullable, ma la funzione accetta null - ed e' importante che riceva
// null e non stringa vuota: '' sarebbe un valore come un altro, e due persone
// senza email verrebbero deduplicate insieme.
function oNull(valore: string | null | undefined): string {
  return (valore?.trim() || null) as unknown as string
}

// Nessuna voce d'agenda senza anagrafica: e' la regola del CRM, non una
// gentilezza del form. Chi e' l'appuntamento si sa sempre, altrimenti in
// agenda restano righe che nessuno sa piu' a chi appartengano (era cosi' per
// i walk-in, registrati con il tipo di visita al posto del nome).
//
// La persona arriva gia' scelta dall'anagrafica, oppure dalla richiesta
// collegata, oppure si crea qui al volo: la creazione passa da
// trova_o_crea_persona, la stessa funzione che i trigger dei moduli usano per
// deduplicare (vedi README), cosi' chi e' gia' a sistema viene riconosciuto
// invece di essere duplicato.
async function risolviPersona(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  personaIdTrovata: string | null,
  nuova: DatiNuovaPersona | null | undefined
): Promise<{ ok: true; personaId: string; creata: boolean } | { ok: false; errore: string }> {
  if (personaIdTrovata) return { ok: true, personaId: personaIdTrovata, creata: false }

  if (!nuova) {
    return {
      ok: false,
      errore: 'Ogni voce d’agenda deve essere collegata a una persona: cercala in anagrafica o creala qui.',
    }
  }

  const nome = nuova.nome?.trim()
  const cognome = nuova.cognome?.trim()
  const email = nuova.email?.trim().toLowerCase() || null
  const cellulare = nuova.cellulare?.trim() || null

  if (!nome || !cognome) return { ok: false, errore: 'Nome e cognome della persona sono obbligatori.' }
  if (!email && !cellulare) {
    return { ok: false, errore: 'Serve almeno un recapito, email o cellulare: senza, la stessa persona finirebbe in anagrafica più volte.' }
  }
  if (email && !EMAIL_VALIDA.test(email)) return { ok: false, errore: 'Inserisci un’email valida.' }

  const { data: personaId, error } = await supabase.rpc('trova_o_crea_persona', {
    p_nome: nome,
    p_cognome: cognome,
    p_email: oNull(email),
    p_cellulare: oNull(cellulare),
    // Identita' PerfectGym: non la conosciamo, chi si presenta al banco non
    // e' ancora un socio. Se lo e', la deduplicazione lo riconosce comunque
    // dall'email.
    p_pgm_member_id: oNull(null),
  })

  if (error) return { ok: false, errore: `Anagrafica non creata: ${error.message}` }
  if (!personaId) return { ok: false, errore: 'Anagrafica non creata: riprova.' }

  return { ok: true, personaId: String(personaId), creata: true }
}

export async function creaTask(dati: DatiNuovoTask): Promise<RisultatoTask> {
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

  // Persona e opportunita': quelle passate dal form, altrimenti quelle della
  // richiesta collegata. Cosi' un task creato dalla riga di un invito nasce
  // gia' agganciato alla persona e alla sua opportunita', senza chiedere nulla.
  let personaId = dati.personaId?.trim() || null
  let opportunitaId = dati.opportunitaId?.trim() || null

  if (!personaId && entita && entitaId && (TABELLE_CON_PERSONA as readonly string[]).includes(entita)) {
    const { data: richiesta } = await supabase
      .from(entita as 'form_contatti')
      .select('persona_id, opportunita_id')
      .eq('id', entitaId)
      .maybeSingle()
    personaId = richiesta?.persona_id ?? null
    opportunitaId = opportunitaId ?? richiesta?.opportunita_id ?? null
  }

  // L'opportunita' deve essere di quella persona: un task agganciato a quella
  // di qualcun altro comparirebbe nella scheda sbagliata.
  if (opportunitaId) {
    const { data: lead } = await supabase
      .from('opportunita')
      .select('id, persona_id')
      .eq('id', opportunitaId)
      .maybeSingle()
    if (!lead) return { ok: false, errore: 'L’opportunità collegata non esiste più: ricarica la pagina.' }
    if (personaId && lead.persona_id !== personaId) {
      return { ok: false, errore: 'L’opportunità scelta non è di quella persona.' }
    }
    personaId = personaId ?? lead.persona_id
  }

  // Ultimo passaggio prima di scrivere: o la persona c'e' (scelta, o ereditata
  // dalla richiesta collegata), o si crea adesso. Non esiste il terzo caso.
  const persona = await risolviPersona(supabase, personaId, dati.nuovaPersona)
  if (!persona.ok) return persona
  personaId = persona.personaId

  const completatoSubito = eEventoDaCompletareInAutomatico(dati.data, ora)
  const adesso = new Date().toISOString()

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
      persona_id: personaId,
      opportunita_id: opportunitaId,
      // Registrarla per un momento gia' passato (o nei prossimi 30 minuti)
      // vuol dire che l'evento e' gia' successo: nasce gia' completata,
      // altrimenti resterebbe "da fare" in agenda per sempre.
      stato: completatoSubito ? 'completato' : 'aperto',
      completato_il: completatoSubito ? adesso : null,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, completatoSubito ? 'task_creato_completato' : 'task_creato', {
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
      persona_id: personaId,
      persona_creata_adesso: persona.creata,
      completato_in_automatico: completatoSubito,
    },
  })

  rinfrescaAgenda()

  return { ok: true, completatoSubito }
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

// Spostare un impegno e' il gesto piu' frequente dell'agenda: un orario che
// slitta di mezz'ora, una visita rimandata a domani. Finche' non c'era, si
// poteva solo cancellare e riscrivere - perdendo la nota, l'esito e il
// collegamento alla persona.
//
// Si modifica solo il QUANDO e il COSA (tipo, titolo, note, assegnatario): il
// collegamento a persona/opportunita'/richiesta resta quello deciso alla
// creazione, spostarlo altrove sarebbe un altro task.
//
// Chi puo': chiunque, come per completare o annullare (l'agenda e' condivisa
// anche in scrittura, vedi verificaPermesso). Chi ha spostato cosa resta nel
// registro operatori, con il prima e il dopo.
export type DatiModificaTask = {
  titolo: string
  tipo: string
  data: string
  ora?: string | null
  durataMinuti?: number | null
  note?: string | null
  assegnatoA?: string | null
  // Solo per le voci nate prima del vincolo, che una persona non ce l'hanno:
  // e' l'unico modo per rimetterle in regola. Su una voce gia' collegata si
  // ignorano - spostare il con-chi sarebbe un altro appuntamento.
  personaId?: string | null
  nuovaPersona?: DatiNuovaPersona | null
}

export async function modificaTask(id: string, dati: DatiModificaTask): Promise<Risultato> {
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

  const { data: task, error: fetchError } = await supabase
    .from('task')
    .select('titolo, tipo, data, ora, durata_minuti, note, persona_id, assegnato_a, stato')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!task) return { ok: false, errore: 'Task non trovato: forse è stato cancellato.' }

  const assegnatoA = (dati.assegnatoA ?? task.assegnato_a ?? email).trim().toLowerCase()
  if (assegnatoA !== task.assegnato_a?.toLowerCase()) {
    const { data: staff } = await supabase.from('staff_users').select('email').eq('email', assegnatoA).maybeSingle()
    if (!staff) return { ok: false, errore: 'Quella persona non è fra gli operatori del CRM.' }
  }

  // Una voce gia' collegata tiene la sua persona; una nata prima del vincolo
  // la trova adesso, ed e' l'occasione per rimetterla in regola invece di
  // lasciarla senza nome per sempre.
  const persona = await risolviPersona(supabase, task.persona_id || dati.personaId?.trim() || null, dati.nuovaPersona)
  if (!persona.ok) return persona

  const { error } = await supabase
    .from('task')
    .update({
      titolo,
      tipo: dati.tipo,
      data: dati.data,
      ora,
      durata_minuti: durata,
      note: dati.note?.trim() || null,
      persona_id: persona.personaId,
      assegnato_a: assegnatoA,
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  // Prima e dopo nello stesso record di log: senza il "prima" non si capisce
  // che cosa e' stato spostato, e a che ora era.
  await registraLog(email, 'task_modificato', {
    entita: 'task',
    entitaId: id,
    dettagli: {
      titolo,
      prima: {
        titolo: task.titolo,
        tipo: eTipoValido(task.tipo) ? ETICHETTE_TIPO[task.tipo] : task.tipo,
        data: task.data,
        ora: normalizzaOra(task.ora),
        durata_minuti: task.durata_minuti,
        note: task.note,
        persona_id: task.persona_id,
        assegnato_a: task.assegnato_a,
      },
      dopo: {
        titolo,
        tipo: ETICHETTE_TIPO[dati.tipo],
        data: dati.data,
        ora,
        durata_minuti: durata,
        note: dati.note?.trim() || null,
        persona_id: persona.personaId,
        assegnato_a: assegnatoA,
      },
      persona_creata_adesso: persona.creata,
    },
  })

  rinfrescaAgenda()

  return { ok: true }
}
