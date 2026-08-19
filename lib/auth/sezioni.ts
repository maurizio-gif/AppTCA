// Solo dati puri (nessun import server-only): importato sia da Server
// Component sia da componenti client (Sidebar, SezioniToggle). La logica
// che legge il permesso da Supabase sta in sezioni-server.ts.

// Riepilogo (/dashboard) e' sempre visibile a chiunque sia autenticato: non
// ha una chiave qui, solo le altre sezioni sono restringibili per utente.
// "gruppo" organizza il menu quando le voci cresceranno (vedi Sidebar.tsx):
// una voce senza gruppo finisce comunque in cima, non richiede di
// aggiornare nient'altro per aggiungere una nuova sezione.
export const SEZIONI = [
  // Senza gruppo, quindi resta in cima subito sotto la Dashboard: e' la
  // pagina che una consulente tiene aperta durante la giornata (vedi
  // app/dashboard/agenda).
  { chiave: 'agenda', label: 'Agenda', href: '/dashboard/agenda' },
  // Anagrafica deduplicata: una scheda per persona, con tutte le sue
  // richieste e il suo lead (vedi lib/persone.ts).
  { chiave: 'persone', label: 'Persone', href: '/dashboard/persone' },
  { chiave: 'contatti-adulti', label: 'Enquiries Adulti', href: '/dashboard/contatti/adulti', gruppo: 'Moduli' },
  { chiave: 'contatti-junior', label: 'Enquiries Junior', href: '/dashboard/contatti/junior', gruppo: 'Moduli' },
  { chiave: 'invita-amico', label: 'Invita un amico', href: '/dashboard/invita-amico', gruppo: 'Moduli' },
  { chiave: 'scuola-tennis', label: 'Scuola tennis', href: '/dashboard/scuola-tennis', gruppo: 'Moduli' },
  { chiave: 'summer-camp', label: 'Summer Camp', href: '/dashboard/summer-camp', gruppo: 'Moduli' },
  { chiave: 'iscrizioni-eventi', label: 'Iscrizioni eventi', href: '/dashboard/iscrizioni-eventi', gruppo: 'Moduli' },
  // Non e' una pagina propria (vive dentro /dashboard): niente voce nel
  // menu, vedi SEZIONI_SENZA_VOCE_MENU sotto. Controlla solo se il blocco
  // "Enquiries" compare nel Riepilogo, a prescindere dai permessi Adulti/
  // Junior (che restano a controllare le singole card dentro il blocco).
  { chiave: 'dashboard-enquiries', label: 'Riepilogo Enquiries (Dashboard)', href: '/dashboard', gruppo: 'Moduli' },
  { chiave: 'analytics', label: 'Analytics', href: '/dashboard/analytics', gruppo: 'Amministrazione' },
  { chiave: 'visite-sito', label: 'Visite al sito', href: '/dashboard/visite', gruppo: 'Amministrazione' },
  { chiave: 'timbratura', label: 'Timbra cartellino', href: '/dashboard/timbratura', gruppo: 'Amministrazione' },
  { chiave: 'utenti', label: 'Gestione utenti', href: '/dashboard/utenti', gruppo: 'Amministrazione' },
  { chiave: 'notifiche', label: 'Notifiche', href: '/dashboard/notifiche', gruppo: 'Amministrazione' },
  { chiave: 'log-operatori', label: 'Controllo Operatori', href: '/dashboard/log-operatori', gruppo: 'Amministrazione' },
] as const

export type SezioneChiave = (typeof SEZIONI)[number]['chiave']

// Sezioni assegnabili in Gestione utenti che NON hanno una pagina propria
// e quindi non devono comparire come voce nel menu laterale (vedi
// Sidebar.tsx): restano un permesso puro, gestito solo qui.
export const SEZIONI_SENZA_VOCE_MENU: readonly SezioneChiave[] = ['dashboard-enquiries']
