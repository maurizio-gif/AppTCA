import { classificaContatto } from './contatti'

// Agenda condivisa: un solo calendario per gli appuntamenti prenotati dal
// sito (form_contatti, dove data/ora le scrive il cliente compilando il
// form) e per i task che le consulenti si fissano da sole (tabella task).
// Le due sorgenti diventano "voci" con la stessa forma, cosi' il
// calendario (components/CalendarioAgenda.tsx) non sa da dove arrivano.
//
// Nessun import server-only qui: il file e' usato sia dai Server Component
// sia dai componenti client.

// Stesse tre categorie sia per i task sia per gli appuntamenti dal sito
// (che il form classifica in sede/telefonico, vedi classificaContatto):
// e' il senso di unire i due calendari.
export const TIPI = ['appuntamento_in_sede', 'appuntamento_telefonico', 'task'] as const
export type TipoVoce = (typeof TIPI)[number]

export const ETICHETTE_TIPO: Record<TipoVoce, string> = {
  appuntamento_in_sede: 'Appuntamento in sede',
  appuntamento_telefonico: 'Appuntamento telefonico',
  task: 'Task',
}

// Etichetta corta per la cella del calendario e per la colonna "Tipo",
// dove il nome intero non ci sta.
export const ETICHETTE_TIPO_BREVI: Record<TipoVoce, string> = {
  appuntamento_in_sede: 'In sede',
  appuntamento_telefonico: 'Telefonico',
  task: 'Task',
}

// Varianti di .richiesta-badge gia' esistenti: "in sede" verde e
// "telefonico" blu sono gli stessi colori che le Enquiries usano da sempre
// per i due tipi di appuntamento, il task si distingue in viola.
export const CLASSE_TIPO: Record<TipoVoce, string> = {
  appuntamento_in_sede: 'richiesta-verde',
  appuntamento_telefonico: 'richiesta-blu',
  task: 'richiesta-viola',
}

export const OPZIONI_TIPO = TIPI.map((tipo) => ({ valore: tipo, etichetta: ETICHETTE_TIPO[tipo] }))

// Quanto occupa in agenda ciascun tipo, quando non e' stato indicato
// diversamente. Non e' solo estetica: e' il dato con cui si calcolera' la
// disponibilita' da offrire a chi prenota un appuntamento dal sito, quindi
// una voce senza durata non e' ammessa.
export const DURATA_PREDEFINITA: Record<TipoVoce, number> = {
  appuntamento_in_sede: 30,
  appuntamento_telefonico: 10,
  task: 10,
}

export const STATI_TASK = ['aperto', 'completato', 'annullato'] as const
export type StatoTask = (typeof STATI_TASK)[number]

export const ETICHETTE_STATO_TASK: Record<StatoTask, string> = {
  aperto: 'Da fare',
  completato: 'Completato',
  annullato: 'Annullato',
}

export function eTipoValido(valore: string | null | undefined): valore is TipoVoce {
  return !!valore && (TIPI as readonly string[]).includes(valore)
}

export function eStatoTaskValido(valore: string | null | undefined): valore is StatoTask {
  return !!valore && (STATI_TASK as readonly string[]).includes(valore)
}

export type RigaTask = Record<string, any>

export type OrigineVoce = 'task' | 'form_contatti'

// Forma comune delle voci in agenda, qualunque sia la sorgente.
export type VoceAgenda = {
  // Unica nel calendario anche mescolando le sorgenti (gli id di tabelle
  // diverse potrebbero coincidere).
  chiave: string
  origine: OrigineVoce
  id: string
  tipo: TipoVoce
  titolo: string
  // 'YYYY-MM-DD'; null solo per gli appuntamenti dal sito senza data
  // registrata (i task hanno sempre un giorno).
  data: string | null
  // 'HH:MM'; null = tutto il giorno / orario non indicato.
  ora: string | null
  assegnatoA: string | null
  // Minuti occupati in agenda (vedi DURATA_PREDEFINITA).
  durataMinuti: number
  // Guida il pallino del giorno: c'e' ancora qualcosa da fare o no.
  daFare: boolean
  statoEtichetta: string
}

// Fine di una voce, per mostrare "09:30 - 10:00" invece della sola ora di
// inizio. Null se la voce non ha un orario (tutto il giorno).
export function oraFine(ora: string | null, durataMinuti: number): string | null {
  if (!ora) return null
  const [ore, minuti] = ora.split(':').map(Number)
  if (Number.isNaN(ore) || Number.isNaN(minuti)) return null
  const totale = ore * 60 + minuti + durataMinuti
  // Una voce che sfora la mezzanotte si fermerebbe a 23:59: in agenda non
  // esistono appuntamenti che scavalcano il giorno.
  const limitato = Math.min(totale, 23 * 60 + 59)
  return `${String(Math.floor(limitato / 60)).padStart(2, '0')}:${String(limitato % 60).padStart(2, '0')}`
}

