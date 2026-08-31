'use client'

import { useState, useTransition } from 'react'
import { DURATA_PREDEFINITA, OPZIONI_TIPO, eTipoValido, type TipoVoce } from '@/lib/agenda'
import { modificaTask } from './actions'

// Modifica di una voce d'agenda gia' esistente: spostarla di orario o di
// giorno e' il gesto piu' frequente dell'agenda ("mi sposta a domani alle
// 18?"), e prima si poteva solo cancellare e riscrivere - perdendo nota,
// esito e collegamento alla persona.
//
// Volutamente non e' FormTask: quello serve a CREARE, e chiede anche con chi
// (persona, richiesta, opportunita'). Qui il con-chi e' gia' deciso e non si
// tocca; si cambia solo il quando e il cosa, che e' l'unica cosa che davvero
// cambia dopo una telefonata.
//
// Stesso componente sia nel pannello dell'Agenda (AzioniTask) sia nell'elenco
// dentro la riga di un record (TaskEntita): le regole di modifica stanno in un
// posto solo.
export function ModificaTask({
  id,
  titoloIniziale,
  tipoIniziale,
  dataIniziale,
  oraIniziale,
  durataIniziale,
  noteIniziali,
  assegnatoAIniziale,
  staff,
  emailCorrente,
  onFatto,
  onAnnulla,
}: {
  id: string
  titoloIniziale: string
  tipoIniziale: TipoVoce
  dataIniziale: string
  oraIniziale: string | null
  durataIniziale: number
  noteIniziali: string | null
  assegnatoAIniziale: string | null
  // Assente quando chi mostra il pannello non ha l'elenco degli operatori: si
  // puo' comunque spostare la voce, l'assegnatario resta quello di prima.
  staff?: { email: string; nome: string }[]
  emailCorrente: string | null
  onFatto?: () => void
  onAnnulla?: () => void
}) {
  const [tipo, setTipo] = useState<TipoVoce>(tipoIniziale)
  const [titolo, setTitolo] = useState(titoloIniziale)
  const [data, setData] = useState(dataIniziale)
  const [ora, setOra] = useState(oraIniziale ?? '')
  const [durata, setDurata] = useState(durataIniziale)
  const [note, setNote] = useState(noteIniziali ?? '')
  const [assegnatoA, setAssegnatoA] = useState(assegnatoAIniziale ?? emailCorrente ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="agenda-form" onClick={(e) => e.stopPropagation()}>
      {errore && <p className="gestione-errore">{errore}</p>}

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor={`modifica-tipo-${id}`}>Tipo</label>
          <select
            id={`modifica-tipo-${id}`}
            className="filter-select"
            value={tipo}
            onChange={(e) => {
              const nuovo = eTipoValido(e.target.value) ? e.target.value : 'task'
              setTipo(nuovo)
              // Cambiare tipo cambia anche quanto occupa in agenda, ma solo
              // se la durata era ancora quella predefinita del tipo di prima:
              // una durata scritta a mano non si perde.
              setDurata((precedente) => (precedente === DURATA_PREDEFINITA[tipo] ? DURATA_PREDEFINITA[nuovo] : precedente))
            }}
          >
            {OPZIONI_TIPO.map((opzione) => (
              <option key={opzione.valore} value={opzione.valore}>
                {opzione.etichetta}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`modifica-data-${id}`}>Giorno</label>
          <input
            id={`modifica-data-${id}`}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor={`modifica-ora-${id}`}>Ora (vuoto = tutto il giorno)</label>
          <input id={`modifica-ora-${id}`} type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor={`modifica-durata-${id}`}>Durata (minuti)</label>
          <input
            id={`modifica-durata-${id}`}
            type="number"
            min={5}
            max={480}
            step={5}
            value={durata}
            onChange={(e) => setDurata(Number(e.target.value))}
          />
        </div>

        {staff && staff.length > 0 && (
          <div className="field">
            <label htmlFor={`modifica-assegnato-${id}`}>Assegnato a</label>
            <select
              id={`modifica-assegnato-${id}`}
              className="filter-select"
              value={assegnatoA}
              onChange={(e) => setAssegnatoA(e.target.value)}
            >
              {staff.map((membro) => (
                <option key={membro.email} value={membro.email}>
                  {membro.nome}
                  {membro.email.toLowerCase() === (emailCorrente ?? '') ? ' (io)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor={`modifica-titolo-${id}`}>Titolo</label>
        <input
          id={`modifica-titolo-${id}`}
          type="text"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor={`modifica-note-${id}`}>Note</label>
        <textarea
          id={`modifica-note-${id}`}
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
          className="btn btn-small"
          disabled={isPending || !titolo.trim()}
          onClick={() => {
            setErrore(null)
            startTransition(async () => {
              const risultato = await modificaTask(id, {
                titolo,
                tipo,
                data,
                ora: ora || null,
                durataMinuti: durata,
                note,
                // Senza elenco operatori l'assegnatario non e' modificabile:
                // non si manda niente e il server tiene quello di prima.
                assegnatoA: staff && staff.length > 0 ? assegnatoA : null,
              })
              if (risultato.ok) onFatto?.()
              else setErrore(risultato.errore)
            })
          }}
        >
          {isPending ? 'Un momento…' : 'Salva modifiche'}
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
