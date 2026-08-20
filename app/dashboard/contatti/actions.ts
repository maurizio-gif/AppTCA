'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'
import { eAppuntamento } from '@/lib/agenda'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { sincronizzaPgm } from '@/lib/perfectgym'
import { nomePersona } from '@/lib/persone'
import { ETICHETTE_STATO, normalizzaStato } from '@/lib/pipeline'
import { formatDateOra } from '@/lib/format'

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

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TIPI_RICHIESTA_MANUALE = ['messaggio', 'richiamami', 'appuntamento in sede'] as const

export type DatiContattoManuale = {
  nome: string
  cognome?: string | null
  email: string
  cellulare?: string | null
  gruppoAttivita: 'adulti' | 'junior'
  attivita: string[]
  tipoRichiesta: (typeof TIPI_RICHIESTA_MANUALE)[number]
  dataRichiesta?: string | null
  oraRichiesta?: string | null
  motivo?: string | null
}

type RisultatoContattoManuale =
  | { ok: true; id: string; avvisoPgm: string | null }
  | { ok: false; errore: string }

export type ContattoEsistente = {
  nome: string
  stato: string
  assegnatoA: string | null
  quando: string
} | null

// Avviso "soft" prima di salvare: se quell'email ha gia' un'opportunita'
// aperta (presa in carico o no), il form del sito non lo sa - chi chiama al
// telefono non e' li' a scegliere - ma chi la inserisce a mano si', ed e'
// facile non ricordarsi di aver gia' registrato quella persona. Non blocca
// nulla: la richiesta esiste comunque (vedi commento su creaContattoManuale
// sul perche' form_contatti non deve avere un vincolo di unicita' sull'
// email), e' solo un "occhio, forse la conosci gia'" prima di procedere.
export async function verificaContattoEsistente(email: string): Promise<ContattoEsistente> {
  const emailPulita = email.trim().toLowerCase()
  if (!EMAIL_VALIDA.test(emailPulita)) return null

  const supabase = createSupabaseServiceClient()

  const { data: persona } = await supabase
    .from('persone')
    .select('id, nome, cognome')
    .eq('tipo', 'adulto')
    .ilike('email', emailPulita)
    .maybeSingle()
  if (!persona) return null

  const { data: opportunita } = await supabase
    .from('opportunita')
    .select('stato, assegnato_a, assegnato_il, creato_il')
    .eq('persona_id', persona.id)
    .is('chiuso_il', null)
    .maybeSingle()
  if (!opportunita) return null

  return {
    nome: nomePersona(persona),
    stato: ETICHETTE_STATO[normalizzaStato(opportunita.stato)],
    assegnatoA: opportunita.assegnato_a,
    quando: formatDateOra(opportunita.assegnato_il ?? opportunita.creato_il),
  }
}

