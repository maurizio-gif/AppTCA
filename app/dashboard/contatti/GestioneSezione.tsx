'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { impostaGestito, salvaNote } from './actions'

export function GestioneSezione({
  id,
  gestito,
  gestitoDa,
  gestitoIl,
  noteIniziali,
}: {
  id: string
  gestito: boolean
  gestitoDa: string | null
  gestitoIl: string | null
  noteIniziali: string | null
}) {
  const [isGestito, setIsGestito] = useState(gestito)
  const [note, setNote] = useState(noteIniziali ?? '')
  const [noteSalvata, setNoteSalvata] = useState(true)
  const [isPending, startTransition] = useTransition()

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere l'accordion,
    // non vogliamo che interagire coi controlli qui dentro la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <div className="gestione-riga">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isGestito}
            disabled={isPending}
            onChange={(e) => {
              const nuovo = e.target.checked
              setIsGestito(nuovo)
              startTransition(() => {
                impostaGestito(id, nuovo)
              })
            }}
          />
          <span className="toggle-switch-track" />
        </label>

        <span className={`gestione-badge ${isGestito ? 'gestito' : 'da-gestire'}`}>
          {isGestito ? 'Gestito' : 'Da gestire'}
        </span>

        {isGestito && (gestitoDa || gestitoIl) && (
          <span className="gestione-meta">
            {gestitoDa && `da ${gestitoDa}`}
            {gestitoDa && gestitoIl && ' · '}
            {gestitoIl && `il ${formatDateOra(gestitoIl)}`}
          </span>
        )}
      </div>

      <label className="gestione-note-label" htmlFor={`note-${id}`}>
        Note
      </label>
      <textarea
        id={`note-${id}`}
        className="gestione-note"
        rows={3}
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setNoteSalvata(false)
        }}
        placeholder="Aggiungi una nota interna su questo contatto…"
      />
      <button
        type="button"
        className="btn-ghost btn-small"
        disabled={isPending || noteSalvata}
        onClick={() => {
          startTransition(() => {
            salvaNote(id, note).then(() => setNoteSalvata(true))
          })
        }}
      >
        {noteSalvata ? 'Nota salvata' : 'Salva nota'}
      </button>
    </div>
  )
}
