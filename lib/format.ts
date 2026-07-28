export function prettifyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sì' : 'No'
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

export function isUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

// I timestamp in Postgres sono in UTC: senza timeZone esplicita, toLocaleString
// usa il fuso del runtime Node (UTC su Vercel), mostrando l'ora indietro di
// 1-2h rispetto a Roma.
export function formatDateOra(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
}

type Voce = [string, unknown]

// Categorie usate per raggruppare graficamente i campi nel dettaglio espanso
// (ExpandableRow), in ordine di visualizzazione. Basate sul pattern del nome
// colonna cosi' funzionano su tutte le tabelle (form_contatti, form_scuola_tennis,
// form_invita_amico, iscrizioni_eventi) senza dover elencare ogni campo a mano.
const CATEGORIE_DETTAGLIO: { titolo: string; test: (chiave: string) => boolean }[] = [
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
    titolo: 'Tracciamento',
    test: (k) =>
      k.startsWith('utm_') || ['vid', 'gclid', 'fbclid', 'referrer', 'cta'].includes(k),
  },
]

export function raggruppaDettagli(voci: Voce[]): { titolo: string; voci: Voce[] }[] {
  const gruppi = new Map<string, Voce[]>()
  const titoli = [...CATEGORIE_DETTAGLIO.map((c) => c.titolo), 'Altri dettagli']

  for (const voce of voci) {
    const [chiave] = voce
    const categoria = CATEGORIE_DETTAGLIO.find((c) => c.test(chiave))
    const titolo = categoria?.titolo ?? 'Altri dettagli'
    if (!gruppi.has(titolo)) gruppi.set(titolo, [])
    gruppi.get(titolo)!.push(voce)
  }

  return titoli
    .filter((titolo) => gruppi.has(titolo))
    .map((titolo) => ({ titolo, voci: gruppi.get(titolo)! }))
}
