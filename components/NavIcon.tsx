// Icone minimali per il menu (sidebar + drawer mobile). "name" e' la
// chiave della sezione (vedi lib/auth/sezioni.ts): una voce futura senza
// un'icona dedicata qui prende automaticamente il segnaposto generico,
// non serve ricordarsi di aggiornare questo file per ogni nuova sezione.
const ICONE: Record<string, React.ReactNode> = {
  riepilogo: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </>
  ),
  notifiche: (
    <>
      <path d="M12 3.5a5 5 0 0 0-5 5v3.2c0 .9-.35 1.77-1 2.4L5 15h14l-1-1c-.65-.63-1-1.5-1-2.4V8.5a5 5 0 0 0-5-5Z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  timbratura: (
    <>
      <circle cx="12" cy="14" r="7.5" />
      <path d="M12 10.5V14l2.5 1.5" />
      <path d="M9.5 2.5h5M12 2.5v2.2" />
    </>
  ),
  'contatti-adulti': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </>
  ),
  'contatti-junior': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20h19" />
    </>
  ),
  'scuola-tennis': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.3 8c3 2.8 3 7.2 15.4 8M4.3 16c3-2.8 3-7.2 15.4-8" />
    </>
  ),
  'summer-camp': (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  'invita-amico': (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 20c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5" />
      <path d="M16.5 8v6M13.5 11h6" />
    </>
  ),
  'iscrizioni-eventi': (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  utenti: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 19.5c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <circle cx="16.5" cy="8.5" r="2.4" />
      <path d="M15 13.2c2.5.4 4.5 2.5 4.5 5.3" />
    </>
  ),
  'log-operatori': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  'visite-sito': (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

const SEGNAPOSTO = <circle cx="12" cy="12" r="3" />

export function NavIcon({ name }: { name: string }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONE[name] ?? SEGNAPOSTO}
    </svg>
  )
}
