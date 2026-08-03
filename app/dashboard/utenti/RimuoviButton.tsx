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
          const risultato = await rimuoviStaff(email)
          if (!risultato.ok) {
            alert(risultato.errore)
          }
        })
      }}
    >
      Rimuovi
    </button>
  )
}
