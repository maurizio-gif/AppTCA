'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { impostaGestito, salvaNote } from './actions'
import { EliminaContattoButton } from './EliminaContattoButton'

export function GestioneSezione({
  id,
  gestito,
  gestitoDa,
  gestitoIl,
  noteIniziali,
  puoCancellare,
}: {
  id: string
  gestito: boolean
  gestitoDa: string | null
  gestitoIl: string | null
  noteIniziali: string | null
  puoCancellare: boolean
}) {
  const [isGestito, setIsGestito] = useState(gestito)
  const [note, setNote] = useState(noteIniziali ?? '')
  const [noteSalvata, setNoteSalvata] = useState(true)
  const [erroreGestito, setErroreGestito] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function alternaGestito(nuovo: boolean) {
    setErroreGestito(null)

    // Prima di chiamare il server: se manca una nota salvata evitiamo
    // il giro di rete e mostriamo subito il motivo.
    if (nuovo && !note.trim()) {
      setErroreGestito('Inserisci e salva una nota prima di segnare il contatto come gestito.')
      return
    }
    if (nuovo && !noteSalvata) {
      setErroreGestito('Salva la nota prima di segnare il contatto come gestito.')
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
        <span className={`gestione-toggle-side${!isGestito ? ' attivo da-gestire' : ''}`}>
          Da gestire
        </span>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isGestito}
            disabled={isPending}
            onChange={(e) => alternaGestito(e.target.checked)}
          />
          <span className="toggle-switch-track" />
        </label>

        <span className={`gestione-toggle-side${isGestito ? ' attivo gestito' : ''}`}>
          Gestito
        </span>

        {isGestito && (gestitoDa || gestitoIl) && (
          <span className="gestione-meta">
            {gestitoDa && `da ${gestitoDa}`}
            {gestitoDa && gestitoIl && ' · '}
            {gestitoIl && `il ${formatDateOra(gestitoIl)}`}
          </span>
        )}
      </div>

      {erroreGestito && <p className="gestione-errore">{erroreGestito}</p>}

      <label className="gestione-note-label" htmlFor={`note-${id}`}>
        Note {!noteSalvata || !note.trim() ? '(obbligatoria per segnare come gestito)' : ''}
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

      {puoCancellare && <EliminaContattoButton id={id} />}
    </div>
  )
}
