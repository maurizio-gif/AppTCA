'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { impostaCaricatoPgm } from './actions'

// Stesso pattern del toggle Gestito/Da gestire di Enquiries
// (GestioneSezione), ma senza nota: qui basta sapere se la preiscrizione
// e' stata caricata su PerfectGym, non serve altro.
export function CaricatoPgmToggle({
  id,
  caricato,
  caricatoDa,
  caricatoIl,
}: {
  id: string
  caricato: boolean
  caricatoDa: string | null
  caricatoIl: string | null
}) {
  const [isCaricato, setIsCaricato] = useState(caricato)
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function alternaCaricato(nuovo: boolean) {
    setErrore(null)
    setIsCaricato(nuovo)
    startTransition(async () => {
      try {
        await impostaCaricatoPgm(id, nuovo)
      } catch (err) {
        setIsCaricato(!nuovo)
        setErrore(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
      }
    })
  }

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere l'accordion,
    // non vogliamo che interagire col toggle qui dentro la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <div className="gestione-riga">
        <span className={`gestione-toggle-side${!isCaricato ? ' attivo da-gestire' : ''}`}>
          Da caricare
        </span>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isCaricato}
            disabled={isPending}
            onChange={(e) => alternaCaricato(e.target.checked)}
          />
          <span className="toggle-switch-track" />
        </label>

        <span className={`gestione-toggle-side${isCaricato ? ' attivo gestito' : ''}`}>
          Caricato
        </span>

        {isCaricato && (caricatoDa || caricatoIl) && (
          <span className="gestione-meta">
            {caricatoDa && `da ${caricatoDa}`}
            {caricatoDa && caricatoIl && ' · '}
            {caricatoIl && `il ${formatDateOra(caricatoIl)}`}
          </span>
        )}
      </div>

      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
