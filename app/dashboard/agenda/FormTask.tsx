'use client'

import { useEffect, useState, useTransition } from 'react'
import { DURATA_PREDEFINITA, OPZIONI_TIPO, eTipoValido, type TipoVoce } from '@/lib/agenda'
import { PersonaPicker } from '../persone/PersonaPicker'
import { richiestePersona, type PersonaTrovata, type RichiestaPersona } from '../persone/ricerca-actions'
import { creaTask } from './actions'

// Form di creazione di una voce d'agenda, condiviso da chi lo apre dal
// calendario (NuovoTask) e da chi lo apre dentro la riga di un record
// (TaskEntita): stessi campi e stesse regole in un posto solo.
//
// L'ordine dei campi segue il modo in cui si ragiona al telefono: prima CON CHI
// (la persona), poi SU COSA (quale delle sue richieste, dalla piu' recente), e
// solo dopo il quando e il cosa fare. Scegliendo la richiesta il task si
// aggancia da solo anche all'opportunita' di quella richiesta.
export function FormTask({
  staff,
  emailCorrente,
  dataProposta,
  collegamentoFisso,
  personaFissa,
  titoloIniziale = '',
  onFatto,
  onAnnulla,
}: {
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
  // Giorno proposto (es. quello selezionato nel calendario): resta
  // modificabile, e se cambia il form lo segue di nuovo.
  dataProposta: string
  // Collegamento gia' deciso da chi apre il form (task creato dalla riga di
  // un invito, di un contatto…): in quel caso non si chiede niente, persona e
  // opportunita' li ricava il server da quella richiesta.
  collegamentoFisso?: { valore: string; etichetta: string }
  // Persona gia' decisa (form aperto dalla sua scheda): non si cerca, ma le
  // sue richieste si possono comunque collegare.
  personaFissa?: { id: string; nome: string; opportunitaId: string | null }
  titoloIniziale?: string
  // Riceve se il salvataggio si e' chiuso da solo (vedi
  // eEventoDaCompletareInAutomatico): chi apre il form decide se e come
  // dirlo, perche' di solito lo richiude subito dopo.
  onFatto?: (completatoSubito?: boolean) => void
  onAnnulla?: () => void
}) {
  const [tipo, setTipo] = useState<TipoVoce>('task')
  const [titolo, setTitolo] = useState(titoloIniziale)
  const [dataManuale, setDataManuale] = useState<string | null>(null)
  const [ora, setOra] = useState('')
  const [durataManuale, setDurataManuale] = useState<number | null>(null)
  const [assegnatoA, setAssegnatoA] = useState(emailCorrente ?? staff[0]?.email ?? '')
  const [note, setNote] = useState('')
  const [persona, setPersona] = useState<PersonaTrovata | null>(null)
  const [opportunitaId, setOpportunitaId] = useState('')
  const [richieste, setRichieste] = useState<RichiestaPersona[]>([])
  const [richiestaScelta, setRichiestaScelta] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const personaId = personaFissa?.id ?? persona?.id ?? null

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

  // Le richieste della persona scelta, dalla piu' recente. Non si caricano
  // quando il collegamento e' gia' deciso da chi ha aperto il form.
  useEffect(() => {
    if (collegamentoFisso || !personaId) {
      setRichieste([])
      setRichiestaScelta('')
      return
    }

    let annullato = false
    startTransition(async () => {
      const trovate = await richiestePersona(personaId)
      if (!annullato) {
        setRichieste(trovate)
        setRichiestaScelta('')
      }
    })

    return () => {
      annullato = true
    }
    // Dipendenza sul valore e non sull'oggetto: chi ci passa collegamentoFisso
    // lo costruisce inline, e un oggetto nuovo a ogni render rifarebbe il giro.
  }, [personaId, collegamentoFisso?.valore])

  const data = dataManuale ?? dataProposta
  const durata = durataManuale ?? DURATA_PREDEFINITA[tipo]

  // L'opportunita': quella della richiesta scelta se c'e', altrimenti quella
  // aperta della persona (una sola per volta, vedi la tabella opportunita).
  function leadDaCollegare(): string | null {
    if (richiestaScelta) {
      return richieste.find((r) => r.chiave === richiestaScelta)?.opportunitaId ?? null
    }
    return personaFissa?.opportunitaId ?? opportunitaId ?? null
  }

  return (
    <div className="login-card agenda-form">
      {errore && <p className="error-banner">{errore}</p>}

      {collegamentoFisso ? (
        <p className="agenda-collegamento">
          Collegato a: {collegamentoFisso.etichetta} — persona e opportunità vengono prese da questa richiesta.
        </p>
      ) : (
        <>
          {personaFissa ? (
            <p className="agenda-collegamento">Persona: {personaFissa.nome}</p>
          ) : (
            <PersonaPicker
              persona={persona}
              onScegli={(scelta) => {
                setPersona(scelta)
                // Una persona ha di norma una sola opportunita' aperta: se
                // c'e' la scegliamo noi, l'operatore non deve fare nulla.
                setOpportunitaId(scelta?.opportunita[0]?.id ?? '')
              }}
            />
          )}

          {personaId &&
            (richieste.length > 0 ? (
              <div className="field">
                <label htmlFor="task-richiesta">Richiesta a cui collegarlo</label>
                <select
                  id="task-richiesta"
                  className="filter-select"
                  value={richiestaScelta}
                  onChange={(e) => setRichiestaScelta(e.target.value)}
                >
                  <option value="">Nessuna richiesta in particolare</option>
                  {richieste.map((richiesta) => (
                    <option key={richiesta.chiave} value={richiesta.chiave}>
                      {richiesta.etichetta}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              !isPending && (
                <p className="agenda-collegamento">
                  Questa persona non ha richieste da collegare: il task resta sulla persona.
                </p>
              )
            ))}
        </>
      )}

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
            {staff.map((membro) => (
              <option key={membro.email} value={membro.email}>
                {membro.nome}
                {membro.email.toLowerCase() === (emailCorrente ?? '') ? ' (io)' : ''}
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
            const collegamento = collegamentoFisso?.valore ?? richiestaScelta
            const [entita, entitaId] = collegamento ? collegamento.split(':') : [null, null]
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
                personaId,
                opportunitaId: leadDaCollegare(),
              })
              if (risultato.ok) {
                setTitolo(titoloIniziale)
                setNote('')
                setOra('')
                setRichiestaScelta('')
                onFatto?.(risultato.completatoSubito)
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
