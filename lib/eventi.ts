// Prenotazioni eventi arrivate dal form del sito (WebSite-TCA →
// src/components/EventoPrenotazioneForm.astro).
//
// Perché la configurazione dell'evento (posti, quote, scadenza) vive nel sito
// e non qui: la gestisce il marketing da TinaCMS insieme al testo dell'evento,
// e un solo posto in cui cambiarla evita che la pagina dica "16 posti" mentre
// il CRM ne accetta 20. Il sito però è statico e il numero arriverebbe dal
// browser (falsificabile), quindi la capienza NON si legge dalla richiesta: si
// rilegge dal manifest pubblicato dalla build del sito
// (/eventi-prenotabili.json) e si valida qui lato server.
//
// Server-only: usato dalle route /api/eventi/* e dalla dashboard.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export const STATI_PRENOTAZIONE = [
  'in_attesa_pagamento',
  'confermata',
  'scaduta',
  'annullata',
] as const

export type StatoPrenotazione = (typeof STATI_PRENOTAZIONE)[number]

export const ETICHETTE_STATO: Record<StatoPrenotazione, string> = {
  in_attesa_pagamento: 'In attesa di pagamento',
  confermata: 'Confermata (pagata)',
  scaduta: 'Scaduta (non pagata)',
  annullata: 'Annullata',
}

// Colori del badge di stato in tabella: stesse classi usate dagli altri
// moduli (vedi CLASSE_STATO in lib/pipeline.ts), cosi' i badge del CRM
// restano coerenti fra sezioni.
export const CLASSE_STATO_PRENOTAZIONE: Record<StatoPrenotazione, string> = {
  in_attesa_pagamento: 'richiesta-ambra',
  confermata: 'richiesta-verde',
  scaduta: 'richiesta-neutro',
  annullata: 'richiesta-neutro',
}

// Gli unici due stati che tengono impegnato un posto. Una prenotazione scaduta
// o annullata ha già restituito il suo posto al conteggio: è la stessa regola
// applicata dal cron e dalla dashboard, quindi vive qui una volta sola.
export const STATI_CHE_OCCUPANO: readonly StatoPrenotazione[] = ['in_attesa_pagamento', 'confermata']

// Le righe caricate prima di questa funzionalità non hanno stato: sono
// iscrizioni storiche già perfezionate, non prenotazioni in sospeso.
export function statoDi(riga: { stato?: string | null }): StatoPrenotazione {
  const s = riga.stato
  return (STATI_PRENOTAZIONE as readonly string[]).includes(s ?? '')
    ? (s as StatoPrenotazione)
    : 'confermata'
}

// ─── Manifest degli eventi prenotabili (pubblicato dal sito) ────────────────

export type EventoPrenotabile = {
  slug: string
  titolo: string
  titoloEn: string | null
  data: string
  postiTotali: number
  quotaSocio: number
  quotaNonSocio: number
  oreScadenza: number
  urlEvento: string
}

const SITO_URL = (process.env.SITO_TCA_URL ?? 'https://tcambrosiano.com').replace(/\/+$/, '')
const MANIFEST_URL = `${SITO_URL}/eventi-prenotabili.json`

// 60s: il manifest cambia solo a ogni deploy del sito. Più corto significa
// una fetch esterna per ogni apertura del form; più lungo terrebbe in piedi
// un evento chiuso al volo dal marketing (togliendo la spunta in TinaCMS il
// deploy c'è comunque, ma una chiusura d'emergenza deve valere in fretta).
const MANIFEST_TTL_MS = 60_000
const MANIFEST_TIMEOUT_MS = 6000

let cache: { scadenza: number; eventi: Map<string, EventoPrenotabile> } | null = null

