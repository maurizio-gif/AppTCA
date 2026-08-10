export function prettifyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

type Operatore = { email: string; nome?: string | null; cognome?: string | null }

// Ordine alfabetico di cognome (fallback nome, poi email grezza per un
// tentativo di accesso non autorizzato che non ha un record in staff_users):
// stesso criterio in ogni elenco di operatori dell'app.
export function confrontaOperatori(a: Operatore, b: Operatore): number {
  const chiave = (o: Operatore) => (o.cognome || o.nome || o.email).toLowerCase()
  return chiave(a).localeCompare(chiave(b), 'it')
}

// Durata breve tra due timestamp ISO (es. tra due pageview consecutive di
// uno stesso visitatore): secondi sotto il minuto, altrimenti minuti, poi
// ore+minuti.
export function formatDurataBreve(daISO: string, aISO: string): string {
  const secondi = Math.max(0, Math.round((new Date(aISO).getTime() - new Date(daISO).getTime()) / 1000))
  if (secondi < 60) return `${secondi}s`
  const minuti = Math.round(secondi / 60)
  if (minuti < 60) return `${minuti} min`
  const ore = Math.floor(minuti / 60)
  const minutiResto = minuti % 60
  return minutiResto > 0 ? `${ore}h ${minutiResto}min` : `${ore}h`
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sì' : 'No'
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

// null da deltaPercentuale = si passa da 0 a un valore positivo: "nuovo"
// comunica meglio di una percentuale (che sarebbe infinita) il fatto che
// prima non c'era nulla da confrontare.
export function formatDelta(delta: number | null): string {
  if (delta === null) return 'nuovo'
  if (delta === 0) return '0%'
  const segno = delta > 0 ? '+' : ''
  return `${segno}${delta}%`
}

export function isUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

// mailto:/tel: per i campi contatto quando finiscono nel dettaglio espanso
// (es. non piu' mostrati come colonna principale della tabella).
export function contactHrefFor(key: string, value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  if (key === 'email') return `mailto:${value}`
  if (key === 'cellulare') return `tel:${value}`
  return null
}

const VARIANTI_RICHIESTA = ['blu', 'ambra', 'verde', 'viola', 'ciano'] as const

// I 3 tipi noti (form contatti) hanno un colore fisso e riconoscibile a
// colpo d'occhio; un tipo futuro non ancora previsto qui ottiene comunque
// un colore stabile via hash, invece di cadere tutto sul grigio neutro.
const VARIANTE_RICHIESTA_NOTA: Record<string, string> = {
  messaggio: 'blu',
  richiamami: 'ambra',
  'appuntamento in sede': 'verde',
}

export function variantePillola(testo: string | null | undefined): string {
  if (!testo) return 'neutro'
  const nota = VARIANTE_RICHIESTA_NOTA[testo.trim().toLowerCase()]
  if (nota) return nota
  let hash = 0
  for (let i = 0; i < testo.length; i++) {
    hash = (hash * 31 + testo.charCodeAt(i)) >>> 0
  }
  return VARIANTI_RICHIESTA[hash % VARIANTI_RICHIESTA.length]
}

// I timestamp in Postgres sono in UTC: senza timeZone esplicita, toLocaleString
// usa il fuso del runtime Node (UTC su Vercel), mostrando l'ora indietro di
// 1-2h rispetto a Roma.
export function formatDateOra(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
}

// data_richiesta e' una data pura (senza ora/fuso, es. "2026-07-29"): la
// costruiamo da anno/mese/giorno invece di passare per new Date(stringa),
// che la interpreterebbe come UTC e rischierebbe di sballare di un giorno
// una volta convertita al fuso locale.
export function formatDataRichiesta(value: string | null | undefined): string | null {
  if (!value) return null
  const [anno, mese, giorno] = value.split('-').map(Number)
  if (!anno || !mese || !giorno) return null
  const testo = new Date(anno, mese - 1, giorno).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return testo.charAt(0).toUpperCase() + testo.slice(1)
}

// Alias storico: alcuni punti (grafici Analytics, evidenza Richiesta) sono
// stati rinominati in formatDataConGiorno ma la funzione restava esportata
// solo come formatDataRichiesta (residuo di un merge non concluso, vedi
// app/dashboard/contatti/page.tsx). Stessa funzione, due nomi finche' non
// si uniforma anche l'ultimo chiamante (RichiestaSezione.tsx).
export const formatDataConGiorno = formatDataRichiesta

type Voce = [string, unknown]

// Categorie usate per raggruppare graficamente i campi nel dettaglio espanso
// (ExpandableRow). Basate sul pattern del nome colonna cosi' funzionano su
// tutte le tabelle (form_contatti, form_scuola_tennis, form_invita_amico,
// iscrizioni_eventi) senza dover elencare ogni campo a mano. "tecnico: true"
// marca i parametri di tracciamento (UTM, id vari): non interessano chi
// segue il contatto, restano chiusi in fondo (vedi raggruppaDettagli).
const CATEGORIE_DETTAGLIO: { titolo: string; test: (chiave: string) => boolean; tecnico?: boolean }[] = [
  {
    titolo: 'Contatti',
    test: (k) => k === 'email' || k === 'cellulare',
  },
  {
    titolo: 'Consensi',
    test: (k) => k === 'privacy' || k === 'marketing' || k.startsWith('consenso_'),
  },
  {
    titolo: 'PerfectGym',
    test: (k) =>
      k.startsWith('pgm_') || k.includes('contratto_pgm') || k === 'esito_verifica_pgm',
  },
  {
    titolo: 'Parametri tecnici',
    test: (k) =>
      k.startsWith('utm_') || ['vid', 'gclid', 'fbclid', 'referrer', 'cta', 'flow'].includes(k),
    tecnico: true,
  },
]

export function raggruppaDettagli(
  voci: Voce[]
): { titolo: string; voci: Voce[]; tecnico: boolean }[] {
  const gruppi = new Map<string, Voce[]>()
  const titoli = [...CATEGORIE_DETTAGLIO.map((c) => c.titolo), 'Altri dettagli']

  for (const voce of voci) {
    const [chiave] = voce
    const categoria = CATEGORIE_DETTAGLIO.find((c) => c.test(chiave))
    const titolo = categoria?.titolo ?? 'Altri dettagli'
    if (!gruppi.has(titolo)) gruppi.set(titolo, [])
    gruppi.get(titolo)!.push(voce)
  }

  const risultato = titoli
    .filter((titolo) => gruppi.has(titolo))
    .map((titolo) => ({
      titolo,
      voci: gruppi.get(titolo)!,
      tecnico: CATEGORIE_DETTAGLIO.find((c) => c.titolo === titolo)?.tecnico ?? false,
    }))

  // I dati utili a chi segue il contatto vengono prima, i parametri
  // tecnici sempre in fondo - indipendentemente dall'ordine con cui le
  // categorie sono dichiarate qui sopra.
  return [...risultato.filter((g) => !g.tecnico), ...risultato.filter((g) => g.tecnico)]
}
