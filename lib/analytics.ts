import { prettifyKey } from '@/lib/format'

type RigaContatto = Record<string, any>

// Chiave di giorno (YYYY-MM-DD) nel fuso di Roma, cosi' un'enquiry delle
// 00:30 non finisce sul giorno UTC precedente.
export function chiaveGiorno(valoreISO: string): string {
  return new Date(valoreISO).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
}

export function aggiungiGiorni(chiave: string, giorni: number): string {
  const d = new Date(`${chiave}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

export function formatBreve(chiave: string): string {
  const [anno, mese, giorno] = chiave.split('-')
  return `${giorno}/${mese}/${anno}`
}

export const OPZIONI_RANGE = [
  { valore: 'tutto', etichetta: 'Tutto' },
  { valore: 'mtd', etichetta: 'Da inizio mese' },
  { valore: 'mese_precedente', etichetta: 'Mese precedente' },
  { valore: 'anno_corrente', etichetta: 'Anno corrente' },
  { valore: 'custom', etichetta: 'Personalizzato' },
] as const
export type PresetRange = (typeof OPZIONI_RANGE)[number]['valore']
const VALORI_RANGE = OPZIONI_RANGE.map((o) => o.valore) as readonly string[]

// Assente o non valido = "Tutto", cosi' e' quello che si vede aprendo
// Analytics senza parametri.
export function parsePreset(raw: string | undefined): PresetRange {
  if (raw && VALORI_RANGE.includes(raw)) return raw as PresetRange
  return 'tutto'
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
export function dataValida(v: string | undefined): v is string {
  return !!v && RE_DATA.test(v)
}

// Range effettivo (chiavi YYYY-MM-DD, incluse entrambe) per il preset
// scelto. "custom" richiede due date valide con da <= a, altrimenti
// ricade su "Da inizio mese" invece di rompere la pagina. "tutto" copre
// dal primo contatto registrato ad oggi, cioe' nessun filtro di data.
export function calcolaRange(
  preset: PresetRange,
  oggi: string,
  customDa: string | undefined,
  customA: string | undefined,
  primoGiorno: string
): { da: string; a: string } {
  const anno = Number(oggi.slice(0, 4))
  const mese = Number(oggi.slice(5, 7))

  if (preset === 'tutto') {
    return { da: primoGiorno, a: oggi }
  }

  if (preset === 'mese_precedente') {
    const meseScorso = mese === 1 ? 12 : mese - 1
    const annoMeseScorso = mese === 1 ? anno - 1 : anno
    const da = `${annoMeseScorso}-${String(meseScorso).padStart(2, '0')}-01`
    const a = aggiungiGiorni(`${oggi.slice(0, 7)}-01`, -1)
    return { da, a }
  }

  if (preset === 'anno_corrente') {
    return { da: `${anno}-01-01`, a: oggi }
  }

  // Basta una delle due date per applicare il filtro: l'altro estremo
  // ricade sul primo contatto registrato / oggi, invece di scartare tutta
  // la selezione finche' non sono valorizzate entrambe (prima causa per
  // cui la data scelta sembrava "non salvarsi").
  if (preset === 'custom') {
    const validaDa = dataValida(customDa) ? customDa : primoGiorno
    const validaA = dataValida(customA) ? customA : oggi
    if (validaDa <= validaA) return { da: validaDa, a: validaA }
  }

  return { da: `${oggi.slice(0, 7)}-01`, a: oggi }
}

export type PuntoGiorno = { data: string; adulti: number; junior: number; altro: number }

// Serie continua giorno per giorno per tutto il range scelto (anche i
// giorni senza enquiry, a zero) - cosi' il grafico ha una scala temporale
// reale invece di "saltare" i giorni vuoti.
export function costruisciSerieGiornaliera(righe: RigaContatto[], da: string, a: string): PuntoGiorno[] {
  const conteggi = new Map<string, { adulti: number; junior: number; altro: number }>()

  for (const riga of righe) {
    const chiave = chiaveGiorno(riga.created_at)
    const bucket = conteggi.get(chiave) ?? { adulti: 0, junior: 0, altro: 0 }
    const gruppo = (riga.gruppo_attivita || '').toLowerCase()
    if (gruppo === 'adulti') bucket.adulti += 1
    else if (gruppo === 'junior') bucket.junior += 1
    else bucket.altro += 1
    conteggi.set(chiave, bucket)
  }

  const serie: PuntoGiorno[] = []
  for (let giorno = da; giorno <= a; giorno = aggiungiGiorni(giorno, 1)) {
    const bucket = conteggi.get(giorno) ?? { adulti: 0, junior: 0, altro: 0 }
    serie.push({ data: giorno, ...bucket })
  }
  return serie
}

// L'esito PGM ha piu' varianti per lo stesso "e' un lead nuovo" (es. "NUOVO"
// e "NUOVO Adulto" arrivano da rami diversi del flusso n8n): contano tutte
// come un'unica categoria "Nuovo" invece di restare separate.
function normalizzaEsitoPgm(valore: unknown): unknown {
  if (typeof valore === 'string' && valore.trim().toLowerCase().startsWith('nuovo')) return 'Nuovo'
  return valore
}

// Descrive ogni classificazione mostrata in Analytics: stessa definizione
// usata sia per aggregare i conteggi (classificaPer) sia per filtrare la
// lista di dettaglio (filtraPerDimensione), cosi' i due non possono
// disallinearsi (es. normalizzazione applicata solo da una parte).
const DIMENSIONI_LEAD = {
  fonte: { campo: 'utm_source', etichettaVuoto: 'Organico', prettifica: true },
  campagna: { campo: 'utm_campaign', etichettaVuoto: 'Nessuna campagna', prettifica: true },
  cta: { campo: 'cta', etichettaVuoto: 'Nessuna CTA', prettifica: false },
  pagina: { campo: 'pagina', etichettaVuoto: 'Pagina non rilevata', prettifica: false },
  status: {
    campo: 'esito_verifica_pgm',
    etichettaVuoto: 'Non verificato',
    prettifica: false,
    normalizza: normalizzaEsitoPgm,
  },
} as const
export type DimensioneLead = keyof typeof DIMENSIONI_LEAD
export const DIMENSIONI_VALIDE = Object.keys(DIMENSIONI_LEAD) as DimensioneLead[]

function chiaveENormalizzato(riga: RigaContatto, dimensione: DimensioneLead): { chiave: string; grezzo: string } {
  const def = DIMENSIONI_LEAD[dimensione]
  const normalizza = 'normalizza' in def ? def.normalizza : undefined
  const valore = normalizza ? normalizza(riga[def.campo]) : riga[def.campo]
  const grezzo = String(valore ?? '').trim()
  return { chiave: grezzo ? grezzo.toLowerCase() : '__vuoto__', grezzo }
}

// Classifica generica per una delle dimensioni lead (fonte/campagna/cta/
// pagina/status): raggruppa senza distinguere maiuscole/minuscole ma mostra
// l'etichetta cosi' come arrivata la prima volta, insieme alla "chiave"
// usata per il drill-down (vedi filtraPerDimensione).
export function classificaPer(
  righe: RigaContatto[],
  dimensione: DimensioneLead
): { fonte: string; chiave: string; conteggio: number }[] {
  const def = DIMENSIONI_LEAD[dimensione]
  const conteggi = new Map<string, { etichetta: string; conteggio: number }>()

  for (const riga of righe) {
    const { chiave, grezzo } = chiaveENormalizzato(riga, dimensione)
    const etichetta = grezzo ? (def.prettifica ? prettifyKey(grezzo.toLowerCase()) : grezzo) : def.etichettaVuoto
    const voce = conteggi.get(chiave)
    if (voce) voce.conteggio += 1
    else conteggi.set(chiave, { etichetta, conteggio: 1 })
  }

  return [...conteggi.entries()]
    .sort((a, b) => b[1].conteggio - a[1].conteggio)
    .map(([chiave, v]) => ({ fonte: v.etichetta, chiave, conteggio: v.conteggio }))
}

// Sottoinsieme di righe la cui dimensione corrisponde alla chiave scelta
// (stessa chiave prodotta da classificaPer per quella riga): usato dalla
// pagina di dettaglio per mostrare le anagrafiche dietro a un conteggio.
export function filtraPerDimensione(righe: RigaContatto[], dimensione: DimensioneLead, chiave: string): RigaContatto[] {
  return righe.filter((riga) => chiaveENormalizzato(riga, dimensione).chiave === chiave)
}

export function filtraPerGiorno(righe: RigaContatto[], giorno: string): RigaContatto[] {
  return righe.filter((riga) => chiaveGiorno(riga.created_at) === giorno)
}
