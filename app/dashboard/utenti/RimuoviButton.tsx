'use client'

import { useTransition } from 'react'
import { rimuoviStaff } from './actions'

export function RimuoviButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className="btn-ghost btn-small"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Rimuovere l'accesso per ${email}?`)) return
        startTransition(async () => {
          try {
            await rimuoviStaff(email)
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Errore durante la rimozione.')
          }
        })
      }}
    >
      Rimuovi
    </button>
  )
}
