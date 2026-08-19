'use client'

import { useEffect, useState, useTransition } from 'react'
import { cercaPersone, type PersonaTrovata } from './ricerca-actions'

// Campo "persona" con ricerca mentre si scrive: nome, cognome, email o
// cellulare. Nessuna tendina precaricata - l'anagrafica ha migliaia di righe
// (lo storico HubSpot) - e nessuna schermata intermedia: si digita, si clicca,
// e' fatto. Vedi ricerca-actions.ts per la query.
export function PersonaPicker({
  persona,
  onScegli,
}: {
  persona: PersonaTrovata | null
  onScegli: (persona: PersonaTrovata | null) => void
}) {
  const [query, setQuery] = useState('')
  const [risultati, setRisultati] = useState<PersonaTrovata[]>([])
  const [cercato, setCercato] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Debounce: si cerca quando si smette di scrivere, non a ogni tasto.
  useEffect(() => {
    if (persona || query.trim().length < 2) {
      setRisultati([])
      setCercato(false)
      return
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        setRisultati(await cercaPersone(query))
        setCercato(true)
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, persona])

  if (persona) {
    return (
      <div className="field">
        <label>Persona</label>
        <div className="persona-scelta">
          <span className="persona-scelta-nome">{persona.nome}</span>
          {persona.email && <span className="muted">{persona.email}</span>}
          {persona.storico && <span className="chip-persona-storico">già nello storico</span>}
          <button
            type="button"
            className="btn-ghost btn-small"
            onClick={() => {
              onScegli(null)
              setQuery('')
            }}
          >
            Cambia
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor="task-persona">Persona (facoltativo)</label>
      <input
        id="task-persona"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca per nome, email o cellulare…"
        autoComplete="off"
      />
      {isPending && <p className="gestione-meta">Cerco…</p>}
      {risultati.length > 0 && (
        <ul className="persona-risultati">
          {risultati.map((trovata) => (
            <li key={trovata.id}>
              <button type="button" className="persona-risultato" onClick={() => onScegli(trovata)}>
                <span className="persona-scelta-nome">{trovata.nome}</span>
                <span className="muted">
                  {[trovata.email, trovata.cellulare].filter(Boolean).join(' · ')}
                  {trovata.storico ? ' · storico' : ''}
                  {trovata.opportunita.length > 0 ? ` · ${trovata.opportunita[0].etichetta}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {cercato && !isPending && risultati.length === 0 && (
        <p className="gestione-meta">Nessuna persona trovata: il task resta senza collegamento.</p>
      )}
    </div>
  )
}
