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
            const risultato = await impostaPuoInvitare(email, nuovo)
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
