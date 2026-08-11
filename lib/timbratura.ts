// Solo dati/logica pura (nessun import server-only): importato sia dal
// Server Action che valida davvero (mai fidarsi delle coordinate del
// client) sia, se utile, da componenti client per un riscontro immediato.

// Centro della zona valida: Via Feltre 33, 20134 Milano (TC Ambrosiano).
// Coordinate confermate con un pin preciso su Google Maps.
export const ZONA_TIMBRATURA = {
  lat: 45.4917765,
  lng: 9.2427521,
  raggioMetri: 100,
}

// Formula dell'emisenoverso (haversine): distanza in metri fra due punti
// lat/lng sulla superficie terrestre, precisa a sufficienza per un raggio
// di poche centinaia di metri.
export function distanzaMetri(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const raggioTerra = 6371000
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return raggioTerra * c
}

export function dentroZona(lat: number, lng: number): { dentro: boolean; distanza: number } {
  const distanza = distanzaMetri(lat, lng, ZONA_TIMBRATURA.lat, ZONA_TIMBRATURA.lng)
  return { dentro: distanza <= ZONA_TIMBRATURA.raggioMetri, distanza }
}

// Giorno (YYYY-MM-DD) nel fuso di Roma: created_at e' un timestamp UTC,
// senza convertire un'entrata di poco dopo la mezzanote finirebbe sul
// giorno sbagliato (stesso criterio usato per il grafico Enquiries in
// app/dashboard/page.tsx).
export function giornoRoma(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
}

// Stessa data/ora in formato "YYYY-MM-DDTHH:mm" nel fuso di Roma: e' il
// valore che si passa a un <input type="datetime-local"> per la correzione
// manuale di un turno in Controllo Operatori.
export function oraRomaLocale(iso: string): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
  const ora = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' })
  return `${data}T${ora}`
}

// Gli stessi campi della data, letti in un fuso e reinterpretati come se
// fossero UTC: la differenza con l'istante di partenza e' l'offset del
// fuso in quel momento (positivo d'estate, quando Roma e' avanti su UTC).
function offsetFusoMs(istante: number, fuso: string): number {
  const parti = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date(istante))
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {})

  const comeUtc = Date.UTC(
    Number(parti.year),
    Number(parti.month) - 1,
    Number(parti.day),
    Number(parti.hour),
    Number(parti.minute),
    Number(parti.second)
  )
  return comeUtc - istante
}

const RE_ORA_LOCALE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

// Inverso di oraRomaLocale: "YYYY-MM-DDTHH:mm" scritto da una persona
// (quindi ora italiana) -> timestamp ISO in UTC, come tutti i created_at
// in tabella. null se il formato non e' valido.
//
// L'offset va calcolato sull'istante giusto e non su quello "finto" (i
// campi letti come se fossero UTC), altrimenti nelle due notti del cambio
// di ora legale si sbaglierebbe di un'ora: si stima una prima volta, si
// corregge, e si ricalcola l'offset sul risultato.
export function isoDaOraRoma(oraLocale: string): string | null {
  const m = RE_ORA_LOCALE.exec(oraLocale.trim())
  if (!m) return null

  const [anno, mese, giorno, ore, minuti] = m.slice(1).map(Number)
  const comeUtc = Date.UTC(anno, mese - 1, giorno, ore, minuti)
  if (Number.isNaN(comeUtc)) return null

  const stima = comeUtc - offsetFusoMs(comeUtc, 'Europe/Rome')
  const istante = comeUtc - offsetFusoMs(stima, 'Europe/Rome')
  const data = new Date(istante)
  if (Number.isNaN(data.getTime())) return null

  // Controllo di andata e ritorno: Date.UTC accetta valori fuori scala
  // facendoli traboccare (il mese 13 diventa gennaio dell'anno dopo), e
  // nella notte in cui l'ora legale entra in vigore ci sono orari che non
  // esistono affatto (02:30 diventa 03:30). In entrambi i casi l'ora
  // riletta non coincide con quella scritta: meglio un errore che salvare
  // di nascosto un orario diverso da quello digitato.
  const iso = data.toISOString()
  if (oraRomaLocale(iso) !== oraLocale.trim()) return null
  return iso
}

export type Turno = {
  // id delle due righe di "timbrature" da cui il turno e' ricavato: senza
  // di questi la correzione manuale in Controllo Operatori non saprebbe
  // quale riga aggiornare (un turno non e' un record, e' una coppia).
  idEntrata: number
  idUscita: number | null
  email: string
  entrata: string // ISO
  uscita: string | null // null se il turno e' ancora in corso
  minuti: number | null // null se il turno e' ancora in corso
}

// Accoppia ogni entrata con la prima uscita successiva della stessa
// persona, per calcolare quanto e' durato il turno. Le regole di
// sequenza (niente due entrate di fila, niente uscita senza entrata) sono
// gia' imposte lato server in registraTimbratura: qui si gestisce comunque
// con calma un'eventuale entrata senza uscita (es. il turno di oggi non
// ancora terminato, o un dimenticato) segnandola "in corso" invece di
// perderla o far saltare i calcoli successivi.
export function accoppiaTurni(righe: { id: number; email: string; tipo: string; created_at: string }[]): Turno[] {
  type Riga = { id: number; tipo: string; created_at: string }
  const perEmail = new Map<string, Riga[]>()
  for (const riga of righe) {
    if (!perEmail.has(riga.email)) perEmail.set(riga.email, [])
    perEmail.get(riga.email)!.push(riga)
  }

  const turni: Turno[] = []

  for (const [email, righeEmail] of perEmail) {
    const ordinate = [...righeEmail].sort((a, b) => a.created_at.localeCompare(b.created_at))
    let entrataAperta: Riga | null = null

    for (const riga of ordinate) {
      if (riga.tipo === 'entrata') {
        if (entrataAperta) {
          turni.push({ idEntrata: entrataAperta.id, idUscita: null, email, entrata: entrataAperta.created_at, uscita: null, minuti: null })
        }
        entrataAperta = riga
      } else if (riga.tipo === 'uscita' && entrataAperta) {
        const minuti = Math.round(
          (new Date(riga.created_at).getTime() - new Date(entrataAperta.created_at).getTime()) / 60000
        )
        turni.push({
          idEntrata: entrataAperta.id,
          idUscita: riga.id,
          email,
          entrata: entrataAperta.created_at,
          uscita: riga.created_at,
          minuti,
        })
        entrataAperta = null
      }
    }

    if (entrataAperta) {
      turni.push({ idEntrata: entrataAperta.id, idUscita: null, email, entrata: entrataAperta.created_at, uscita: null, minuti: null })
    }
  }

  return turni.sort((a, b) => b.entrata.localeCompare(a.entrata))
}

export function formattaDurata(minuti: number | null): string {
  if (minuti === null) return 'In corso'
  const ore = Math.floor(minuti / 60)
  const min = minuti % 60
  return `${ore}h ${String(min).padStart(2, '0')}m`
}
