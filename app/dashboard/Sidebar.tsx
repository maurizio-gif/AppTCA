'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { SEZIONI } from '@/lib/auth/sezioni'
import { NavIcon } from '@/components/NavIcon'

type VoceMenu = { href: string; label: string; chiave: string; gruppo?: string }

// Riepilogo e' sempre visibile (senza gruppo, resta sempre in cima); le
// altre voci sono filtrate in base alle sezioni che l'utente puo' vedere
// (vedi lib/auth/sezioni.ts) e raggruppate per "gruppo" - una sezione
// futura senza gruppo esplicito finisce comunque in cima, senz'altre
// modifiche qui.
function raggruppaVoci(voci: VoceMenu[]) {
  const gruppi = new Map<string, VoceMenu[]>()
  const ordine: string[] = []

  for (const voce of voci) {
    const chiaveGruppo = voce.gruppo ?? ''
    if (!gruppi.has(chiaveGruppo)) {
      gruppi.set(chiaveGruppo, [])
      ordine.push(chiaveGruppo)
    }
    gruppi.get(chiaveGruppo)!.push(voce)
  }

  return ordine.map((chiave) => ({ chiave, voci: gruppi.get(chiave)! }))
}

export function Sidebar({
  email,
  nomeUtente,
  sezioniConsentite,
}: {
  email: string
  nomeUtente: string | null
  sezioniConsentite: string[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems: VoceMenu[] = [
    { href: '/dashboard', label: 'Dashboard', chiave: 'riepilogo' },
    ...SEZIONI.filter((s) => sezioniConsentite.includes(s.chiave)),
  ]
  const gruppiMenu = raggruppaVoci(navItems)

  // Chiude il menu mobile ad ogni cambio pagina, altrimenti resterebbe
  // aperto sopra il contenuto della sezione appena raggiunta.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/logo-tca.png" alt="TCA CRM" className="brand-logo" />
        <div className="user-row">
          <UserBadge nomeUtente={nomeUtente} email={email} />
          <form action={logout}>
            <button type="submit" className="logout-btn" title="Esci" aria-label="Esci">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        aria-label={open ? 'Chiudi il menu' : 'Apri il menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Solo su mobile: sfondo che oscura il resto della pagina quando il
          menu e' aperto, un tap sopra lo richiude. */}
      <div className="sidebar-backdrop" onClick={() => setOpen(false)} />

      <div className="sidebar-drawer">
        <nav className="sidebar-nav">
          {gruppiMenu.map((gruppo) => (
            <div key={gruppo.chiave || '_root'} className="nav-group">
              {gruppo.chiave && <div className="nav-group-title">{gruppo.chiave}</div>}
              {gruppo.voci.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? 'active' : undefined}
                >
                  <NavIcon name={item.chiave} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          {email}
          <form action={logout}>
            <button type="submit">Esci</button>
          </form>
        </div>
      </div>
    </aside>
  )
}

// Sempre visibile (nella barra logo, non nel drawer che su mobile resta
// chiuso finche' non si apre il menu): cosi' si sa sempre con quale utente
// si e' collegati senza dover aprire il menu per leggere l'email in fondo.
function UserBadge({ nomeUtente, email }: { nomeUtente: string | null; email: string }) {
  const visualizzato = nomeUtente || email
  const iniziale = visualizzato.trim().charAt(0).toUpperCase()
  const primoNome = nomeUtente ? nomeUtente.split(' ')[0] : email

  return (
    <span className="user-badge" title={visualizzato}>
      <span className="user-badge-avatar">{iniziale}</span>
      <span className="user-badge-nome">{primoNome}</span>
    </span>
  )
}
