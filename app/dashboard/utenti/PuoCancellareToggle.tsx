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
            const risultato = await impostaPuoCancellare(email, nuovo)
            if (!risultato.ok) {
              setValore(!nuovo)
              alert(risultato.errore)
            }
          })
        }}
      />
      {valore ? 'Sì' : 'No'}
    </label>
  )
}
