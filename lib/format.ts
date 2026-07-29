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

// mailto:/tel: per i campi contatto quando finiscono nel dettaglio espanso
// (es. non piu' mostrati come colonna principale della tabella).
export function contactHrefFor(key: string, value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  if (key === 'email') return `mailto:${value}`
  if (key === 'cellulare') return `tel:${value}`
  return null
}

const VARIANTI_RICHIESTA = ['blu', 'ambra', 'verde', 'viola', 'ciano'] as const

// Colore stabile per tipo di richiesta, senza dover elencare a mano i
// valori possibili (restano liberi lato form): stessa stringa -> stesso
// colore ad ogni render.
export function variantePillola(testo: string | null | undefined): string {
  if (!testo) return 'neutro'
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

type Voce = [string, unknown]

// Categorie usate per raggruppare graficamente i campi nel dettaglio espanso
// (ExpandableRow). Basate sul pattern del nome colonna cosi' funzionano su
// tutte le tabelle (form_contatti, form_scuola_tennis, form_invita_amico,
// iscrizioni_eventi) senza dover elencare ogni campo a mano. "tecnico: true"
// marca i parametri di tracciamento (UTM, id vari): non interessano chi
// segue il contatto, restano chiusi in fondo (vedi raggruppaDettagli).
const CATEGORIE_DETTAGLIO: { titolo: string; test: (chiave: string) => boolean; tecnico?: boolean }[] = [
  {
    titolo: 'Bambino/a',
    test: (k) => k.startsWith('minore_'),
  },
  {
    titolo: 'Genitore',
    test: (k) => k.startsWith('genitore_') || k.startsWith('indirizzo_'),
  },
  {
    titolo: 'Iscrizione',
    test: (k) =>
      [
        'tipo_corso',
        'frequenza',
        'giorni',
        'compagno_preferito',
        'orari_preferiti',
        'orario_preparazione',
        'taglia_maglietta',
        'taglia_pantaloncini',
        'taglia_felpa',
      ].includes(k),
  },
  {
    titolo: 'Contatti',
    test: (k) => k === 'email' || k === 'cellulare',
  },
  {
    titolo: 'PerfectGym',
    test: (k) =>
      k.startsWith('pgm_') || k.includes('contratto_pgm') || k === 'esito_verifica_pgm',
  },
  {
    titolo: 'Consensi',
    test: (k) => k === 'privacy' || k === 'marketing' || k.startsWith('consenso_'),
  },
  {
    titolo: 'Parametri tecnici',
    test: (k) =>
      k.startsWith('utm_') ||
      ['vid', 'gclid', 'fbclid', 'referrer', 'cta', 'flow', 'pagina'].includes(k),
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
