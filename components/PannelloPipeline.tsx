'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { PipelineBadge } from '@/components/PipelineBadge'
import {
  ETICHETTE_AZIONE,
  normalizzaStato,
  ETICHETTE_STATO,
  PASSI_AVANZAMENTO as PASSI,
  TRANSIZIONI,
  eStatoFinale,
  type StatoPipeline,
} from '@/lib/pipeline'
import { cambiaStato, prendiInGestione, riapriGestione, riassegna } from '@/app/dashboard/opportunita/actions'

// Avanzamento come fila di pallini numerati con l'etichetta sotto: quelli
// fatti spuntati, quello attuale in evidenza, i prossimi spenti. Un'opportunita'
// persa non ha un "punto" nella fila (puo' uscire da "in gestione" o da
// "vinta"), quindi mostriamo la sola presa in carico e l'uscita: e' la verita'
// che conosciamo, non una posizione inventata.
// Uno stato storico potrebbe non essere piu' fra quelli previsti (e' successo
// con "credito caricato", diventato un toggle): si mostra comunque, con
// l'etichetta di oggi quando la conosciamo.
function etichettaStato(valore: string): string {
  return ETICHETTE_STATO[normalizzaStato(valore)] ?? valore
}

function Stepper({ stato }: { stato: StatoPipeline }) {
  if (stato === 'perso') {
    return (
      <ol className="pipeline-track perso">
        <li className="pipeline-nodo-wrap fatto">
          <span className="pipeline-nodo">✓</span>
          <span className="pipeline-etichetta">Preso in carico</span>
        </li>
        <li className="pipeline-nodo-wrap uscita">
          <span className="pipeline-nodo">✕</span>
          <span className="pipeline-etichetta">{ETICHETTE_STATO.perso}</span>
        </li>
      </ol>
    )
  }

  const indiceAttuale = PASSI.indexOf(stato)

  return (
    <ol className="pipeline-track">
      {PASSI.map((passo, i) => {
        const fatto = i < indiceAttuale || (i === indiceAttuale && eStatoFinale(stato))
        const classi = ['pipeline-nodo-wrap']
        if (fatto) classi.push('fatto')
        if (i === indiceAttuale) classi.push('attuale')

        return (
          <li className={classi.join(' ')} key={passo}>
            <span className="pipeline-nodo">{fatto ? '✓' : i + 1}</span>
            <span className="pipeline-etichetta">{ETICHETTE_STATO[passo]}</span>
          </li>
        )
      })}
    </ol>
  )
}

