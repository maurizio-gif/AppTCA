'use client'

import { useState, useTransition } from 'react'
import { eliminaContatto } from './actions'

// Visibile solo a chi ha "puo_cancellare" (vedi contatti/page.tsx): il
// controllo vero resta pero' lato server in eliminaContatto, non qui.
export function EliminaContattoButton({ id }: { id: string }) {
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="elimina-record-box">
      <button
        type="button"
        className="btn-danger btn-small"
        disabled={isPending}
        onClick={() => {
          const confermato = confirm(
            'Vuoi cancellare definitivamente questo contatto? L\'operazione è irreversibile: una volta cancellato non potrà essere recuperato.'
          )
          if (!confermato) return

          startTransition(async () => {
            const risultato = await eliminaContatto(id)
            if (!risultato.ok) {
              setErrore(risultato.errore)
            }
          })
        }}
      >
        Cancella record
      </button>
      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
