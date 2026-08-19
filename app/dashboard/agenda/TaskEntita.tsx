'use client'

import { useState, useTransition } from 'react'
import {
  CLASSE_TIPO,
  ETICHETTE_STATO_TASK,
  ETICHETTE_TIPO_BREVI,
  eStatoTaskValido,
  eTipoValido,
  intervalloOrario,
  normalizzaOra,
  type RigaTask,
  type StatoTask,
} from '@/lib/agenda'
import { formatDataConGiorno } from '@/lib/format'
import { completaTask, eliminaTask, riapriTask } from './actions'
import { FormTask } from './FormTask'

// Blocco "In agenda" da mettere dentro la riga espansa di un record
// qualsiasi del CRM (oggi: un invito "Invita un amico"): elenca le voci
// d'agenda collegate a quel record e permette di crearne una nuova gia'
// collegata, senza passare dalla sezione Agenda.
//
// Generico di proposito (entita/entita_id, vedi la tabella task): per
// usarlo su un'altra sezione basta passare entita ed etichetta diverse.
export function TaskEntita({
  entita,
  entitaId,
  etichetta,
  titoloSuggerito,
  task,
  staff,
  emailCorrente,
  eAmministratore,
}: {
  entita: string
  entitaId: string
  // Nome leggibile del record, mostrato nel form come "Collegato a: …".
  etichetta: string
  titoloSuggerito: string
  task: RigaTask[]
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
  eAmministratore: boolean
}) {
  const [aperto, setAperto] = useState(false)
  const oggi = new Date()
  const dataProposta = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(
    oggi.getDate()
  ).padStart(2, '0')}`

  const aperti = task.filter((riga) => (eStatoTaskValido(riga.stato) ? riga.stato : 'aperto') === 'aperto')

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere
    // l'accordion, non vogliamo che interagire qui dentro la richiuda.
    <div className="task-entita" onClick={(e) => e.stopPropagation()}>
      {task.length === 0 ? (
        <p className="gestione-meta">Nessun appuntamento o task in agenda per questo record.</p>
      ) : (
        <>
          <p className="gestione-meta">
            {task.length === 1 ? '1 voce in agenda' : `${task.length} voci in agenda`}
            {aperti.length > 0 && ` · ${aperti.length} da fare`}
          </p>
          <ul className="task-elenco">
            {task.map((riga) => (
              <RigaTaskCollegato
                key={riga.id}
                riga={riga}
                emailCorrente={emailCorrente}
                eAmministratore={eAmministratore}
              />
            ))}
          </ul>
        </>
      )}

      {aperto ? (
        <>
          <h4 className="agenda-nuovo-titolo">Nuovo in agenda</h4>
          <FormTask
            staff={staff}
            emailCorrente={emailCorrente}
            dataProposta={dataProposta}
            collegamentoFisso={{ valore: `${entita}:${entitaId}`, etichetta }}
            titoloIniziale={titoloSuggerito}
            onFatto={() => setAperto(false)}
            onAnnulla={() => setAperto(false)}
          />
        </>
      ) : (
        <button type="button" className="btn btn-small" onClick={() => setAperto(true)}>
          + Crea task o appuntamento
        </button>
      )}
    </div>
  )
}

function RigaTaskCollegato({
  riga,
  emailCorrente,
  eAmministratore,
}: {
  riga: RigaTask
  emailCorrente: string | null
  eAmministratore: boolean
}) {
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState(false)
  const [isPending, startTransition] = useTransition()

  const stato: StatoTask = eStatoTaskValido(riga.stato) ? riga.stato : 'aperto'
  const tipo = eTipoValido(riga.tipo) ? riga.tipo : 'task'
  const ora = intervalloOrario(normalizzaOra(riga.ora), Number(riga.durata_minuti) || 10)
  const puoModificare =
    eAmministratore ||
    (!!emailCorrente &&
      (riga.assegnato_a?.toLowerCase() === emailCorrente || riga.creato_da?.toLowerCase() === emailCorrente))

  function esegui(azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    startTransition(async () => {
      const risultato = await azione()
      if (!risultato.ok) setErrore(risultato.errore)
    })
  }

  return (
    <li className={`task-riga${stato !== 'aperto' ? ' chiuso' : ''}`}>
      <div className="task-riga-testo">
        <span className={`richiesta-badge ${CLASSE_TIPO[tipo]}`}>{ETICHETTE_TIPO_BREVI[tipo]}</span>
        <span className="task-riga-quando">
          {formatDataConGiorno(riga.data)}
          {ora && ` · ${ora}`}
        </span>
        <span className="task-riga-titolo">{riga.titolo}</span>
        <span className="gestione-meta">
          {ETICHETTE_STATO_TASK[stato]}
          {riga.assegnato_a && ` · ${riga.assegnato_a}`}
        </span>
      </div>

      {puoModificare && (
        <div className="task-riga-azioni">
          {stato === 'aperto' ? (
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => esegui(() => completaTask(String(riga.id)))}
            >
              Completa
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => esegui(() => riapriTask(String(riga.id)))}
            >
              Riapri
            </button>
          )}
          {conferma ? (
            <>
              <button
                type="button"
                className="btn-danger btn-small"
                disabled={isPending}
                onClick={() => esegui(() => eliminaTask(String(riga.id)))}
              >
                Confermi?
              </button>
              <button
                type="button"
                className="btn-ghost btn-small"
                disabled={isPending}
                onClick={() => setConferma(false)}
              >
                No
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={() => setConferma(true)}>
              Elimina
            </button>
          )}
        </div>
      )}

      {errore && <p className="gestione-errore">{errore}</p>}
    </li>
  )
}
