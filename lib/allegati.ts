// Regole per gli allegati alle notifiche interne: stesso elenco di tipi
// controllato sia lato client (input file + validazione UX) sia lato
// server (l'unico posto di cui ci si può davvero fidare).
export const TIPI_ALLEGATO_CONSENTITI: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
}

export const ACCEPT_ALLEGATO = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'].join(',')

export const DIMENSIONE_MASSIMA_ALLEGATO = 5 * 1024 * 1024 // 5 MB

export const BUCKET_ALLEGATI_NOTIFICHE = 'notifiche-allegati'

export function formatDimensioneFile(byte: number): string {
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}
