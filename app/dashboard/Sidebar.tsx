'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { SEZIONI } from '@/lib/auth/sezioni'

// Riepilogo e' sempre visibile; le altre voci sono filtrate in base alle
// sezioni che l'utente puo' vedere (vedi lib/auth/sezioni.ts).
export function Sidebar({
  email,
  sezioniConsentite,
}: {
  email: string
  sezioniConsentite: string[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'Riepilogo' },
    ...SEZIONI.filter((s) => sezioniConsentite.includes(s.chiave)),
  ]

  // Chiude il menu mobile ad ogni cambio pagina, altrimenti resterebbe
  // aperto sopra il contenuto della sezione appena raggiunta.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar-brand">
        TCA <span>Segreteria</span>
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

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        {email}
        <form action={logout}>
          <button type="submit">Esci</button>
        </form>
      </div>
    </aside>
  )
}
