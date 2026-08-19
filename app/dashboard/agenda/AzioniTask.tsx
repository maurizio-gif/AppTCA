'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { ETICHETTE_STATO_TASK, type StatoTask } from '@/lib/agenda'
import { annullaTask, completaTask, eliminaTask, riapriTask } from './actions'

// Pannello di gestione di un task dentro la riga del calendario. Chi non ha
// il task in mano (e non e' amministratore) legge e basta: l'agenda e'
// condivisa in lettura, non in scrittura.
export function AzioniTask({
  id,
  stato,
  assegnatoEtichetta,
  completatoIl,
  esito,
  note,
  puoModificare,
}: {
  id: string
  stato: StatoTask
  assegnatoEtichetta: string | null
  completatoIl: string | null
  esito: string | null
  note: string | null
  puoModificare: boolean
}) {
  const [esitoNuovo, setEsitoNuovo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function esegui(azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    startTransition(async () => {
      const risultato = await azione()
      if (!risultato.ok) setErrore(risultato.errore)
    })
  }

  return (
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <div className="pipeline-meta">
        <span className="richiesta-badge richiesta-neutro">{ETICHETTE_STATO_TASK[stato]}</span>
        {assegnatoEtichetta && <span className="gestione-meta">assegnato a {assegnatoEtichetta}</span>}
        {completatoIl && <span className="gestione-meta">completato il {formatDateOra(completatoIl)}</span>}
      </div>

      {note && <p className="pipeline-motivo">{note}</p>}
      {esito && <p className="pipeline-motivo">Esito: {esito}</p>}

      {errore && <p className="gestione-errore">{errore}</p>}

      {!puoModificare ? (
        <p className="gestione-meta">Non è un tuo task: puoi vederlo, ma non modificarlo.</p>
      ) : stato === 'aperto' ? (
        <>
          <label className="gestione-note-label" htmlFor={`esito-${id}`}>
            Esito (facoltativo, si salva completando)
          </label>
          <input
            id={`esito-${id}`}
            className="pipeline-motivo-input"
            value={esitoNuovo}
            onChange={(e) => setEsitoNuovo(e.target.value)}
            placeholder="Es. richiamato, fissata visita venerdì"
          />
          <div className="pipeline-azioni">
            <button
              type="button"
              className="btn btn-small"
              disabled={isPending}
              onClick={() => esegui(() => completaTask(id, esitoNuovo))}
            >
              Completa
            </button>
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => esegui(() => annullaTask(id))}
            >
              Annulla task
            </button>
            <BottoneElimina id={id} isPending={isPending} esegui={esegui} />
          </div>
        </>
      ) : (
        <div className="pipeline-azioni">
          <button
            type="button"
            className="btn-ghost btn-small"
            disabled={isPending}
            onClick={() => esegui(() => riapriTask(id))}
          >
            Riapri
          </button>
          <BottoneElimina id={id} isPending={isPending} esegui={esegui} />
        </div>
      )}
    </div>
  )
}

// Cancellazione irreversibile: doppio click volontario, come per i contatti.
function BottoneElimina({
  id,
  isPending,
  esegui,
}: {
  id: string
  isPending: boolean
  esegui: (azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) => void
}) {
  const [conferma, setConferma] = useState(false)

  if (!conferma) {
    return (
      <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={() => setConferma(true)}>
        Elimina
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        className="btn-danger btn-small"
        disabled={isPending}
        onClick={() => esegui(() => eliminaTask(id))}
      >
        Confermi? Elimina
      </button>
      <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={() => setConferma(false)}>
        No
      </button>
    </>
  )
}
