'use client'

import { useState, useTransition } from 'react'
import { impostaPuoCancellare } from './actions'

export function PuoCancellareToggle({
  email,
  puoCancellare,
}: {
  email: string
  puoCancellare: boolean
}) {
  const [valore, setValore] = useState(puoCancellare)
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
              await impostaPuoCancellare(email, nuovo)
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
