'use client'

import { useEffect, useState, useTransition } from 'react'
import { DURATA_PREDEFINITA, OPZIONI_TIPO, eTipoValido, type TipoVoce } from '@/lib/agenda'
import { creaTask } from './actions'

// Form di creazione di una voce d'agenda, condiviso da chi lo apre dal
// calendario (NuovoTask) e da chi lo apre dentro la riga di un record
// (TaskEntita): stessi campi e stesse regole in un posto solo.
export function FormTask({
  staff,
  emailCorrente,
  dataProposta,
  collegabili = [],
  collegamentoFisso,
  titoloIniziale = '',
  onFatto,
  onAnnulla,
}: {
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
  // Giorno proposto (es. quello selezionato nel calendario): resta
  // modificabile, e se cambia il form lo segue di nuovo.
  dataProposta: string
  collegabili?: { valore: string; etichetta: string }[]
  // Collegamento gia' deciso da chi apre il form (task creato dalla riga di
  // un invito, di un contatto…): in quel caso la tendina non serve.
  collegamentoFisso?: { valore: string; etichetta: string }
  titoloIniziale?: string
  onFatto?: () => void
  onAnnulla?: () => void
}) {
  const [tipo, setTipo] = useState<TipoVoce>('task')
  const [titolo, setTitolo] = useState(titoloIniziale)
  const [dataManuale, setDataManuale] = useState<string | null>(null)
  const [ora, setOra] = useState('')
  const [durataManuale, setDurataManuale] = useState<number | null>(null)
  const [assegnatoA, setAssegnatoA] = useState(emailCorrente ?? staff[0]?.email ?? '')
  const [note, setNote] = useState('')
  const [collegamento, setCollegamento] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Cambiando giorno nel calendario il form torna a seguirlo: e' il gesto
  // piu' comune ("aggiungo qualcosa in quel giorno").
  useEffect(() => {
    setDataManuale(null)
  }, [dataProposta])

  // La durata segue il tipo (10 minuti un task o una telefonata, 30 un
  // appuntamento in sede) finche' non la si tocca a mano; cambiando tipo si
  // riparte dal suo default, non da quello del tipo precedente.
  useEffect(() => {
    setDurataManuale(null)
  }, [tipo])

  const data = dataManuale ?? dataProposta
  const durata = durataManuale ?? DURATA_PREDEFINITA[tipo]

  return (
    <div className="login-card agenda-form">
      {errore && <p className="error-banner">{errore}</p>}

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor="task-tipo">Tipo</label>
          <select
            id="task-tipo"
            className="filter-select"
            value={tipo}
            onChange={(e) => setTipo(eTipoValido(e.target.value) ? e.target.value : 'task')}
          >
            {OPZIONI_TIPO.map((opzione) => (
              <option key={opzione.valore} value={opzione.valore}>
                {opzione.etichetta}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="task-data">Giorno</label>
          <input id="task-data" type="date" value={data} onChange={(e) => setDataManuale(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="task-ora">Ora (vuoto = tutto il giorno)</label>
          <input id="task-ora" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="task-durata">Durata (minuti)</label>
          <input
            id="task-durata"
            type="number"
            min={5}
            max={480}
            step={5}
            value={durata}
            onChange={(e) => setDurataManuale(Number(e.target.value))}
          />
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

      {collegamentoFisso ? (
        <p className="agenda-collegamento">Collegato a: {collegamentoFisso.etichetta}</p>
      ) : (
        collegabili.length > 0 && (
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
        )
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
            const scelto = collegamentoFisso?.valore ?? collegamento
            const [entita, entitaId] = scelto ? scelto.split(':') : [null, null]
            startTransition(async () => {
              const risultato = await creaTask({
                titolo,
                tipo,
                data,
                ora: ora || null,
                durataMinuti: durata,
                note,
                assegnatoA,
                entita,
                entitaId,
              })
              if (risultato.ok) {
                setTitolo(titoloIniziale)
                setNote('')
                setOra('')
                setCollegamento('')
                onFatto?.()
              } else {
                setErrore(risultato.errore)
              }
            })
          }}
        >
          Salva in agenda
        </button>
        {onAnnulla && (
          <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={onAnnulla}>
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}
