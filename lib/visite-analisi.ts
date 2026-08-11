import { classificaCanale } from './analytics'
import type { RigaAccesso } from './visite'

// Analisi di percorso sugli accessi al sito (tabella "accessi", un
// pageview per riga, vedi lib/visite.ts). A differenza di un Analytics
// classico qui tutto e' ricostruito a partire dal "vid": ogni percorso e'
// quello di un visitatore identificato, quindi lo stesso dato che permette
// di dire "questo lead ha guardato i prezzi tre volte prima di scrivere".

// Due pageview a piu' di mezz'ora di distanza sono due visite diverse, non
// una sola lunga: senza questo taglio la "durata media" di un visitatore
// che torna dopo tre giorni sarebbe di tre giorni. Trenta minuti e' la
// convenzione usata da tutti gli strumenti di analytics.
export const GAP_SESSIONE_MINUTI = 30

// Percorsi tipo "/corsi?utm_source=google" e "/corsi/" sono la stessa
// pagina: senza normalizzare, la classifica si spezzerebbe in varianti
// della stessa riga.
export function normalizzaPagina(grezza: string | null): string {
  if (!grezza || !grezza.trim()) return '(sconosciuta)'
  let percorso = grezza.trim()
  if (/^https?:\/\//i.test(percorso)) {
    try {
      percorso = new URL(percorso).pathname
    } catch {
      // resta la stringa grezza: meglio una riga strana che perdere il dato
    }
  }
  percorso = percorso.split('?')[0].split('#')[0]
  if (!percorso.startsWith('/')) percorso = `/${percorso}`
  if (percorso.length > 1) percorso = percorso.replace(/\/+$/, '')
  return percorso || '/'
}

export function hostReferrer(referrer: string | null): string | null {
  if (!referrer || !referrer.trim()) return null
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return referrer.trim().toLowerCase()
  }
}

