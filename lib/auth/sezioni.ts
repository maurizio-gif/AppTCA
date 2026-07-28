// Solo dati puri (nessun import server-only): importato sia da Server
// Component sia da componenti client (Sidebar, SezioniToggle). La logica
// che legge il permesso da Supabase sta in sezioni-server.ts.

// Riepilogo (/dashboard) e' sempre visibile a chiunque sia autenticato: non
// ha una chiave qui, solo le altre sezioni sono restringibili per utente.
export const SEZIONI = [
  { chiave: 'contatti', label: 'Form contatti', href: '/dashboard/contatti' },
  { chiave: 'scuola-tennis', label: 'Scuola tennis', href: '/dashboard/scuola-tennis' },
  { chiave: 'invita-amico', label: 'Invita un amico', href: '/dashboard/invita-amico' },
  { chiave: 'iscrizioni-eventi', label: 'Iscrizioni eventi', href: '/dashboard/iscrizioni-eventi' },
  { chiave: 'utenti', label: 'Gestione utenti', href: '/dashboard/utenti' },
] as const

export type SezioneChiave = (typeof SEZIONI)[number]['chiave']
