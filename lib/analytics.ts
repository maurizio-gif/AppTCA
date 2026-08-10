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

// Solo per i tooltip dei grafici Analytics (in inglese, a differenza del
// resto dell'app, che resta in italiano - vedi formatDataConGiorno in
// lib/format.ts, condivisa con le sezioni Enquiries): stesso input (chiave
// YYYY-MM-DD), locale 'en-US' invece di 'it-IT'.
export function formatDateWithWeekday(chiave: string): string {
  return new Date(`${chiave}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Variante in inglese di formatDelta (lib/format.ts): quella resta condivisa
// con FontiLead per le sezioni Enquiries/Scuola tennis/ecc, questa e' solo
// per Analytics (vedi il prop formatDelta di FontiLead).
export function formatDeltaEn(delta: number | null): string {
  if (delta === null) return 'new'
  if (delta === 0) return '0%'
  const segno = delta > 0 ? '+' : ''
  return `${segno}${delta}%`
}

export const OPZIONI_RANGE = [
  { valore: 'tutto', etichetta: 'All time' },
  { valore: 'mtd', etichetta: 'Month to date' },
  { valore: 'mese_precedente', etichetta: 'Previous month' },
  { valore: 'anno_corrente', etichetta: 'Current year' },
  { valore: 'custom', etichetta: 'Custom' },
] as const
export type PresetRange = (typeof OPZIONI_RANGE)[number]['valore']
const VALORI_RANGE = OPZIONI_RANGE.map((o) => o.valore) as readonly string[]

// Assente o non valido = "Tutto", cosi' e' quello che si vede aprendo
// Analytics senza parametri. Il predefinito e' sovrascrivibile perche'
// cambia con la fonte dati (vedi Analytics: il confronto tra sorgenti
// parte da inizio mese, non da tutto lo storico).
export function parsePreset(raw: string | undefined, predefinito: PresetRange = 'tutto'): PresetRange {
  if (raw && VALORI_RANGE.includes(raw)) return raw as PresetRange
  return predefinito
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

// Differenza di anni: mantiene mese/giorno, il 29 febbraio si accorcia al 28
// se l'anno di destinazione non e' bisestile.
function spostaAnno(chiave: string, delta: number): string {
  const [anno, mese, giorno] = chiave.split('-').map(Number)
  const nuovoAnno = anno + delta
  const giorniInMese = new Date(Date.UTC(nuovoAnno, mese, 0)).getUTCDate()
  const giornoValido = Math.min(giorno, giorniInMese)
  return `${nuovoAnno}-${String(mese).padStart(2, '0')}-${String(giornoValido).padStart(2, '0')}`
}

function differenzaGiorni(da: string, a: string): number {
  const d1 = new Date(`${da}T00:00:00Z`).getTime()
  const d2 = new Date(`${a}T00:00:00Z`).getTime()
  return Math.round((d2 - d1) / 86400000) + 1
}

export const OPZIONI_CONFRONTO = [
  { valore: 'nessuno', etichetta: 'No comparison' },
  { valore: 'periodo_precedente', etichetta: 'Previous period' },
  { valore: 'anno_precedente', etichetta: 'Previous year' },
  { valore: 'personalizzato', etichetta: 'Custom' },
] as const
export type PresetConfronto = (typeof OPZIONI_CONFRONTO)[number]['valore']
const VALORI_CONFRONTO = OPZIONI_CONFRONTO.map((o) => o.valore) as readonly string[]

export function parsePresetConfronto(
  raw: string | undefined,
  predefinito: PresetConfronto = 'nessuno'
): PresetConfronto {
  if (raw && VALORI_CONFRONTO.includes(raw)) return raw as PresetConfronto
  return predefinito
}

// Periodo di confronto per il preset scelto, calcolato sugli estremi del
// periodo principale (da/a). "personalizzato" richiede due date valide con
// da <= a, altrimenti niente confronto invece di rompere la pagina. null =
// nessun confronto da mostrare (preset "nessuno" o dati insufficienti).
export function calcolaConfronto(
  preset: PresetConfronto,
  da: string,
  a: string,
  customDa: string | undefined,
  customA: string | undefined
): { da: string; a: string } | null {
  if (preset === 'periodo_precedente') {
    const giorni = differenzaGiorni(da, a)
    const aConfronto = aggiungiGiorni(da, -1)
    const daConfronto = aggiungiGiorni(aConfronto, -(giorni - 1))
    return { da: daConfronto, a: aConfronto }
  }
  if (preset === 'anno_precedente') {
    return { da: spostaAnno(da, -1), a: spostaAnno(a, -1) }
  }
  if (preset === 'personalizzato') {
    if (dataValida(customDa) && dataValida(customA) && customDa <= customA) {
      return { da: customDa, a: customA }
    }
    return null
  }
  return null
}

// Variazione percentuale arrotondata a 1 decimale. null = non definita
// (si passa da 0 a un valore positivo: mostrare "nuovo", non una
// percentuale). 0 se entrambi i periodi sono a zero.
export function deltaPercentuale(attuale: number, precedente: number): number | null {
  if (precedente === 0) return attuale === 0 ? 0 : null
  return Math.round(((attuale - precedente) / precedente) * 1000) / 10
}

// Filtro generico per intervallo di date: usato sia per form_contatti
// (created_at) sia per lead_hubspot_storico (data_acquisizione), passando
// l'accessor giusto invece di duplicare la stessa logica di filtro.
export function filtraPerRangeGenerico<T>(
  righe: T[],
  dataDi: (riga: T) => string | null | undefined,
  da: string,
  a: string
): T[] {
  return righe.filter((riga) => {
    const valore = dataDi(riga)
    if (!valore) return false
    const chiave = chiaveGiorno(valore)
    return chiave >= da && chiave <= a
  })
}

export type PuntoGiornoTotale = { data: string; totale: number }

// Serie giornaliera a singolo valore (nessuna suddivisione per gruppo):
// usata per lead_hubspot_storico, che non ha un equivalente di
// gruppo_attivita.
export function costruisciSerieTotale<T>(
  righe: T[],
  dataDi: (riga: T) => string | null | undefined,
  da: string,
  a: string
): PuntoGiornoTotale[] {
  const conteggi = new Map<string, number>()
  for (const riga of righe) {
    const valore = dataDi(riga)
    if (!valore) continue
    const chiave = chiaveGiorno(valore)
    conteggi.set(chiave, (conteggi.get(chiave) ?? 0) + 1)
  }
  const serie: PuntoGiornoTotale[] = []
  for (let giorno = da; giorno <= a; giorno = aggiungiGiorni(giorno, 1)) {
    serie.push({ data: giorno, totale: conteggi.get(giorno) ?? 0 })
  }
  return serie
}

// Classificazione generica per righe che non condividono la forma di
// form_contatti (es. lead_hubspot_storico): stessa logica di conteggio e
// ordinamento di classificaPer, ma con un accessor esplicito invece di un
// nome di campo fisso, cosi' funziona su qualunque tabella.
export function classificaGenerico<T>(
  righe: T[],
  accessor: (riga: T) => unknown,
  etichettaVuoto: string
): { fonte: string; chiave: string; conteggio: number }[] {
  const conteggi = new Map<string, { etichetta: string; conteggio: number }>()
  for (const riga of righe) {
    const grezzo = String(accessor(riga) ?? '').trim()
    const chiave = grezzo ? grezzo.toLowerCase() : '__vuoto__'
    const etichetta = grezzo || etichettaVuoto
    const voce = conteggi.get(chiave)
    if (voce) voce.conteggio += 1
    else conteggi.set(chiave, { etichetta, conteggio: 1 })
  }
  return [...conteggi.entries()]
    .sort((a, b) => b[1].conteggio - a[1].conteggio)
    .map(([chiave, v]) => ({ fonte: v.etichetta, chiave, conteggio: v.conteggio }))
}

export type VoceConDelta = {
  fonte: string
  chiave: string
  conteggio: number
  confronto: number | null
  delta: number | null
  href?: string
}

// Unisce una classifica del periodo principale con quella del periodo di
// confronto (stessa dimensione, stesse chiavi): righe presenti solo in uno
// dei due periodi restano con l'altro conteggio a 0, invece di scomparire.
// confronto=null (nessun periodo di confronto scelto) restituisce la stessa
// classifica senza colonne aggiuntive.
export function unisciConDelta(
  attuali: { fonte: string; chiave: string; conteggio: number }[],
  confronto: { fonte: string; chiave: string; conteggio: number }[] | null
): VoceConDelta[] {
  if (!confronto) {
    return attuali.map((v) => ({ ...v, confronto: null, delta: null }))
  }
  const mappaAttuali = new Map(attuali.map((v) => [v.chiave, v]))
  const mappaConfronto = new Map(confronto.map((v) => [v.chiave, v]))
  const chiavi = new Set([...mappaAttuali.keys(), ...mappaConfronto.keys()])
  return [...chiavi]
    .map((chiave) => {
      const voceAttuale = mappaAttuali.get(chiave)
      const voceConfronto = mappaConfronto.get(chiave)
      const conteggio = voceAttuale?.conteggio ?? 0
      const conteggioConfronto = voceConfronto?.conteggio ?? 0
      return {
        fonte: voceAttuale?.fonte ?? voceConfronto?.fonte ?? chiave,
        chiave,
        conteggio,
        confronto: conteggioConfronto,
        delta: deltaPercentuale(conteggio, conteggioConfronto),
      }
    })
    .sort((a, b) => b.conteggio - a.conteggio)
}

// Buckettizza (utm_source, utm_medium) nelle stesse categorie di canale che
// HubSpot assegna in automatico (Original Traffic Source) al proprio
// storico: e' l'unica dimensione confrontabile 1:1 tra i lead pre-cutover
// (HubSpot, gia' buckettizzati da loro in fonte_acquisizione) e le enquiry
// del sito nuovo (solo utm_source/utm_medium grezzi).
const PIATTAFORME_SOCIAL = ['facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'pinterest', 'snapchat']
const MOTORI_RICERCA = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia']

export function classificaCanale(source: unknown, medium: unknown): string {
  const s = String(source ?? '').trim().toLowerCase()
  const m = String(medium ?? '').trim().toLowerCase()

  if (!s && !m) return 'Direct Traffic'

  const ePagato = /cpc|ppc|paid|adwords/.test(m)
  const eSocial = PIATTAFORME_SOCIAL.some((p) => s.includes(p))
  const eMotore = MOTORI_RICERCA.some((p) => s.includes(p))

  if (ePagato) return eSocial ? 'Paid Social' : 'Paid Search'
  if (m === 'organic' || (!m && eMotore)) return 'Organic Search'
  if (m.includes('social') || eSocial) return 'Organic Social'
  if (m === 'email' || s === 'email') return 'Email Marketing'
  if (m === 'referral') return 'Referrals'
  return 'Other Campaigns'
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
// come un'unica categoria "New" invece di restare separate.
//
// I valori restanti (vedi il commento su esito_verifica_pgm in
// lib/supabase/types.ts) sono gia' in inglese lato PerfectGym (ENDED, NOT
// STARTED, CURRENT) tranne due usciti in italiano dal flusso n8n: solo
// quei due vengono tradotti qui, per la sola visualizzazione in Analytics -
// il valore grezzo salvato sul contatto resta quello originale.
const TRADUZIONI_ESITO_PGM: Record<string, string> = {
  'mai avuto contratto': 'Never had a contract',
  sospeso: 'Suspended',
}

function normalizzaEsitoPgm(valore: unknown): unknown {
  if (typeof valore !== 'string') return valore
  const pulito = valore.trim().toLowerCase()
  if (pulito.startsWith('nuovo')) return 'New'
  return TRADUZIONI_ESITO_PGM[pulito] ?? valore
}

// Descrive ogni classificazione mostrata in Analytics: stessa definizione
// usata sia per aggregare i conteggi (classificaPer) sia per filtrare la
// lista di dettaglio (filtraPerDimensione), cosi' i due non possono
// disallinearsi (es. normalizzazione applicata solo da una parte).
type DefinizioneDimensione = {
  etichettaVuoto: string
  prettifica: boolean
  normalizza?: (valore: unknown) => unknown
} & ({ campo: string } | { computa: (riga: RigaContatto) => unknown })

// "canale" e' calcolato (utm_source + utm_medium bucketizzati, vedi
// classificaCanale) invece di leggere un campo diretto: e' l'unica
// dimensione pensata per essere confrontabile con lo storico HubSpot
// (fonte_acquisizione, gia' buckettizzata da HubSpot allo stesso modo).
const DIMENSIONI_LEAD = {
  canale: {
    computa: (riga: RigaContatto) => classificaCanale(riga.utm_source, riga.utm_medium),
    etichettaVuoto: 'Direct Traffic',
    prettifica: false,
  },
  fonte: { campo: 'utm_source', etichettaVuoto: 'Organic', prettifica: true },
  medium: { campo: 'utm_medium', etichettaVuoto: 'Direct/organic', prettifica: false },
  campagna: { campo: 'utm_campaign', etichettaVuoto: 'No campaign', prettifica: true },
  term: { campo: 'utm_term', etichettaVuoto: 'No term', prettifica: false },
  cta: { campo: 'cta', etichettaVuoto: 'No CTA', prettifica: false },
  pagina: { campo: 'pagina', etichettaVuoto: 'Page not detected', prettifica: false },
  status: {
    campo: 'esito_verifica_pgm',
    etichettaVuoto: 'Not verified',
    prettifica: false,
    normalizza: normalizzaEsitoPgm,
  },
} as const satisfies Record<string, DefinizioneDimensione>
export type DimensioneLead = keyof typeof DIMENSIONI_LEAD
export const DIMENSIONI_VALIDE = Object.keys(DIMENSIONI_LEAD) as DimensioneLead[]

function chiaveENormalizzato(riga: RigaContatto, dimensione: DimensioneLead): { chiave: string; grezzo: string } {
  const def: DefinizioneDimensione = DIMENSIONI_LEAD[dimensione]
  const normalizza = def.normalizza
  const grezzoValore = 'computa' in def ? def.computa(riga) : riga[def.campo]
  const valore = normalizza ? normalizza(grezzoValore) : grezzoValore
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
