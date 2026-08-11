'use client'

import { useState, useTransition } from 'react'
import { eliminaTurno, modificaTurno } from './actions'

// Riga della tabella turni con, sotto, il pannello di correzione manuale.
// I testi delle celle arrivano gia' formattati dal server (stesso fuso e
// stesso locale del resto del report): qui non si riformatta nulla, cosi'
// non puo' capitare che la stessa ora si legga diversa a seconda del fuso
// del browser di chi guarda.
export function RigaTurno({
  idEntrata,
  idUscita,
  dataTesto,
  operatoreTesto,
  entrataTesto,
  uscitaTesto,
  durataTesto,
  entrataLocale,
  uscitaLocale,
  puoCancellare,
  colonne,
}: {
  idEntrata: number
  idUscita: number | null
  dataTesto: string
  operatoreTesto: string
  entrataTesto: string
  uscitaTesto: string
  durataTesto: string
  entrataLocale: string
  uscitaLocale: string | null
  puoCancellare: boolean
  colonne: number
}) {
  const [aperta, setAperta] = useState(false)
  const [entrata, setEntrata] = useState(entrataLocale)
  const [uscita, setUscita] = useState(uscitaLocale ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Riallinea i campi ai valori attuali ad ogni apertura: dopo un
  // salvataggio la riga si ricarica dal server, ma lo stato locale del
  // form resterebbe fermo all'ultimo valore digitato.
  function apri() {
    setEntrata(entrataLocale)
    setUscita(uscitaLocale ?? '')
    setErrore(null)
    setAperta(true)
  }

  function salva() {
    setErrore(null)
    startTransition(async () => {
      const risultato = await modificaTurno(idEntrata, idUscita, entrata, idUscita !== null ? uscita : null)
      if (risultato.ok) setAperta(false)
      else setErrore(risultato.errore)
    })
  }

  function elimina() {
    const confermato = confirm(
      `Vuoi cancellare definitivamente questo turno (${dataTesto}, ${operatoreTesto})? L'operazione è irreversibile e rimuove sia l'entrata sia l'uscita.`
    )
    if (!confermato) return

    setErrore(null)
    startTransition(async () => {
      const risultato = await eliminaTurno(idEntrata, idUscita)
      if (!risultato.ok) setErrore(risultato.errore)
    })
  }

  return (
    <>
      <tr className={aperta ? 'is-in-modifica' : undefined}>
        <td data-label="Data">{dataTesto}</td>
        <td data-label="Operatore">{operatoreTesto}</td>
        <td data-label="Entrata">{entrataTesto}</td>
        <td data-label="Uscita">{uscitaTesto}</td>
        <td data-label="Durata">{durataTesto}</td>
        <td data-label="" className="timbrature-azioni-cella">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => (aperta ? setAperta(false) : apri())}
            aria-expanded={aperta}
          >
            {aperta ? 'Chiudi' : 'Modifica'}
          </button>
        </td>
      </tr>

      {aperta && (
        <tr className="row-detail">
          <td colSpan={colonne}>
            <div className="timbrature-modifica">
              <div className="timbrature-modifica-campi">
                <label className="timbrature-campo">
                  <span>Entrata</span>
                  <input
                    type="datetime-local"
                    value={entrata}
                    onChange={(e) => setEntrata(e.target.value)}
                    disabled={isPending}
                  />
                </label>
                {idUscita !== null ? (
                  <label className="timbrature-campo">
                    <span>Uscita</span>
                    <input
                      type="datetime-local"
                      value={uscita}
                      onChange={(e) => setUscita(e.target.value)}
                      disabled={isPending}
                    />
                  </label>
                ) : (
                  <p className="muted timbrature-modifica-nota">
                    Turno ancora in corso: l'uscita non è mai stata timbrata, quindi qui si può correggere solo
                    l'entrata (oppure cancellare il turno).
                  </p>
                )}
              </div>

              <div className="timbrature-modifica-azioni">
                <button type="button" className="btn btn-small" onClick={salva} disabled={isPending}>
                  {isPending ? 'Salvataggio…' : 'Salva'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setAperta(false)}
                  disabled={isPending}
                >
                  Annulla
                </button>
                {puoCancellare && (
                  <button
                    type="button"
                    className="btn btn-danger btn-small timbrature-modifica-elimina"
                    onClick={elimina}
                    disabled={isPending}
                  >
                    Cancella turno
                  </button>
                )}
              </div>

              {errore && <p className="gestione-errore">{errore}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
