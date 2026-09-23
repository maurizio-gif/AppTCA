'use client'

import { useState, useTransition } from 'react'
import { modificaContattiPersona } from './actions'

// Email e cellulare sono i dati che piu' spesso arrivano sbagliati in
// anagrafica (refuso in un modulo, un numero cambiato): chi se ne accorge
// deve poterli correggere subito, non solo un amministratore. Resta comunque
// tutto nel registro operatori (vedi modificaContattiPersona).
export function ModificaContattiPersona({
  personaId,
  emailIniziale,
  cellulareIniziale,
}: {
  personaId: string
  emailIniziale: string | null
  cellulareIniziale: string | null
}) {
  const [inModifica, setInModifica] = useState(false)
  const [email, setEmail] = useState(emailIniziale ?? '')
  const [cellulare, setCellulare] = useState(cellulareIniziale ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function annulla() {
    setEmail(emailIniziale ?? '')
    setCellulare(cellulareIniziale ?? '')
    setErrore(null)
    setInModifica(false)
  }

  if (!inModifica) {
    return (
      <div className="detail-grid persona-contatti">
        <div className="detail-item">
          <span className="detail-label">email</span>
          <span className="detail-value">{emailIniziale || '—'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">cellulare</span>
          <span className="detail-value">{cellulareIniziale || '—'}</span>
        </div>
        <div className="detail-item">
          <button type="button" className="btn-ghost btn-small" onClick={() => setInModifica(true)}>
            Correggi email o cellulare
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="persona-contatti-form">
      {errore && <p className="gestione-errore">{errore}</p>}
      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor={`contatti-email-${personaId}`}>Email</label>
          <input
            id={`contatti-email-${personaId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`contatti-cellulare-${personaId}`}>Cellulare</label>
          <input
            id={`contatti-cellulare-${personaId}`}
            type="tel"
            value={cellulare}
            onChange={(e) => setCellulare(e.target.value)}
          />
        </div>
      </div>
      <div className="pipeline-azioni">
        <button
          type="button"
          className="btn btn-small"
          disabled={isPending}
          onClick={() => {
            setErrore(null)
            startTransition(async () => {
              const risultato = await modificaContattiPersona(personaId, {
                email: email || null,
                cellulare: cellulare || null,
              })
              if (risultato.ok) setInModifica(false)
              else setErrore(risultato.errore)
            })
          }}
        >
          {isPending ? 'Un momento…' : 'Salva'}
        </button>
        <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={annulla}>
          Annulla
        </button>
      </div>
    </div>
  )
}
