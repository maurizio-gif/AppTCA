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

export type Turno = {
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
export function accoppiaTurni(righe: { email: string; tipo: string; created_at: string }[]): Turno[] {
  const perEmail = new Map<string, { tipo: string; created_at: string }[]>()
  for (const riga of righe) {
    if (!perEmail.has(riga.email)) perEmail.set(riga.email, [])
    perEmail.get(riga.email)!.push(riga)
  }

  const turni: Turno[] = []

  for (const [email, righeEmail] of perEmail) {
    const ordinate = [...righeEmail].sort((a, b) => a.created_at.localeCompare(b.created_at))
    let entrataAperta: string | null = null

    for (const riga of ordinate) {
      if (riga.tipo === 'entrata') {
        if (entrataAperta) {
          turni.push({ email, entrata: entrataAperta, uscita: null, minuti: null })
        }
        entrataAperta = riga.created_at
      } else if (riga.tipo === 'uscita' && entrataAperta) {
        const minuti = Math.round(
          (new Date(riga.created_at).getTime() - new Date(entrataAperta).getTime()) / 60000
        )
        turni.push({ email, entrata: entrataAperta, uscita: riga.created_at, minuti })
        entrataAperta = null
      }
    }

    if (entrataAperta) {
      turni.push({ email, entrata: entrataAperta, uscita: null, minuti: null })
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
