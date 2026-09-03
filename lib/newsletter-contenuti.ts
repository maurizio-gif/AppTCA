// Forma dei contenuti del sito utilizzabili in newsletter.
//
// Solo tipi ed etichette (nessuna fetch, nessun accesso al server): sta in un
// file a parte perche' lo importa anche il costruttore lato client
// (app/dashboard/newsletter/CostruttoreNewsletter.tsx), che non deve
// trascinarsi nel bundle del browser la lettura del feed. La lettura vera vive
// in lib/newsletter.ts, server-only.

export const TIPI_VOCE = ['news', 'evento', 'servizio', 'promo', 'pagina'] as const
export type TipoVoce = (typeof TIPI_VOCE)[number]

export const ETICHETTE_TIPO: Record<TipoVoce, string> = {
  news: 'News',
  evento: 'Evento',
  servizio: 'Servizio',
  promo: 'Promo',
  pagina: 'Pagina del sito',
}

export type VoceSito = {
  id: string
  tipo: TipoVoce
  titolo: string
  categoria: string | null
  data: string | null
  sintesi: string
  paragrafi: string[]
  immagine: string | null
  immagineAlt: string | null
  immagineEmailSafe: boolean
  url: string
  ctaLabel: string | null
  ctaHref: string | null
  note: string | null
}

export type ImmagineSito = { nome: string; url: string }

export type ContenutiSito = {
  generatoIl: string | null
  sito: string
  voci: VoceSito[]
  immagini: ImmagineSito[]
}