const MOTORI_RICERCA = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia', 'chatgpt', 'perplexity']
const PIATTAFORME_SOCIAL = ['facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'x.com', 'pinterest', 't.co']

function valoreUtm(utm: unknown, chiavi: string[]): unknown {
  if (!utm || typeof utm !== 'object') return null
  const mappa = utm as Record<string, unknown>
  for (const chiave of chiavi) {
    if (mappa[chiave]) return mappa[chiave]
  }
  return null
}

// Stesse categorie di canale usate in Analytics (classificaCanale): se una
// visita ha gli UTM si classifica come li' - cosi' "Paid Search" significa
// la stessa cosa nelle due sezioni. Senza UTM si deduce dal referrer, che
// e' l'unica informazione rimasta.
export function canaleIngresso(accesso: RigaAccesso, dominioSito = 'tcambrosiano'): string {
  const source = valoreUtm(accesso.utm, ['utm_source', 'source'])
  const medium = valoreUtm(accesso.utm, ['utm_medium', 'medium'])
  if (source || medium) return classificaCanale(source, medium)

  const host = hostReferrer(accesso.referrer)
  if (!host || host.includes(dominioSito)) return 'Direct Traffic'
  if (MOTORI_RICERCA.some((m) => host.includes(m))) return 'Organic Search'
  if (PIATTAFORME_SOCIAL.some((p) => host.includes(p))) return 'Organic Social'
  return 'Referrals'
}

export type Tappa = {
  pagina: string
  quando: string
  // Secondi passati sulla pagina, cioe' fino al pageview successivo. null
  // sull'ultima tappa: non esiste un evento di uscita da cui misurarla.
  secondi: number | null
}

export type SessioneNavigazione = {
  vid: string
  inizio: string
  fine: string
  durataSecondi: number
  tappe: Tappa[]
  // Percorso con i refresh consecutivi sulla stessa pagina accorpati: e'
  // la sequenza da leggere ("home -> corsi -> contatti"), mentre "tappe"
  // resta il conteggio reale dei pageview.
  percorso: string[]
  canale: string
  riconosciuto: boolean
}

function secondiTra(da: string, a: string): number {
  return Math.max(0, Math.round((new Date(a).getTime() - new Date(da).getTime()) / 1000))
}

export function dividiInSessioni(
  accessi: RigaAccesso[],
  vidRiconosciuti: Set<string>,
  gapMinuti = GAP_SESSIONE_MINUTI
): SessioneNavigazione[] {
  const perVid = new Map<string, RigaAccesso[]>()
  for (const accesso of accessi) {
    if (!accesso.vid) continue
    if (!perVid.has(accesso.vid)) perVid.set(accesso.vid, [])
    perVid.get(accesso.vid)!.push(accesso)
  }

  const sessioni: SessioneNavigazione[] = []
  const gapSecondi = gapMinuti * 60

  for (const [vid, righe] of perVid) {
    const ordinate = [...righe].sort((a, b) => a.created_at.localeCompare(b.created_at))

    let gruppo: RigaAccesso[] = []
    const chiudi = () => {
      if (gruppo.length === 0) return
      const tappe: Tappa[] = gruppo.map((riga, i) => ({
        pagina: normalizzaPagina(riga.pagina),
        quando: riga.created_at,
        secondi: i < gruppo.length - 1 ? secondiTra(riga.created_at, gruppo[i + 1].created_at) : null,
      }))
      const percorso: string[] = []
      for (const tappa of tappe) {
        if (percorso[percorso.length - 1] !== tappa.pagina) percorso.push(tappa.pagina)
      }
      sessioni.push({
        vid,
        inizio: gruppo[0].created_at,
        fine: gruppo[gruppo.length - 1].created_at,
        durataSecondi: secondiTra(gruppo[0].created_at, gruppo[gruppo.length - 1].created_at),
        tappe,
        percorso,
        canale: canaleIngresso(gruppo[0]),
        riconosciuto: vidRiconosciuti.has(vid),
      })
      gruppo = []
    }

    for (const riga of ordinate) {
      const precedente = gruppo[gruppo.length - 1]
      if (precedente && secondiTra(precedente.created_at, riga.created_at) > gapSecondi) chiudi()
      gruppo.push(riga)
    }
    chiudi()
  }

  return sessioni.sort((a, b) => b.fine.localeCompare(a.fine))
}

export type Riepilogo = {
  visitatori: number
  sessioni: number
  pagineViste: number
  paginePerSessione: number
  durataMediaSecondi: number
  sessioniConDurata: number
  sessioniRimbalzo: number
  tassoRimbalzo: number
  visitatoriRiconosciuti: number
  tassoRiconoscimento: number
}

// La durata media si calcola solo sulle sessioni con almeno due pagine:
// una sessione di una pagina sola non ha un secondo evento da cui misurare
// il tempo, quindi varrebbe zero e trascinerebbe giu' la media fingendo
// una precisione che il dato non ha.
export function riepilogo(sessioni: SessioneNavigazione[]): Riepilogo {
  const visitatori = new Set(sessioni.map((s) => s.vid))
  const riconosciuti = new Set(sessioni.filter((s) => s.riconosciuto).map((s) => s.vid))
  const conDurata = sessioni.filter((s) => s.tappe.length > 1)
  const rimbalzi = sessioni.length - conDurata.length
  const pagineViste = sessioni.reduce((somma, s) => somma + s.tappe.length, 0)
  const secondiTotali = conDurata.reduce((somma, s) => somma + s.durataSecondi, 0)

  return {
    visitatori: visitatori.size,
    sessioni: sessioni.length,
    pagineViste,
    paginePerSessione: sessioni.length ? Math.round((pagineViste / sessioni.length) * 10) / 10 : 0,
    durataMediaSecondi: conDurata.length ? Math.round(secondiTotali / conDurata.length) : 0,
    sessioniConDurata: conDurata.length,
    sessioniRimbalzo: rimbalzi,
    tassoRimbalzo: sessioni.length ? Math.round((rimbalzi / sessioni.length) * 100) : 0,
    visitatoriRiconosciuti: riconosciuti.size,
    tassoRiconoscimento: visitatori.size ? Math.round((riconosciuti.size / visitatori.size) * 100) : 0,
  }
}

export type VoceConteggio = { chiave: string; conteggio: number }

function classifica(valori: string[], top: number): VoceConteggio[] {
  const conteggi = new Map<string, number>()
  for (const valore of valori) conteggi.set(valore, (conteggi.get(valore) ?? 0) + 1)
  return [...conteggi.entries()]
    .map(([chiave, conteggio]) => ({ chiave, conteggio }))
    .sort((a, b) => b.conteggio - a.conteggio || a.chiave.localeCompare(b.chiave))
    .slice(0, top)
}

export function canaliDiIngresso(sessioni: SessioneNavigazione[], top = 8): VoceConteggio[] {
  return classifica(
    sessioni.map((s) => s.canale),
    top
  )
}

// Le pagine viste all'n-esimo passo del percorso, con quante sessioni sono
// arrivate fin li': il denominatore non e' il totale delle sessioni ma
// quelle che hanno fatto almeno n passi, altrimenti le percentuali della
// terza e quarta pagina sembrerebbero un crollo di interesse invece che
// una normale coda del percorso.
export type PassoPercorso = {
  posizione: number
  sessioniArrivate: number
  pagine: VoceConteggio[]
}

export function paginePerPosizione(
  sessioni: SessioneNavigazione[],
  posizioni = 4,
  top = 5
): PassoPercorso[] {
  const passi: PassoPercorso[] = []
  for (let posizione = 1; posizione <= posizioni; posizione++) {
    const arrivate = sessioni.filter((s) => s.percorso.length >= posizione)
    passi.push({
      posizione,
      sessioniArrivate: arrivate.length,
      pagine: classifica(
        arrivate.map((s) => s.percorso[posizione - 1]),
        top
      ),
    })
  }
  return passi
}

export type Percorso = {
  passi: string[]
  conteggio: number
  riconosciuti: number
  proseguono: number
}

// Le sequenze di ingresso piu' battute, troncate ai primi N passi: e' la
// risposta a "da dove partono e dove vanno a finire". "proseguono" dice
// quante di quelle sessioni sono andate oltre il tratto mostrato, cosi' si
// distingue un percorso che finisce li' da uno che e' solo l'inizio di
// una navigazione piu' lunga.
export function percorsiFrequenti(sessioni: SessioneNavigazione[], passi = 3, top = 8): Percorso[] {
  const gruppi = new Map<string, Percorso>()
  for (const sessione of sessioni) {
    const tratto = sessione.percorso.slice(0, passi)
    if (tratto.length === 0) continue
    const chiave = tratto.join(' → ')
    const voce = gruppi.get(chiave) ?? { passi: tratto, conteggio: 0, riconosciuti: 0, proseguono: 0 }
    voce.conteggio += 1
    if (sessione.riconosciuto) voce.riconosciuti += 1
    if (sessione.percorso.length > tratto.length) voce.proseguono += 1
    gruppi.set(chiave, voce)
  }
  return [...gruppi.values()]
    .sort((a, b) => b.conteggio - a.conteggio || a.passi.join().localeCompare(b.passi.join()))
    .slice(0, top)
}

export type StatistichePagina = {
  pagina: string
  viste: number
  ingressi: number
  uscite: number
  tassoUscita: number
  secondiMedi: number | null
}

// Per ogni pagina: quante volte e' stata vista, quante volte e' stata la
// porta d'ingresso, quante volte l'ultima vista della sessione, e quanto
// ci si e' fermati sopra. Il tempo medio esclude le uscite (non
// misurabili), quindi una pagina vista solo come ultima tappa non ha un
// tempo: "—" e non zero.
export function statistichePagine(sessioni: SessioneNavigazione[], top = 12): StatistichePagina[] {
  const mappa = new Map<string, { viste: number; ingressi: number; uscite: number; secondi: number; misurate: number }>()
  const leggi = (pagina: string) => {
    if (!mappa.has(pagina)) mappa.set(pagina, { viste: 0, ingressi: 0, uscite: 0, secondi: 0, misurate: 0 })
    return mappa.get(pagina)!
  }

  for (const sessione of sessioni) {
    sessione.tappe.forEach((tappa, i) => {
      const voce = leggi(tappa.pagina)
      voce.viste += 1
      if (i === 0) voce.ingressi += 1
      if (i === sessione.tappe.length - 1) voce.uscite += 1
      if (tappa.secondi !== null) {
        voce.secondi += tappa.secondi
        voce.misurate += 1
      }
    })
  }

  return [...mappa.entries()]
    .map(([pagina, v]) => ({
      pagina,
      viste: v.viste,
      ingressi: v.ingressi,
      uscite: v.uscite,
      tassoUscita: v.viste ? Math.round((v.uscite / v.viste) * 100) : 0,
      secondiMedi: v.misurate ? Math.round(v.secondi / v.misurate) : null,
    }))
    .sort((a, b) => b.viste - a.viste || a.pagina.localeCompare(b.pagina))
    .slice(0, top)
}

export function formatSecondi(secondi: number | null): string {
  if (secondi === null) return '—'
  if (secondi < 60) return `${secondi}s`
  const minuti = Math.floor(secondi / 60)
  const resto = secondi % 60
  if (minuti < 60) return resto ? `${minuti}m ${resto}s` : `${minuti}m`
  const ore = Math.floor(minuti / 60)
  return `${ore}h ${minuti % 60}m`
}
