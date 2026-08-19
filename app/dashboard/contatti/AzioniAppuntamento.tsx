'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { ETICHETTE_STATO_TASK } from '@/lib/agenda'
import { completaAppuntamento, riapriAppuntamento } from './actions'

// Chiusura dell'appuntamento che il cliente ha prenotato dal sito: e' avvenuto
// o no, e com'e' andato. Non e' lo stato della trattativa - quello sta nella
// pipeline sopra e puo' restare aperto per settimane dopo la visita: qui si
// dice soltanto che quell'incontro non e' piu' lavoro da fare, ed e' cio' che
// in agenda lo porta da rosso a verde.
//
// Lo puo' fare chiunque veda la sezione, anche se l'opportunita' e' di una
// collega: chi era in sede quando il cliente e' arrivato deve poter scrivere
// com'e' andata. Chi l'ha chiuso resta scritto qui e nel registro operatori.
//
// Stessa forma e stesse etichette del pannello di un task (vedi
// agenda/AzioniTask): in agenda un appuntamento dal sito e un task sono la
// stessa cosa, un impegno che si chiude.
export function AzioniAppuntamento({
  id,
  completatoIl,
  completatoDa,
  esito,
}: {
  id: string
  completatoIl: string | null
  completatoDa: string | null
  esito: string | null
}) {
  const [esitoNuovo, setEsitoNuovo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const completato = !!completatoIl

  function esegui(quale: string, azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    setInCorso(quale)
    startTransition(async () => {
      const risultato = await azione()
      setInCorso(null)
      if (!risultato.ok) setErrore(risultato.errore)
    })
  }

  return (
    <div className="pipeline-appuntamento">
      <h4 className="pipeline-agenda-titolo">Questo appuntamento</h4>

      <div className="pipeline-meta">
        <span className={`richiesta-badge ${completato ? 'richiesta-verde' : 'richiesta-neutro'}`}>
          {completato ? ETICHETTE_STATO_TASK.completato : ETICHETTE_STATO_TASK.aperto}
        </span>
        {completatoIl && (
          <span className="gestione-meta">
            fatto il {formatDateOra(completatoIl)}
            {completatoDa && ` · ${completatoDa}`}
          </span>
        )}
      </div>

      {esito && <p className="pipeline-motivo">Com’è andata: {esito}</p>}

      {errore && <p className="gestione-errore">{errore}</p>}

      {completato ? (
        <div className="pipeline-azioni">
          <button
            type="button"
            className="btn-ghost btn-small"
            disabled={isPending}
            onClick={() => esegui('riapri', () => riapriAppuntamento(id))}
          >
            {inCorso === 'riapri' ? 'Un momento…' : 'Non è ancora avvenuto'}
          </button>
        </div>
      ) : (
        <>
          <label className="gestione-note-label" htmlFor={`esito-appuntamento-${id}`}>
            Com’è andata (facoltativo, si salva segnandolo come fatto)
          </label>
          <input
            id={`esito-appuntamento-${id}`}
            className="pipeline-motivo-input"
            value={esitoNuovo}
            onChange={(e) => setEsitoNuovo(e.target.value)}
            placeholder="Es. venuto in sede, fissata prova venerdì"
          />
          <div className="pipeline-azioni">
            <button
              type="button"
              className="btn btn-small"
              disabled={isPending}
              onClick={() => esegui('completa', () => completaAppuntamento(id, esitoNuovo))}
            >
              {inCorso === 'completa' ? 'Un momento…' : 'Segna come fatto'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
