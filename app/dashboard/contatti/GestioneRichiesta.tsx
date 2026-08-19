'use client'

import { useState, useTransition } from 'react'
import { salvaNote } from './actions'
import { EliminaContattoButton } from './EliminaContattoButton'

// Cio' che si fa sulla SINGOLA richiesta: la nota di cosa e' stato fatto e, per
// chi ha il permesso, la cancellazione. Lo stato di lavorazione non e' piu'
// qui: sta sull'opportunita' della persona (vedi components/PannelloPipeline),
// perche' una richiesta lavorata e una trattativa in corso sono la stessa cosa
// vista da due punti, e tenerle separate confondeva "gestito" con "in
// gestione".
export function GestioneRichiesta({
  id,
  noteIniziali,
  puoCancellare,
}: {
  id: string
  noteIniziali: string | null
  puoCancellare: boolean
}) {
  const [note, setNote] = useState(noteIniziali ?? '')
  const [noteSalvata, setNoteSalvata] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere l'accordion,
    // non vogliamo che interagire coi controlli qui dentro la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <label className="gestione-note-label" htmlFor={`note-${id}`}>
        Note su questa richiesta
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
        placeholder="Cosa è stato fatto su questa richiesta…"
      />
      <div className="pipeline-azioni">
        <button
          type="button"
          className="btn-ghost btn-small"
          disabled={isPending || noteSalvata}
          onClick={() => {
            setErrore(null)
            startTransition(async () => {
              const risultato = await salvaNote(id, note)
              if (risultato.ok) setNoteSalvata(true)
              else setErrore(risultato.errore)
            })
          }}
        >
          {noteSalvata ? 'Nota salvata' : 'Salva nota'}
        </button>
      </div>

      {errore && <p className="gestione-errore">{errore}</p>}

      {puoCancellare && <EliminaContattoButton id={id} />}
    </div>
  )
}
