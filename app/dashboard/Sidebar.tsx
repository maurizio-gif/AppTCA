'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Riepilogo' },
  { href: '/dashboard/contatti', label: 'Form contatti' },
  { href: '/dashboard/scuola-tennis', label: 'Scuola tennis' },
  { href: '/dashboard/invita-amico', label: 'Invita un amico' },
  { href: '/dashboard/iscrizioni-eventi', label: 'Iscrizioni eventi' },
]

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        TCA <span>Segreteria</span>
      </div>

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
