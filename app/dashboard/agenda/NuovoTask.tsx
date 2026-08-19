'use client'

import { useState } from 'react'
import { useGiornoSelezionato } from '@/components/CalendarioAgenda'
import { chiaveGiornoDa } from '@/lib/agenda'
import { FormTask } from './FormTask'

// Pulsante "aggiungi" sotto il calendario: apre FormTask sul giorno
// selezionato (clicchi il 12, il form propone il 12), o su oggi se non ne e'
// stato selezionato nessuno.
export function NuovoTask({
  staff,
  emailCorrente,
}: {
  staff: { email: string; nome: string }[]
  emailCorrente: string | null
}) {
  const giornoSelezionato = useGiornoSelezionato()
  const [aperto, setAperto] = useState(false)
  // Il form si richiude subito dopo il salvataggio: se l'evento era per un
  // momento gia' passato (o nei prossimi 30 minuti) ed e' quindi nato gia'
  // completato, lo si dice qui, dove il pulsante torna visibile.
  const [completatoInAutomatico, setCompletatoInAutomatico] = useState(false)
  const giorno = giornoSelezionato ?? chiaveGiornoDa(new Date())

  if (!aperto) {
    return (
      <div className="agenda-nuovo">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setCompletatoInAutomatico(false)
            setAperto(true)
          }}
        >
          + Aggiungi in agenda
          {giornoSelezionato && ` (${new Date(`${giornoSelezionato}T00:00:00`).toLocaleDateString('it-IT')})`}
        </button>
        {completatoInAutomatico && (
          <p className="gestione-meta">
            Era per un momento già passato (o nei prossimi 30 minuti): salvata già come completata.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="agenda-nuovo">
      <h3 className="agenda-nuovo-titolo">Nuovo in agenda</h3>
      <FormTask
        staff={staff}
        emailCorrente={emailCorrente}
        dataProposta={giorno}
        onFatto={(completatoSubito) => {
          setCompletatoInAutomatico(!!completatoSubito)
          setAperto(false)
        }}
        onAnnulla={() => setAperto(false)}
      />
    </div>
  )
}
