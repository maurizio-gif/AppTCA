'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'

// Toggle on/off con etichette ai lati e meta "da chi/quando" (stesso
// componente usato da Scuola Tennis e Summer Camp per "Caricato su
// Perfect Gym"): la Server Action da chiamare arriva come prop, cosi'
// ogni pagina resta libera di aggiornare la propria tabella.
export function ToggleConMeta({
  attivo,
  attivoDa,
  attivoIl,
  etichettaOff,
  etichettaOn,
  onToggle,
}: {
  attivo: boolean
  attivoDa: string | null
  attivoIl: string | null
  etichettaOff: string
  etichettaOn: string
  onToggle: (nuovo: boolean) => Promise<void>
}) {
  const [isAttivo, setIsAttivo] = useState(attivo)
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function alterna(nuovo: boolean) {
    setErrore(null)
    setIsAttivo(nuovo)
    startTransition(async () => {
      try {
        await onToggle(nuovo)
      } catch (err) {
        setIsAttivo(!nuovo)
        setErrore(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
      }
    })
  }

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere l'accordion,
    // non vogliamo che interagire col toggle qui dentro la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <div className="gestione-riga">
        <span className={`gestione-toggle-side${!isAttivo ? ' attivo da-gestire' : ''}`}>
          {etichettaOff}
        </span>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isAttivo}
            disabled={isPending}
            onChange={(e) => alterna(e.target.checked)}
          />
          <span className="toggle-switch-track" />
        </label>

        <span className={`gestione-toggle-side${isAttivo ? ' attivo gestito' : ''}`}>
          {etichettaOn}
        </span>

        {isAttivo && (attivoDa || attivoIl) && (
          <span className="gestione-meta">
            {attivoDa && `da ${attivoDa}`}
            {attivoDa && attivoIl && ' · '}
            {attivoIl && `il ${formatDateOra(attivoIl)}`}
          </span>
        )}
      </div>

      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