function numeroPositivo(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Una voce con capienza o quote non valide viene scartata invece di essere
// "corretta" con un default: un default sbagliato aprirebbe prenotazioni a una
// quota inventata. Scartandola il form riceve "evento non prenotabile", che è
// un errore visibile e quindi correggibile.
function normalizza(voce: Record<string, unknown>): EventoPrenotabile | null {
  const slug = typeof voce.slug === 'string' ? voce.slug.trim() : ''
  const postiTotali = numeroPositivo(voce.postiTotali)
  const quotaSocio = Number(voce.quotaSocio)
  const quotaNonSocio = Number(voce.quotaNonSocio)
  const oreScadenza = numeroPositivo(voce.oreScadenza)

  if (!slug || !postiTotali || !oreScadenza) return null
  if (!Number.isFinite(quotaSocio) || quotaSocio < 0) return null
  if (!Number.isFinite(quotaNonSocio) || quotaNonSocio < 0) return null

  return {
    slug,
    titolo: typeof voce.titolo === 'string' ? voce.titolo : slug,
    titoloEn: typeof voce.titoloEn === 'string' && voce.titoloEn ? voce.titoloEn : null,
    data: typeof voce.data === 'string' ? voce.data : '',
    postiTotali: Math.floor(postiTotali),
    quotaSocio,
    quotaNonSocio,
    oreScadenza,
    urlEvento: typeof voce.urlEvento === 'string' ? voce.urlEvento : `${SITO_URL}/eventi/${slug}`,
  }
}

async function caricaManifest(): Promise<Map<string, EventoPrenotabile>> {
  if (cache && cache.scadenza > Date.now()) return cache.eventi

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS)
  try {
    const risposta = await fetch(MANIFEST_URL, { signal: controller.signal, cache: 'no-store' })
    if (!risposta.ok) throw new Error(`Manifest eventi: HTTP ${risposta.status}`)
    const corpo = await risposta.json()
    const voci = Array.isArray(corpo?.eventi) ? corpo.eventi : []

    const eventi = new Map<string, EventoPrenotabile>()
    for (const voce of voci) {
      const evento = normalizza(voce ?? {})
      if (evento) eventi.set(evento.slug, evento)
    }
    cache = { scadenza: Date.now() + MANIFEST_TTL_MS, eventi }
    return eventi
  } finally {
    clearTimeout(timer)
  }
}

// null = evento non prenotabile (slug sconosciuto, spunta togliata in
// TinaCMS, o manifest irraggiungibile). Chi chiama risponde 404/503: mai
// aprire una prenotazione senza sapere capienza e quota.
export async function getEventoPrenotabile(slug: string): Promise<EventoPrenotabile | null> {
  try {
    return (await caricaManifest()).get(slug) ?? null
  } catch {
    return null
  }
}

// ─── Posti ──────────────────────────────────────────────────────────────────

type Supa = SupabaseClient<Database>

export type Disponibilita = {
  postiTotali: number
  postiOccupati: number
  postiResidui: number
}

// Conta i posti tenuti impegnati adesso. Una prenotazione in attesa già
// scaduta non viene contata anche se il cron non l'ha ancora marcata: il cron
// gira ogni ora, e nel frattempo il posto è libero per chiunque lo chieda.
export async function contaDisponibilita(
  supabase: Supa,
  evento: EventoPrenotabile
): Promise<Disponibilita | null> {
  const { data, error } = await supabase
    .from('iscrizioni_eventi')
    .select('stato, scadenza_pagamento')
    .eq('evento_slug', evento.slug)

  if (error) return null

  const adesso = Date.now()
  const postiOccupati = (data ?? []).filter((riga) => {
    const stato = statoDi(riga)
    if (!STATI_CHE_OCCUPANO.includes(stato)) return false
    if (stato !== 'in_attesa_pagamento') return true
    const scadenza = riga.scadenza_pagamento ? Date.parse(riga.scadenza_pagamento) : NaN
    return !Number.isFinite(scadenza) || scadenza > adesso
  }).length

  return {
    postiTotali: evento.postiTotali,
    postiOccupati,
    postiResidui: Math.max(0, evento.postiTotali - postiOccupati),
  }
}

// ─── Verifica socio (via n8n) ───────────────────────────────────────────────
//
// Stesso webhook che il form contatti del sito interroga al primo passo
// (WEBHOOK_CHECK in src/lib/leadForm.client.js): risponde `iscritto`,
// `esiste` o `nuovo`, eventualmente con il suffisso _adulto/_bambino.
// "Socio" è solo `iscritto` — chi esiste in anagrafica senza contratto attivo
// non ha diritto alla quota ridotta.
//
// Il controllo passa da qui e non da PerfectGym direttamente: le credenziali
// PGM vivono nel workflow n8n, che è già l'unico punto in cui il sito verifica
// un'iscrizione. Duplicare la chiamata qui significherebbe tenere allineate
// due implementazioni della stessa domanda, e due posti in cui le credenziali
// possono mancare.

const WEBHOOK_VERIFICA =
  process.env.N8N_WEBHOOK_VERIFICA_ISCRITTO ??
  'https://automazione.n8ndevelop.it/webhook/tca-verifica-iscritto'

