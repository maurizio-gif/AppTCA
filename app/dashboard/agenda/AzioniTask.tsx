'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { ETICHETTE_STATO_TASK, type StatoTask, type TipoVoce } from '@/lib/agenda'
import { annullaTask, completaTask, eliminaTask, riapriTask } from './actions'
import { ModificaTask } from './ModificaTask'

// Pannello di gestione di un task dentro la riga del calendario. Completarlo
// (con l'esito), annullarlo o riaprirlo lo puo' fare chiunque, anche se il
// task e' di una collega: l'agenda e' condivisa anche in scrittura, e chi
// risponde al telefono al posto di un'altra deve poter scrivere subito com'e'
// andata. Chi ha fatto cosa resta nel registro operatori. Solo la
// cancellazione, che e' irreversibile, resta di chi ce l'ha in mano, di chi lo
// ha creato o di un amministratore.
export function AzioniTask({
  id,
  stato,
  assegnatoEtichetta,
  completatoIl,
  esito,
  note,
  puoEliminare,
  titolo,
  tipo,
  data,
  ora,
  durataMinuti,
  assegnatoA,
  staff,
  emailCorrente,
}: {
  id: string
  stato: StatoTask
  assegnatoEtichetta: string | null
  completatoIl: string | null
  esito: string | null
  note: string | null
  // Solo per il pulsante Elimina: tutto il resto e' aperto a chiunque.
  puoEliminare: boolean
  // Valori attuali della voce: servono a riempire il form di modifica (vedi
  // ModificaTask), che parte da com'e' adesso e non da un foglio bianco.
  titolo: string
  tipo: TipoVoce
  data: string
  ora: string | null
  durataMinuti: number
  assegnatoA: string | null
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
}) {
  const [modificando, setModificando] = useState(false)
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

      {modificando ? (
        <ModificaTask
          id={id}
          titoloIniziale={titolo}
          tipoIniziale={tipo}
          dataIniziale={data}
          oraIniziale={ora}
          durataIniziale={durataMinuti}
          noteIniziali={note}
          assegnatoAIniziale={assegnatoA}
          staff={staff}
          emailCorrente={emailCorrente}
          onFatto={() => setModificando(false)}
          onAnnulla={() => setModificando(false)}
        />
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
            <BottoneModifica isPending={isPending} onApri={() => setModificando(true)} />
            {puoEliminare && <BottoneElimina id={id} isPending={isPending} esegui={esegui} />}
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
          <BottoneModifica isPending={isPending} onApri={() => setModificando(true)} />
          {puoEliminare && <BottoneElimina id={id} isPending={isPending} esegui={esegui} />}
        </div>
      )}
    </div>
  )
}

// Spostare di orario o di giorno e' la modifica quasi sempre cercata: il
// pulsante lo dice, invece di un generico "Modifica" che non fa capire che
// serve anche a quello.
function BottoneModifica({ isPending, onApri }: { isPending: boolean; onApri: () => void }) {
  return (
    <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={onApri}>
      Sposta o modifica
    </button>
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
