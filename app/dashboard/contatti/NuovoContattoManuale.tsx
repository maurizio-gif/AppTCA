'use client'

import { useState } from 'react'
import { FormContattoManuale } from './FormContattoManuale'

// Pulsante "nuovo contatto telefonico" sopra la lista Enquiries: apre
// FormContattoManuale, si richiude da solo al salvataggio (stesso pattern di
// NuovoTask in app/dashboard/agenda).
export function NuovoContattoManuale() {
  const [aperto, setAperto] = useState(false)
  const [salvato, setSalvato] = useState(false)

  if (!aperto) {
    return (
      <div className="agenda-nuovo">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setSalvato(false)
            setAperto(true)
          }}
        >
          + Inserisci enquiry manuale
        </button>
        {salvato && <p className="gestione-meta">Contatto salvato: compare nell'elenco qui sotto.</p>}
      </div>
    )
  }

  return (
    <div className="agenda-nuovo">
      <h3 className="agenda-nuovo-titolo">Nuovo contatto arrivato per telefono</h3>
      <FormContattoManuale
        onFatto={() => {
          setSalvato(true)
          setAperto(false)
        }}
        onAnnulla={() => setAperto(false)}
      />
    </div>
  )
}
