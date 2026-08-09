'use client'

import { useState, useTransition } from 'react'
import { inviaNotifica } from './actions'

// Risposta rapida a un singolo messaggio: riusa la stessa server action
// dell'invio normale (stessi controlli permessi/destinatario), solo con
// il destinatario gia' fissato invece di doverlo riscegliere dal menu.
export function RispondiNotifica({
  aEmail,
  nomeDestinatario,
  onInviata,
}: {
  aEmail: string
  nomeDestinatario: string
  onInviata?: () => void
}) {
  const [aperto, setAperto] = useState(false)
  const [messaggio, setMessaggio] = useState('')
  const [inviata, setInviata] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (inviata) {
    return <p className="muted">Risposta inviata a {nomeDestinatario}.</p>
  }

  if (!aperto) {
    return (
      <button type="button" className="btn btn-small" onClick={() => setAperto(true)}>
        Rispondi ora
      </button>
    )
  }

  function invia() {
    if (!messaggio.trim()) return
    setErrore(null)
    const formData = new FormData()
    formData.append('destinatari', aEmail)
    formData.append('messaggio', messaggio)

    startTransition(async () => {
      const risultato = await inviaNotifica(formData)
      if (risultato.ok) {
        setInviata(true)
        onInviata?.()
      } else {
        setErrore(risultato.errore)
      }
    })
  }

  return (
    <div className="risposta-notifica">
      <textarea
        className="gestione-note"
        rows={2}
        value={messaggio}
        disabled={isPending}
        onChange={(e) => setMessaggio(e.target.value)}
        placeholder={`Rispondi a ${nomeDestinatario}…`}
        autoFocus
      />
      <div className="risposta-notifica-azioni">
        <button
          type="button"
          className="btn btn-small"
          disabled={isPending || !messaggio.trim()}
          onClick={invia}
        >
          {isPending ? 'Invio…' : 'Invia risposta'}
        </button>
        <button type="button" className="btn-link" disabled={isPending} onClick={() => setAperto(false)}>
          Annulla
        </button>
      </div>
      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