// "09:30 - 10:00", oppure la sola ora se manca la durata utile.
export function intervalloOrario(ora: string | null, durataMinuti: number): string | null {
  if (!ora) return null
  const fine = oraFine(ora, durataMinuti)
  return fine && fine !== ora ? `${ora} - ${fine}` : ora
}

// Le colonne time di Postgres arrivano come 'HH:MM:SS': in agenda i secondi
// non servono mai.
export function normalizzaOra(ora: string | null | undefined): string | null {
  if (!ora) return null
  const pulita = String(ora).slice(0, 5)
  return /^\d{2}:\d{2}$/.test(pulita) ? pulita : null
}

export function chiaveGiorno(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

export function chiaveGiornoDa(data: Date): string {
  return chiaveGiorno(data.getFullYear(), data.getMonth(), data.getDate())
}

export function voceDaTask(riga: RigaTask): VoceAgenda {
  const stato: StatoTask = eStatoTaskValido(riga.stato) ? riga.stato : 'aperto'
  return {
    chiave: `task-${riga.id}`,
    origine: 'task',
    id: String(riga.id),
    tipo: eTipoValido(riga.tipo) ? riga.tipo : 'task',
    titolo: riga.titolo || 'Task',
    data: riga.data ? String(riga.data).slice(0, 10) : null,
    ora: normalizzaOra(riga.ora),
    assegnatoA: riga.assegnato_a ?? null,
    durataMinuti: Number(riga.durata_minuti) > 0 ? Number(riga.durata_minuti) : DURATA_PREDEFINITA.task,
    daFare: stato === 'aperto',
    statoEtichetta: ETICHETTE_STATO_TASK[stato],
  }
}

// Solo le richieste che sono davvero un appuntamento: i messaggi
// ("richiamami", domande generiche) non hanno un giorno e in agenda non
// c'entrano nulla, restano nel tab Messaggi delle Enquiries.
export function eAppuntamento(riga: Record<string, any>): boolean {
  return classificaContatto(riga) !== 'messaggio'
}

// form_contatti non ha una colonna durata (il form del sito non la chiede):
// la si assume da quanto dura di solito quel tipo di appuntamento, che e'
// esattamente cio' che serve per calcolare la disponibilita'.
export function voceDaContatto(riga: Record<string, any>): VoceAgenda {
  const tipo = classificaContatto(riga)
  const nome = `${riga.nome ?? ''} ${riga.cognome ?? ''}`.trim()
  return {
    chiave: `contatto-${riga.id}`,
    origine: 'form_contatti',
    id: String(riga.id),
    tipo: tipo === 'messaggio' ? 'task' : tipo,
    titolo: nome || riga.email || 'Appuntamento',
    data: riga.data_richiesta ? String(riga.data_richiesta).slice(0, 10) : null,
    ora: normalizzaOra(riga.ora_richiesta),
    // Un appuntamento prenotato dal sito non ha (ancora) un titolare: chi
    // lo ha gestito e' l'unica cosa che ci avviciniamo a un assegnatario.
    assegnatoA: riga.gestito ? riga.gestito_da ?? null : null,
    durataMinuti: DURATA_PREDEFINITA[tipo === 'messaggio' ? 'task' : tipo],
    daFare: !riga.gestito,
    statoEtichetta: riga.gestito ? 'Gestito' : 'Da gestire',
  }
}

// Prima chi ha un orario, in ordine cronologico ('HH:MM' si ordina bene
// alfabeticamente), poi i "tutto il giorno" in ordine di titolo: chi non ha
// un'ora finisce in fondo al giorno invece di rompere l'ordine degli altri.
export function confrontaVoci(a: { ora: string | null; titolo: string }, b: { ora: string | null; titolo: string }) {
  if (a.ora && b.ora && a.ora !== b.ora) return a.ora.localeCompare(b.ora)
  if (a.ora && !b.ora) return -1
  if (!a.ora && b.ora) return 1
  return a.titolo.localeCompare(b.titolo, 'it')
}

// Generica sulla voce, cosi' la usa sia il calendario (che alle voci
// aggiunge i nodi React del dettaglio) sia chi lavora solo sui dati.
export function raggruppaPerGiorno<T extends { data: string | null; ora: string | null; titolo: string }>(
  voci: T[]
): { gruppi: Map<string, T[]>; senzaData: T[] } {
  const gruppi = new Map<string, T[]>()
  const senzaData: T[] = []

  for (const voce of voci) {
    if (!voce.data) {
      senzaData.push(voce)
      continue
    }
    if (!gruppi.has(voce.data)) gruppi.set(voce.data, [])
    gruppi.get(voce.data)!.push(voce)
  }

  for (const lista of gruppi.values()) lista.sort(confrontaVoci)
  senzaData.sort(confrontaVoci)

  return { gruppi, senzaData }
}

// Nome e cognome dell'operatore quando lo conosciamo, altrimenti l'email:
// in agenda "Maria Rossi" dice molto piu' di "m.rossi@...".
export function etichettaPersona(
  email: string | null | undefined,
  nomiStaff: Record<string, string>
): string | null {
  if (!email) return null
  return nomiStaff[email.toLowerCase()] ?? email
}
