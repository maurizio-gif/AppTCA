'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import {
  CLASSE_STATO,
  ETICHETTE_AZIONE,
  ETICHETTE_STATO,
  STATI_CON_NOTA,
  TRANSIZIONI,
  eStatoFinale,
  type StatoPipeline,
} from '@/lib/pipeline'
import { cambiaStato, prendiInGestione, riapriGestione, riassegna, salvaNote } from './actions'

// Percorso "buono" mostrato come stepper: perso e' un'uscita laterale, non
// un passo avanti, quindi resta fuori dalla fila e compare solo come badge
// quando il lead e' effettivamente perso.
const PASSI: StatoPipeline[] = ['nuovo', 'in_gestione', 'vinto', 'credito_caricato']

function Stepper({ stato }: { stato: StatoPipeline }) {
  if (stato === 'perso') {
    return (
      <div className="pipeline-stepper">
        <span className="richiesta-badge richiesta-neutro">{ETICHETTE_STATO.perso}</span>
      </div>
    )
  }

  const indiceAttuale = PASSI.indexOf(stato)

  return (
    <div className="pipeline-stepper">
      {PASSI.map((passo, i) => (
        <span key={passo} className="pipeline-passo-wrap">
          <span
            className={`pipeline-passo${i === indiceAttuale ? ' attuale' : ''}${i < indiceAttuale ? ' fatto' : ''}`}
          >
            {ETICHETTE_STATO[passo]}
          </span>
          {i < PASSI.length - 1 && <span className="pipeline-freccia">›</span>}
        </span>
      ))}
    </div>
  )
}

// Pannello di gestione di un invito: al posto del vecchio toggle "Da
// gestire/Gestito" c'e' la pipeline (vedi lib/pipeline.ts). Chi prende in
// gestione l'invito ne diventa il titolare e da quel momento solo lui - o
// un amministratore - lo fa avanzare; i controlli veri stanno comunque
// nelle Server Action, qui evitiamo solo giri di rete inutili.
export function PipelineInvito({
  id,
  stato,
  assegnatoA,
  assegnatoIl,
  statoIl,
  motivoPerso,
  noteIniziali,
  emailCorrente,
  eAmministratore,
  staff,
}: {
  id: string
  stato: StatoPipeline
  assegnatoA: string | null
  assegnatoIl: string | null
  statoIl: string | null
  motivoPerso: string | null
  noteIniziali: string | null
  emailCorrente: string | null
  eAmministratore: boolean
  staff: { email: string; nome: string }[]
}) {
  const [note, setNote] = useState(noteIniziali ?? '')
  const [noteSalvata, setNoteSalvata] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [chiedeMotivo, setChiedeMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [isPending, startTransition] = useTransition()

  const mio = !!assegnatoA && !!emailCorrente && assegnatoA.toLowerCase() === emailCorrente.toLowerCase()
  const puoOperare = stato === 'nuovo' ? true : mio || eAmministratore
  const prossimi = TRANSIZIONI[stato]

  function esegui(azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    startTransition(async () => {
      const risultato = await azione()
      if (!risultato.ok) setErrore(risultato.errore)
      else setChiedeMotivo(false)
    })
  }

  function vaiA(nuovo: StatoPipeline) {
    // Controlli locali solo per risparmiare il giro di rete: gli stessi
    // vincoli sono ripetuti lato server.
    if (STATI_CON_NOTA.includes(nuovo)) {
      if (!note.trim()) {
        setErrore(`Scrivi e salva una nota prima di segnare l'invito come «${ETICHETTE_STATO[nuovo]}».`)
        return
      }
      if (!noteSalvata) {
        setErrore('Salva la nota prima di cambiare stato.')
        return
      }
    }

    if (nuovo === 'perso' && !chiedeMotivo) {
      setErrore(null)
      setChiedeMotivo(true)
      return
    }

    // La presa in carico ha un'azione a se': e' l'unico passaggio che puo'
    // fare chiunque, ed e' quello che assegna il lead (vedi actions.ts).
    if (stato === 'nuovo' && nuovo === 'in_gestione') {
      esegui(() => prendiInGestione(id))
      return
    }

    esegui(() => cambiaStato(id, nuovo, nuovo === 'perso' ? motivo : undefined))
  }

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere
    // l'accordion, non vogliamo che interagire coi controlli la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <Stepper stato={stato} />

      <div className="pipeline-meta">
        <span className={`richiesta-badge ${CLASSE_STATO[stato]}`}>{ETICHETTE_STATO[stato]}</span>
        {assegnatoA ? (
          <span className="gestione-meta">
            assegnato a {mio ? 'te' : assegnatoA}
            {assegnatoIl && ` · dal ${formatDateOra(assegnatoIl)}`}
          </span>
        ) : (
          <span className="gestione-meta">non ancora assegnato</span>
        )}
        {statoIl && stato !== 'nuovo' && (
          <span className="gestione-meta">ultimo aggiornamento {formatDateOra(statoIl)}</span>
        )}
      </div>

      {stato === 'perso' && motivoPerso && <p className="pipeline-motivo">Motivo: {motivoPerso}</p>}

      <div className="pipeline-azioni">
        {prossimi.map((prossimo) => (
          <button
            key={prossimo}
            type="button"
            className={`btn-small ${prossimo === 'perso' ? 'btn-ghost' : 'btn'}`}
            disabled={isPending || !puoOperare}
            onClick={() => vaiA(prossimo)}
          >
            {ETICHETTE_AZIONE[prossimo]}
          </button>
        ))}

        {eStatoFinale(stato) &&
          (eAmministratore ? (
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => esegui(() => riapriGestione(id))}
            >
              Riapri gestione
            </button>
          ) : (
            <span className="gestione-meta">Gestione chiusa: solo un amministratore può riaprirla.</span>
          ))}
      </div>

      {!puoOperare && (
        <p className="gestione-meta">
          Questo invito è in gestione a {assegnatoA}: puoi leggerlo, ma non cambiarne lo stato.
        </p>
      )}

      {chiedeMotivo && (
        <div className="pipeline-motivo-box">
          <label className="gestione-note-label" htmlFor={`motivo-${id}`}>
            Motivo della perdita (obbligatorio)
          </label>
          <input
            id={`motivo-${id}`}
            className="pipeline-motivo-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Es. non interessato, già socio altrove, prezzo…"
          />
          <div className="pipeline-azioni">
            <button
              type="button"
              className="btn btn-small"
              disabled={isPending || !motivo.trim()}
              onClick={() => vaiA('perso')}
            >
              Conferma perso
            </button>
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => {
                setChiedeMotivo(false)
                setMotivo('')
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {errore && <p className="gestione-errore">{errore}</p>}

      <label className="gestione-note-label" htmlFor={`note-invito-${id}`}>
        Note {!noteSalvata || !note.trim() ? '(obbligatoria per segnare vinto o perso)' : ''}
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
        placeholder="Cosa è stato fatto con questo invito…"
      />
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

      {eAmministratore && (
        <div className="pipeline-riassegna">
          <label className="gestione-note-label" htmlFor={`riassegna-${id}`}>
            Riassegna a (solo amministratori)
          </label>
          <div className="pipeline-azioni">
            <select
              id={`riassegna-${id}`}
              className="filter-select"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
            >
              <option value="">Scegli un operatore…</option>
              {staff.map((persona) => (
                <option key={persona.email} value={persona.email}>
                  {persona.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending || !destinatario}
              onClick={() => esegui(() => riassegna(id, destinatario))}
            >
              Riassegna
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
