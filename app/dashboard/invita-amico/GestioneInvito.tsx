'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { impostaGestito, salvaNote } from './actions'

// Stesso componente/UX di GestioneSezione (Enquiries): toggle Da gestire/
// Gestito bloccato finche' non c'e' una nota salvata, cosi' resta sempre
// traccia di cosa e' stato fatto con l'invito. Niente cancellazione qui:
// a differenza dei contatti non e' mai stata richiesta per questa sezione.
export function GestioneInvito({
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
  const [erroreGestito, setErroreGestito] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function alternaGestito(nuovo: boolean) {
    setErroreGestito(null)

    if (nuovo && !note.trim()) {
      setErroreGestito("Inserisci e salva una nota prima di segnare l'invito come gestito.")
      return
    }
    if (nuovo && !noteSalvata) {
      setErroreGestito('Salva la nota prima di segnare come gestito.')
      return
    }

    setIsGestito(nuovo)
    startTransition(async () => {
      const risultato = await impostaGestito(id, nuovo)
      if (!risultato.ok) {
        setIsGestito(!nuovo)
        setErroreGestito(risultato.errore)
      }
    })
  }

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere l'accordion,
    // non vogliamo che interagire coi controlli qui dentro la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <div className="gestione-riga">
        <span className={`gestione-toggle-side${!isGestito ? ' attivo da-gestire' : ''}`}>Da gestire</span>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isGestito}
            disabled={isPending}
            onChange={(e) => alternaGestito(e.target.checked)}
          />
          <span className="toggle-switch-track" />
        </label>

        <span className={`gestione-toggle-side${isGestito ? ' attivo gestito' : ''}`}>Gestito</span>

        {isGestito && (gestitoDa || gestitoIl) && (
          <span className="gestione-meta">
            {gestitoDa && `da ${gestitoDa}`}
            {gestitoDa && gestitoIl && ' · '}
            {gestitoIl && `il ${formatDateOra(gestitoIl)}`}
          </span>
        )}
      </div>

      {erroreGestito && <p className="gestione-errore">{erroreGestito}</p>}

      <label className="gestione-note-label" htmlFor={`note-invito-${id}`}>
        Note {!noteSalvata || !note.trim() ? '(obbligatoria per segnare come gestito)' : ''}
      </label>
      <textarea
        id={`note-invito-${id}`}
        className="gestione-note"
        rows={3}
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setNoteSalvata(false)
        }}
        placeholder="Aggiungi una nota interna su questo invito…"
      />
      <button
        type="button"
        className="btn-ghost btn-small"
        disabled={isPending || noteSalvata}
        onClick={() => {
          startTransition(async () => {
            const risultato = await salvaNote(id, note)
            if (risultato.ok) {
              setNoteSalvata(true)
              setErroreGestito(null)
            } else {
              setErroreGestito(risultato.errore)
            }
          })
        }}
      >
        {noteSalvata ? 'Nota salvata' : 'Salva nota'}
      </button>
    </div>
  )
}
