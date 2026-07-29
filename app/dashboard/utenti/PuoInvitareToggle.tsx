'use client'

import { useState, useTransition } from 'react'
import { impostaPuoInvitare } from './actions'

export function PuoInvitareToggle({
  email,
  puoInvitare,
}: {
  email: string
  puoInvitare: boolean
}) {
  const [valore, setValore] = useState(puoInvitare)
  const [isPending, startTransition] = useTransition()

  return (
    <label className="toggle-puo-invitare">
      <input
        type="checkbox"
        checked={valore}
        disabled={isPending}
        onChange={(e) => {
          const nuovo = e.target.checked
          setValore(nuovo)
          startTransition(async () => {
            try {
              await impostaPuoInvitare(email, nuovo)
            } catch (err) {
              setValore(!nuovo)
              alert(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
            }
          })
        }}
      />
      {valore ? 'Sì' : 'No'}
    </label>
  )
}
