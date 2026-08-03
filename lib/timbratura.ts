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