const TIMEOUT_VERIFICA_MS = 8000

export type EsitoVerifica = {
  socio: boolean
  stato: 'iscritto' | 'esiste' | 'nuovo' | null
  // false se la chiamata non è andata a buon fine: chi chiama decide se
  // proseguire (il form prosegue come non socio) e lo segnala nella risposta.
  riuscita: boolean
}

export async function verificaSocio(email: string): Promise<EsitoVerifica> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_VERIFICA_MS)
  try {
    const risposta = await fetch(WEBHOOK_VERIFICA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, origine: 'prenotazione-evento' }),
      signal: controller.signal,
    })
    if (!risposta.ok) return { socio: false, stato: null, riuscita: false }

    const corpo = await risposta.json()
    const match = /^(iscritto|esiste|nuovo)(?:_(?:adulto|bambino))?$/.exec(String(corpo?.stato ?? ''))
    if (!match) return { socio: false, stato: null, riuscita: false }

    const stato = match[1] as 'iscritto' | 'esiste' | 'nuovo'
    return { socio: stato === 'iscritto', stato, riuscita: true }
  } catch {
    return { socio: false, stato: null, riuscita: false }
  } finally {
    clearTimeout(timer)
  }
}

// Dati del socio presi dall'anagrafica interna, non richiesti a lui: è il
// motivo per cui a un socio il form non chiede nulla oltre all'email. Se la
// persona non è in anagrafica la prenotazione si salva comunque con la sola
// email — la segreteria la riconosce da quella, e perdere l'iscrizione per un
// nome mancante sarebbe peggio.
export type PersonaNota = {
  id: string
  nome: string | null
  cognome: string | null
  cellulare: string | null
  pgmMemberId: string | null
}

export async function cercaPersona(supabase: Supa, email: string): Promise<PersonaNota | null> {
  const { data } = await supabase
    .from('persone')
    .select('id, nome, cognome, cellulare, pgm_member_id, storico')
    .ilike('email', email)
    .eq('storico', false)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    nome: data.nome,
    cognome: data.cognome,
    cellulare: data.cellulare,
    pgmMemberId: data.pgm_member_id,
  }
}

// ─── Email trasazionali (delegate a n8n) ────────────────────────────────────
//
// Il CRM non ha un mittente configurato: le email del sito le manda già n8n,
// con i suoi template e il suo dominio autenticato. Qui si notifica solo
// l'evento; se il webhook non è configurato o fallisce, la prenotazione resta
// valida — perdere il posto per un'email non partita sarebbe peggio del
// mancato avviso, che la segreteria vede comunque in dashboard.

export type EventoEmail = 'prenotazione_ricevuta' | 'pagamento_confermato'

const WEBHOOK_EMAIL = process.env.N8N_WEBHOOK_EVENTO_EMAIL ?? ''

export async function notificaEmailEvento(
  tipo: EventoEmail,
  dati: Record<string, unknown>
): Promise<void> {
  if (!WEBHOOK_EMAIL) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    await fetch(WEBHOOK_EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, ...dati }),
      signal: controller.signal,
    })
  } catch {
    // volutamente ignorato, vedi commento sopra
  } finally {
    clearTimeout(timer)
  }
}

// ─── CORS ───────────────────────────────────────────────────────────────────
//
// Il chiamante è il sito statico su un altro dominio, quindi serve CORS. Non è
// un controllo di sicurezza (nessun cookie in gioco, e un client non-browser
// ignora CORS): a difendere queste route ci sono la capienza validata dal
// manifest, l'indice unico su (evento_slug, email) e il fatto che non
// restituiscono mai dati personali.
export function corsEventi(metodi: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': `${metodi}, OPTIONS`,
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// Prenotazione in attesa la cui finestra di pagamento e' gia' passata: il
// posto e' di fatto libero (vedi contaDisponibilita) ma il cron non l'ha
// ancora marcata. La dashboard la segnala subito, altrimenti la segreteria
// vedrebbe "in attesa" per un posto che sta gia' rivendendo.
export function attesaScaduta(riga: { stato?: string | null; scadenza_pagamento?: string | null }): boolean {
  if (statoDi(riga) !== 'in_attesa_pagamento') return false
  const scadenza = riga.scadenza_pagamento ? Date.parse(riga.scadenza_pagamento) : NaN
  return Number.isFinite(scadenza) && scadenza < Date.now()
}
