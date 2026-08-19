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
  const giorno = giornoSelezionato ?? chiaveGiornoDa(new Date())

  if (!aperto) {
    return (
      <div className="agenda-nuovo">
        <button type="button" className="btn" onClick={() => setAperto(true)}>
          + Aggiungi in agenda
          {giornoSelezionato && ` (${new Date(`${giornoSelezionato}T00:00:00`).toLocaleDateString('it-IT')})`}
        </button>
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
        onFatto={() => setAperto(false)}
        onAnnulla={() => setAperto(false)}
      />
    </div>
  )
}
