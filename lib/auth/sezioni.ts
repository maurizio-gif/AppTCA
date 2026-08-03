// Solo dati puri (nessun import server-only): importato sia da Server
// Component sia da componenti client (Sidebar, SezioniToggle). La logica
// che legge il permesso da Supabase sta in sezioni-server.ts.

// Riepilogo (/dashboard) e' sempre visibile a chiunque sia autenticato: non
// ha una chiave qui, solo le altre sezioni sono restringibili per utente.
// "gruppo" organizza il menu quando le voci cresceranno (vedi Sidebar.tsx):
// una voce senza gruppo finisce comunque in cima, non richiede di
// aggiornare nient'altro per aggiungere una nuova sezione.
export const SEZIONI = [
  { chiave: 'contatti-adulti', label: 'Enquiries Adulti', href: '/dashboard/contatti/adulti', gruppo: 'Moduli' },
  { chiave: 'contatti-junior', label: 'Enquiries Junior', href: '/dashboard/contatti/junior', gruppo: 'Moduli' },
  { chiave: 'scuola-tennis', label: 'Scuola tennis', href: '/dashboard/scuola-tennis', gruppo: 'Moduli' },
  { chiave: 'summer-camp', label: 'Summer Camp', href: '/dashboard/summer-camp', gruppo: 'Moduli' },
  { chiave: 'invita-amico', label: 'Invita un amico', href: '/dashboard/invita-amico', gruppo: 'Moduli' },
  { chiave: 'iscrizioni-eventi', label: 'Iscrizioni eventi', href: '/dashboard/iscrizioni-eventi', gruppo: 'Moduli' },
  { chiave: 'timbratura', label: 'Timbra cartellino', href: '/dashboard/timbratura', gruppo: 'Amministrazione' },
  { chiave: 'utenti', label: 'Gestione utenti', href: '/dashboard/utenti', gruppo: 'Amministrazione' },
  { chiave: 'log-operatori', label: 'Log operatori', href: '/dashboard/log-operatori', gruppo: 'Amministrazione' },
] as const

export type SezioneChiave = (typeof SEZIONI)[number]['chiave']