// Pannello di gestione di un'opportunita': al posto del vecchio toggle "Da
// gestire/Gestito" ci sono gli stati di lib/pipeline.ts. Chi la prende in
// carico ne diventa il titolare e da quel momento solo lui - o un
// amministratore - la fa avanzare; i controlli veri stanno comunque nelle
// Server Action, qui evitiamo solo giri di rete inutili.
//
// L'opportunita' e' della PERSONA, non della singola richiesta: lo stesso
// pannello serve quindi ogni sezione che ne mostra una (Enquiries e Invita un
// amico).
export function PannelloPipeline({
  id,
  stato,
  assegnatoA,
  assegnatoIl,
  statoIl,
  motivoPerso,
  emailCorrente,
  eAmministratore,
  puoRiassegnareLead = false,
  staff,
  storico = [],
  dopoAzioni,
}: {
  id: string
  stato: StatoPipeline
  assegnatoA: string | null
  assegnatoIl: string | null
  statoIl: string | null
  motivoPerso: string | null
  emailCorrente: string | null
  eAmministratore: boolean
  // Permesso di riassegnazione (staff_users.puo_riassegnare): serve
  // solo per le opportunita' di qualcun altro, la propria si passa sempre.
  puoRiassegnareLead?: boolean
  staff: { email: string; nome: string }[]
  // Passaggi di stato in ordine di data (dal piu' recente): li scrive un
  // trigger sul database, vedi opportunita_storico.
  storico?: { stato: string; statoPrecedente: string | null; cambiatoDa: string | null; cambiatoIl: string }[]
  // Adempimento specifico della sezione, reso subito sotto i pulsanti di
  // stato: e' il caso del credito referral (vedi CreditoToggle), che si legge
  // dove un attimo prima c'era il pulsante "Segna vinto" che lo rende
  // necessario. La pipeline non sa cosa sia, lo ospita e basta.
  dopoAzioni?: React.ReactNode
}) {
  const [errore, setErrore] = useState<string | null>(null)
  const [destinatario, setDestinatario] = useState('')
  const [riassegnaAperta, setRiassegnaAperta] = useState(false)
  const [storicoAperto, setStoricoAperto] = useState(false)
  // Quale azione sta girando: una Server Action che rinfresca la pagina puo'
  // metterci un secondo, e senza un segnale il pulsante sembra non aver fatto
  // niente (e si finisce per ricliccarlo).
  const [inCorso, setInCorso] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const mio = !!assegnatoA && !!emailCorrente && assegnatoA.toLowerCase() === emailCorrente.toLowerCase()
  const puoOperare = stato === 'nuovo' ? true : mio || eAmministratore
  const prossimi = TRANSIZIONI[stato]

  function esegui(quale: string, azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    setInCorso(quale)
    startTransition(async () => {
      const risultato = await azione()
      setInCorso(null)
      if (!risultato.ok) setErrore(risultato.errore)
      else setRiassegnaAperta(false)
    })
  }

  function vaiA(nuovo: StatoPipeline) {
    // La presa in carico ha un'azione a se': e' l'unico passaggio che puo'
    // fare chiunque, ed e' quello che assegna l'opportunita' (vedi actions.ts).
    if (stato === 'nuovo' && nuovo === 'in_gestione') {
      esegui(nuovo, () => prendiInGestione(id))
      return
    }

    esegui(nuovo, () => cambiaStato(id, nuovo))
  }

  return (
    // stopPropagation: la riga e' cliccabile per aprire/chiudere
    // l'accordion, non vogliamo che interagire coi controlli la richiuda.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      <Stepper stato={stato} />

      <div className="pipeline-meta">
        <PipelineBadge stato={stato} />
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
            {inCorso === prossimo ? 'Un momento…' : ETICHETTE_AZIONE[prossimo]}
          </button>
        ))}

        {eStatoFinale(stato) &&
          (eAmministratore ? (
            <button
              type="button"
              className="btn-ghost btn-small"
              disabled={isPending}
              onClick={() => esegui('riapri', () => riapriGestione(id))}
            >
              {inCorso === 'riapri' ? 'Riapro…' : 'Riapri gestione'}
            </button>
          ) : (
            <span className="gestione-meta">Chiusa: solo un amministratore può riaprirla.</span>
          ))}
      </div>

      {dopoAzioni}

      {!puoOperare && (
        <p className="gestione-meta">
          Questa opportunità è in gestione a {assegnatoA}: puoi vederla, ma non cambiarne lo stato.
        </p>
      )}

      {errore && <p className="gestione-errore">{errore}</p>}

      {/* Quando e' cambiato cosa: chiuso, perche' serve quando qualcuno chiede
          "chi l'ha presa e quando", non ogni volta che si apre la riga. */}
      {storico.length > 0 && (
        <div className="pipeline-storico">
          {storicoAperto ? (
            <>
              <button
                type="button"
                className="pipeline-riassegna-apri"
                onClick={() => setStoricoAperto(false)}
              >
                − Nascondi lo storico
              </button>
              <ol className="pipeline-storico-elenco">
                {storico.map((voce, i) => (
                  <li key={`${voce.cambiatoIl}-${i}`}>
                    <span className="pipeline-storico-quando">{formatDateOra(voce.cambiatoIl)}</span>
                    <span>
                      {voce.statoPrecedente
                        ? `${etichettaStato(voce.statoPrecedente)} → ${etichettaStato(voce.stato)}`
                        : etichettaStato(voce.stato)}
                    </span>
                    {voce.cambiatoDa && <span className="muted">{voce.cambiatoDa}</span>}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <button type="button" className="pipeline-riassegna-apri" onClick={() => setStoricoAperto(true)}>
              + Storico dei passaggi ({storico.length})
            </button>
          )}
        </div>
      )}

      {/* Passaggio di mano: in fondo e chiuso, perche' e' l'eccezione e non il
          lavoro di ogni giorno. Lo vede chi l'ha in mano e chi ha il permesso
          "Puo' riassegnare le opportunita'" (Gestione utenti); per gli altri non c'e'
          nulla da mostrare. */}
      {(mio || puoRiassegnareLead) && (
        <div className="pipeline-riassegna">
          {riassegnaAperta ? (
            <>
              <label className="gestione-note-label" htmlFor={`riassegna-${id}`}>
                Passa l'opportunità a
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
                  className="btn btn-small"
                  disabled={isPending || !destinatario}
                  onClick={() => esegui('riassegna', () => riassegna(id, destinatario))}
                >
                  {inCorso === 'riassegna' ? 'Un momento…' : 'Conferma'}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-small"
                  disabled={isPending}
                  onClick={() => {
                    setRiassegnaAperta(false)
                    setDestinatario('')
                  }}
                >
                  Annulla
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="pipeline-riassegna-apri"
              disabled={isPending}
              onClick={() => setRiassegnaAperta(true)}
            >
              + Passa a un altro operatore
            </button>
          )}
        </div>
      )}
    </div>
  )
}
