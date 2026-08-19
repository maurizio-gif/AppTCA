'use client'

import { useState, useTransition } from 'react'
import { impostaPuoRiassegnare } from './actions'

// Stesso toggle di PuoCancellareToggle, per il diritto di passare a un altro
// operatore un lead che non e' il proprio (chi ce l'ha in mano puo' sempre
// farlo da se').
export function PuoRiassegnareToggle({
  email,
  puoRiassegnare,
}: {
  email: string
  puoRiassegnare: boolean
}) {
  const [valore, setValore] = useState(puoRiassegnare)
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
            const risultato = await impostaPuoRiassegnare(email, nuovo)
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
