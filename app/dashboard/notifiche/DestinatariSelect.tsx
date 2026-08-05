'use client'

import { useEffect, useRef, useState } from 'react'

// Tendina a selezione multipla: un pulsante che riassume la scelta corrente
// e, quando aperto, un elenco di checkbox. Si chiude cliccando fuori o
// premendo Esc, come qualsiasi altra tendina del pannello.
export function DestinatariSelect({
  destinatari,
  selezionati,
  onToggle,
  disabled,
}: {
  destinatari: { email: string; nome: string }[]
  selezionati: string[]
  onToggle: (email: string) => void
  disabled?: boolean
}) {
  const [aperto, setAperto] = useState(false)
  const contenitoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function chiudiSeFuori(e: MouseEvent) {
      if (contenitoreRef.current && !contenitoreRef.current.contains(e.target as Node)) {
        setAperto(false)
      }
    }
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAperto(false)
    }
    document.addEventListener('mousedown', chiudiSeFuori)
    document.addEventListener('keydown', chiudiConEsc)
    return () => {
      document.removeEventListener('mousedown', chiudiSeFuori)
      document.removeEventListener('keydown', chiudiConEsc)
    }
  }, [])

  const nomiSelezionati = destinatari.filter((d) => selezionati.includes(d.email)).map((d) => d.nome)
  const etichetta =
    nomiSelezionati.length === 0
      ? 'Seleziona destinatari'
      : nomiSelezionati.length <= 2
        ? nomiSelezionati.join(', ')
        : `${nomiSelezionati.length} destinatari selezionati`

  return (
    <div className="destinatari-select" ref={contenitoreRef}>
      <button
        type="button"
        className="destinatari-select-trigger"
        disabled={disabled || destinatari.length === 0}
        aria-expanded={aperto}
        aria-haspopup="listbox"
        onClick={() => setAperto((a) => !a)}
      >
        <span>{destinatari.length === 0 ? 'Non ci sono altri operatori a cui scrivere' : etichetta}</span>
      </button>

      {aperto && destinatari.length > 0 && (
        <div className="destinatari-select-panel" role="listbox" aria-multiselectable="true">
          {destinatari.map((d) => {
            const attivo = selezionati.includes(d.email)
            return (
              <label key={d.email} className="destinatari-select-opzione">
                <input
                  type="checkbox"
                  checked={attivo}
                  disabled={disabled}
                  onChange={() => onToggle(d.email)}
                />
                {d.nome}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
