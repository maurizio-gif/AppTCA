'use client'

import { useState, useTransition } from 'react'
import { confermaLettura } from './actions'

// Riusato sia nel banner in evidenza sia nel dettaglio espanso di ogni
// notifica nell'elenco: stessa azione, stesso comportamento in entrambi i
// punti in cui si puo' confermare la lettura.
export function ConfermaLetturaButton({
  id,
  onConfermata,
  className = 'btn btn-small',
}: {
  id: number
  onConfermata?: () => void
  className?: string
}) {
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const risultato = await confermaLettura(id)
            if (risultato.ok) {
              onConfermata?.()
            } else {
              setErrore(risultato.errore)
            }
          })
        }}
      >
        {isPending ? 'Confermo…' : 'Confermo di aver letto'}
      </button>
      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
