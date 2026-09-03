// Lettura dei contenuti del sito disponibili per la newsletter.
//
// Il sito e' statico: i .md di WebSite-TCA/src/content non sono leggibili da
// qui. La build del sito pubblica /newsletter-feed.json (vedi
// WebSite-TCA/src/pages/newsletter-feed.json.ts) con news, eventi, servizi,
// promo e pagine gia' normalizzati - questo modulo lo rilegge, lo valida e lo
// consegna alla pagina /dashboard/newsletter.
//
// Stessa impostazione del manifest degli eventi prenotabili (lib/eventi.ts):
// una sola fetch esterna, cache breve, e una voce malformata viene scartata
// invece di essere "aggiustata" con default inventati - in newsletter un
// default sbagliato diventa un'email spedita con un titolo o un link finto.
//
// Server-only (fetch verso il sito): la forma dei dati sta in
// lib/newsletter-contenuti.ts, condivisa con il costruttore lato client.

import {
  TIPI_VOCE,
  type ContenutiSito,
  type ImmagineSito,
  type TipoVoce,
  type VoceSito,
} from './newsletter-contenuti'

export * from './newsletter-contenuti'

const SITO_URL = (process.env.SITO_TCA_URL ?? 'https://tcambrosiano.com').replace(/\/+$/, '')
const FEED_URL = `${SITO_URL}/newsletter-feed.json`

// 5 minuti: il feed cambia solo a ogni deploy del sito, e chi compone una
// newsletter ricarica la pagina più volte di fila mentre sceglie le voci.
// Il pulsante «Ricarica i contenuti dal sito» salta comunque la cache.
const FEED_TTL_MS = 5 * 60_000
const FEED_TIMEOUT_MS = 8000

let cache: { scadenza: number; contenuti: ContenutiSito } | null = null

function testo(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function testoOpzionale(v: unknown): string | null {
  const s = testo(v)
  return s || null
}

function urlAssoluto(v: unknown): string | null {
  const s = testo(v)
  if (!/^https?:\/\//i.test(s)) return null
  return s
}

// Senza titolo o senza URL la voce non è utilizzabile in una newsletter (un
// blocco senza titolo o con un link rotto è peggio di un blocco assente):
// viene scartata e semplicemente non compare nell'elenco.
function normalizza(voce: Record<string, unknown>): VoceSito | null {
  const id = testo(voce.id)
  const tipo = testo(voce.tipo) as TipoVoce
  const titolo = testo(voce.titolo)
  const url = urlAssoluto(voce.url)

  if (!id || !titolo || !url) return null
  if (!(TIPI_VOCE as readonly string[]).includes(tipo)) return null

  const paragrafi = Array.isArray(voce.paragrafi)
    ? voce.paragrafi.map((p) => testo(p)).filter(Boolean)
    : []

  const data = testo(voce.data)
  const dataValida = data && !Number.isNaN(new Date(data).getTime()) ? data : null

  return {
    id,
    tipo,
    titolo,
    categoria: testoOpzionale(voce.categoria),
    data: dataValida,
    sintesi: testo(voce.sintesi),
    paragrafi,
    luogo: testoOpzionale(voce.luogo),
    immagine: urlAssoluto(voce.immagine),
    immagineAlt: testoOpzionale(voce.immagineAlt),
    immagineEmailSafe: voce.immagineEmailSafe !== false,
    url,
    ctaLabel: testoOpzionale(voce.ctaLabel),
    ctaHref: urlAssoluto(voce.ctaHref),
    note: testoOpzionale(voce.note),
  }
}

// Ordine dell'elenco: prima le voci con una data (le più recenti in cima,
// perché sono quelle che finiscono in newsletter), poi il resto in ordine
// alfabetico. Chi compone trova subito le novità senza dover ordinare nulla.
function ordina(voci: VoceSito[]): VoceSito[] {
  return [...voci].sort((a, b) => {
    if (a.data && b.data) return b.data.localeCompare(a.data)
    if (a.data) return -1
    if (b.data) return 1
    return a.titolo.localeCompare(b.titolo, 'it')
  })
}

export async function caricaContenutiSito(opzioni?: { ignoraCache?: boolean }): Promise<ContenutiSito> {
  if (!opzioni?.ignoraCache && cache && cache.scadenza > Date.now()) return cache.contenuti

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS)
  try {
    const risposta = await fetch(FEED_URL, { signal: controller.signal, cache: 'no-store' })
    if (!risposta.ok) throw new Error(`Contenuti del sito: HTTP ${risposta.status}`)
    const corpo = await risposta.json()

    const vociGrezze = Array.isArray(corpo?.voci) ? corpo.voci : []
    const voci: VoceSito[] = []
    for (const voce of vociGrezze) {
      const normalizzata = normalizza(voce ?? {})
      if (normalizzata) voci.push(normalizzata)
    }

    const immaginiGrezze = Array.isArray(corpo?.immagini) ? corpo.immagini : []
    const immagini: ImmagineSito[] = []
    for (const immagine of immaginiGrezze) {
      const url = urlAssoluto(immagine?.url)
      const nome = testo(immagine?.nome) || url?.split('/').pop() || ''
      if (url && nome) immagini.push({ nome, url })
    }

    const contenuti: ContenutiSito = {
      generatoIl: testoOpzionale(corpo?.generatoIl),
      sito: urlAssoluto(corpo?.sito) ?? SITO_URL,
      voci: ordina(voci),
      immagini,
    }

    cache = { scadenza: Date.now() + FEED_TTL_MS, contenuti }
    return contenuti
  } finally {
    clearTimeout(timer)
  }
}
