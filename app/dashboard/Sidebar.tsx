'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Riepilogo' },
  { href: '/dashboard/contatti', label: 'Form contatti' },
  { href: '/dashboard/scuola-tennis', label: 'Scuola tennis' },
  { href: '/dashboard/invita-amico', label: 'Invita un amico' },
  { href: '/dashboard/iscrizioni-eventi', label: 'Iscrizioni eventi' },
  { href: '/dashboard/utenti', label: 'Gestione utenti' },
]

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
        {NAV_ITEMS.map((item) => (
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
