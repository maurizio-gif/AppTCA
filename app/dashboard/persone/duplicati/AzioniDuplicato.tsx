'use client'

import { useState, useTransition } from 'react'
import { ignoraDuplicato, unisciPersone } from '../actions'

// Le due azioni su una coppia sospetta: unire (irreversibile, con conferma) o
// dire che sono persone diverse. Unire chiede sempre quale scheda resta,
// perche' e' quella che tiene i dati e l'id.
export function AzioniDuplicato({
  idA,
  idB,
  nomeA,
  nomeB,
  puoUnire,
}: {
  idA: string
  idB: string
  nomeA: string
  nomeB: string
  puoUnire: boolean
}) {
  const [conferma, setConferma] = useState<null | 'a' | 'b'>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function esegui(azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    setErrore(null)
    startTransition(async () => {
      const risultato = await azione()
      if (!risultato.ok) setErrore(risultato.errore)
      else setConferma(null)
    })
  }

  return (
    <div className="duplicato-azioni">
      {puoUnire ? (
        conferma ? (
          <>
            <span className="gestione-meta">
              Tengo <strong>{conferma === 'a' ? nomeA : nomeB}</strong> e ci sposto tutto il resto. L'altra scheda
              viene cancellata: non si torna indietro.
            </span>
            <button
              type="button"
              className="btn-danger btn-small"
              disabled={isPending}
              onClick={() =>
                esegui(() =>
                  conferma === 'a' ? unisciPersone(idA, idB) : unisciPersone(idB, idA)
                )
              }
            >
              Confermo, unisci
            </button>
            <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={() => setConferma(null)}>
              Annulla
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-small" disabled={isPending} onClick={() => setConferma('a')}>
              Unisci tenendo {nomeA}
            </button>
            <button type="button" className="btn btn-small" disabled={isPending} onClick={() => setConferma('b')}>
              Unisci tenendo {nomeB}
            </button>
          </>
        )
      ) : (
        <span className="gestione-meta">Solo un amministratore può unire due schede.</span>
      )}

      <button
        type="button"
        className="btn-ghost btn-small"
        disabled={isPending}
        onClick={() => esegui(() => ignoraDuplicato(idA, idB))}
      >
        Sono persone diverse
      </button>

      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