// Lead inserito a mano dalla segreteria quando arriva per telefono: stesso
// percorso e stessa tabella di un contatto arrivato dal sito (form_contatti),
// cosi' finisce nella stessa pipeline (Enquiries, Agenda) senza un giro a
// parte. Persona e opportunita' non si creano qui: le crea da sola la
// funzione trova_o_crea_persona/opportunita gia' agganciata da un trigger
// sull'insert, la stessa che gestisce i contatti arrivati dal sito.
//
// privacy e marketing nascono sempre true: chi chiama al telefono ha gia'
// dato il consenso a voce, non c'e' una spunta da fargli firmare come sul
// form del sito.
//
// utm_source/utm_medium marcano la provenienza "manuale": quando in futuro
// si aggiungera' l'invio automatico dell'email di conferma a chi compila il
// form, quel passaggio dovra' escludere chi ha utm_medium = "manuale" - qui
// la richiesta non arriva da chi l'ha scritta, ma da chi ha gia' parlato con
// lei al telefono.
//
// Prima di scrivere su Supabase si sincronizza con PerfectGym (vedi
// lib/perfectgym.ts): se l'email non esiste ancora la' viene creata come
// nuovo lead (stessa logica del nodo ADD LEAD del workflow n8n "2.
// CONTATTACI: FORM COMPILATO"), altrimenti si riusa il suo id e - stessa
// scelta del workflow - PerfectGym diventa la fonte di verita' per
// nome/cognome/cellulare, per non duplicare la stessa persona con un nome
// scritto diverso al telefono. Se PerfectGym non risponde, il contatto si
// salva comunque nel CRM interno (fail-open: la richiesta non va persa solo
// perche' PGM e' irraggiungibile), con un avviso da far vedere a chi lo sta
// inserendo.
export async function creaContattoManuale(dati: DatiContattoManuale): Promise<RisultatoContattoManuale> {
  const email = headers().get('x-tca-user-email')
  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  // Verifica lato server, non solo lato UI: altrimenti la Server Action
  // resta chiamabile a mano bypassando il permesso (stesso principio di
  // eliminaContatto qui sotto).
  const sezioni = await getSezioniConsentite(email)
  if (!sezioni.includes('contatti-adulti') && !sezioni.includes('contatti-junior')) {
    return { ok: false, errore: 'Non hai accesso alle Enquiries.' }
  }

  const nome = dati.nome.trim()
  if (!nome) return { ok: false, errore: 'Il nome è obbligatorio.' }

  const contattoEmail = dati.email.trim().toLowerCase()
  if (!EMAIL_VALIDA.test(contattoEmail)) {
    return { ok: false, errore: 'Inserisci un’email valida: senza email non si collega a nessuna persona in anagrafica.' }
  }

  if (!TIPI_RICHIESTA_MANUALE.includes(dati.tipoRichiesta)) {
    return { ok: false, errore: 'Tipo di richiesta non valido.' }
  }
  const eAppuntamentoRichiesto = dati.tipoRichiesta !== 'messaggio'
  if (eAppuntamentoRichiesto && !dati.dataRichiesta) {
    return { ok: false, errore: 'Scegli il giorno della richiamata o della visita.' }
  }

  const cognome = dati.cognome?.trim() || null
  const cellulare = dati.cellulare?.trim() || null

  const pgm = await sincronizzaPgm({ nome, cognome, email: contattoEmail, cellulare, privacy: true, marketing: true })

  const statoPgm =
    pgm.esitoVerificaPgm === 'NUOVO' ? (dati.gruppoAttivita === 'adulti' ? 'NUOVO ADULTO' : 'NUOVO') : pgm.esitoVerificaPgm

  const supabase = createSupabaseServiceClient()

  const { data: creato, error } = await supabase
    .from('form_contatti')
    .insert({
      nome: pgm.nomePgm ?? nome,
      cognome: pgm.cognomePgm ?? cognome,
      email: contattoEmail,
      cellulare: pgm.cellularePgm ?? cellulare,
      gruppo_attivita: dati.gruppoAttivita,
      attivita: dati.attivita,
      tipo_richiesta: dati.tipoRichiesta,
      data_richiesta: eAppuntamentoRichiesto ? dati.dataRichiesta : null,
      ora_richiesta: eAppuntamentoRichiesto ? dati.oraRichiesta?.trim() || null : null,
      motivo: dati.motivo?.trim() || null,
      privacy: true,
      marketing: true,
      pagina: 'manuale',
      cta: 'Inserimento manuale',
      utm_source: 'segreteria',
      utm_medium: 'manuale',
      gestito: false,
      is_new_user: pgm.esitoVerificaPgm === 'NUOVO',
      stato: statoPgm,
      esito_verifica_pgm: statoPgm,
      pgm_member_id: pgm.pgmMemberId,
      pgm_profile_url: pgm.pgmProfileUrl,
    })
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'contatto_manuale_creato', {
    entita: 'form_contatti',
    entitaId: creato?.id,
    dettagli: {
      nome,
      cognome: dati.cognome ?? null,
      email: contattoEmail,
      tipo_richiesta: dati.tipoRichiesta,
      gruppo_attivita: dati.gruppoAttivita,
      pgm_lead_creato: pgm.leadCreato,
      pgm_errore: pgm.errore,
    },
  })

  rinfresca()

  return {
    ok: true,
    id: creato!.id,
    avvisoPgm: pgm.errore
      ? `Salvato nel CRM, ma la sincronizzazione con PerfectGym è fallita (${pgm.errore}): verifica a mano su PerfectGym.`
      : null,
  }
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
