'use client'

import { useEffect, useState, useTransition } from 'react'
import { useGiornoSelezionato } from '@/components/CalendarioAgenda'
import { OPZIONI_TIPO } from '@/lib/agenda'
import { creaTask } from './actions'

// Form per fissare un appuntamento o un task. Sta sotto il calendario e
// segue il giorno selezionato (vedi useGiornoSelezionato): clicchi il 12,
// apri il form e il 12 e' gia' proposto. Se lo cambi a mano vince quello
// che hai scritto, finche' non selezioni un altro giorno.
export function NuovoTask({
  staff,
  emailCorrente,
  collegabili,
}: {
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
  // Record a cui il task puo' essere collegato (oggi: gli inviti "Invita un
  // amico" ancora aperti), nel formato "entita:id".
  collegabili: { valore: string; etichetta: string }[]
}) {
  const giornoSelezionato = useGiornoSelezionato()
  const oggi = new Date()
  const oggiIso = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(
    oggi.getDate()
  ).padStart(2, '0')}`

  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState<string>('task')
  const [titolo, setTitolo] = useState('')
  const [dataManuale, setDataManuale] = useState<string | null>(null)
  const [ora, setOra] = useState('')
  const [assegnatoA, setAssegnatoA] = useState(emailCorrente ?? '')
  const [note, setNote] = useState('')
  const [collegamento, setCollegamento] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Cambiando giorno nel calendario il form torna a seguirlo: e' il gesto
  // piu' comune ("aggiungo qualcosa in quel giorno").
  useEffect(() => {
    setDataManuale(null)
  }, [giornoSelezionato])

  const data = dataManuale ?? giornoSelezionato ?? oggiIso

  if (!aperto) {
    return (
      <div className="agenda-nuovo">
        <button type="button" className="btn" onClick={() => setAperto(true)}>
          + Aggiungi in agenda
          {giornoSelezionato && ` (${new Date(`${giornoSelezionato}T00:00:00`).toLocaleDateString('it-IT')})`}
        </button>
      </div>
    )
  }

  return (
    <div className="agenda-nuovo login-card">
      <h3 className="agenda-nuovo-titolo">Nuovo in agenda</h3>

      {errore && <p className="error-banner">{errore}</p>}

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor="task-tipo">Tipo</label>
          <select id="task-tipo" className="filter-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {OPZIONI_TIPO.map((opzione) => (
              <option key={opzione.valore} value={opzione.valore}>
                {opzione.etichetta}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="task-data">Giorno</label>
          <input
            id="task-data"
            type="date"
            value={data}
            onChange={(e) => setDataManuale(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="task-ora">Ora (vuoto = tutto il giorno)</label>
          <input id="task-ora" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="task-assegnato">Assegnato a</label>
          <select
            id="task-assegnato"
            className="filter-select"
            value={assegnatoA}
            onChange={(e) => setAssegnatoA(e.target.value)}
          >
            {staff.map((persona) => (
              <option key={persona.email} value={persona.email}>
                {persona.nome}
                {persona.email.toLowerCase() === (emailCorrente ?? '') ? ' (io)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="task-titolo">Titolo</label>
        <input
          id="task-titolo"
          type="text"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="Es. Richiamare Maria Rossi per il preventivo"
          required
        />
      </div>

      {collegabili.length > 0 && (
        <div className="field">
          <label htmlFor="task-collegamento">Collega a (facoltativo)</label>
          <select
            id="task-collegamento"
            className="filter-select"
            value={collegamento}
            onChange={(e) => setCollegamento(e.target.value)}
          >
            <option value="">Nessun collegamento</option>
            {collegabili.map((opzione) => (
              <option key={opzione.valore} value={opzione.valore}>
                {opzione.etichetta}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="task-note">Note</label>
        <textarea
          id="task-note"
          className="gestione-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Dettagli utili a chi lo dovrà fare…"
        />
      </div>

      <div className="pipeline-azioni">
        <button
          type="button"
          className="btn"
          disabled={isPending || !titolo.trim()}
          onClick={() => {
            setErrore(null)
            const [entita, entitaId] = collegamento ? collegamento.split(':') : [null, null]
            startTransition(async () => {
              const risultato = await creaTask({
                titolo,
                tipo,
                data,
                ora: ora || null,
                note,
                assegnatoA,
                entita,
                entitaId,
              })
              if (risultato.ok) {
                setTitolo('')
                setNote('')
                setOra('')
                setCollegamento('')
                setAperto(false)
              } else {
                setErrore(risultato.errore)
              }
            })
          }}
        >
          Salva in agenda
        </button>
        <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={() => setAperto(false)}>
          Annulla
        </button>
      </div>
    </div>
  )
}
