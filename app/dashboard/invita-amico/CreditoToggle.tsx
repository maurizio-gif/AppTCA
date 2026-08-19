'use client'

import { ToggleConMeta } from '@/components/ToggleConMeta'
import { impostaCreditoCaricato } from './actions'

// Toggle "Credito caricato SI/NO", stesso componente e stesso gesto del
// "Caricato su PerfectGym" di Scuola Tennis. Vive dentro il pannello della
// pipeline, subito sotto i pulsanti di stato (vedi la prop dopoAzioni di
// PannelloPipeline): compare solo quando il lead e' vinto, cioe' proprio dove
// era il pulsante "Segna vinto" appena premuto. Finche' e' su NO l'invito
// resta in evidenza nell'elenco.
export function CreditoToggle({
  id,
  caricato,
  caricatoDa,
  caricatoIl,
}: {
  id: string
  caricato: boolean
  caricatoDa: string | null
  caricatoIl: string | null
}) {
  return (
    <div className="pipeline-credito">
      <span className="gestione-note-label">Credito caricato</span>
      <ToggleConMeta
        attivo={caricato}
        attivoDa={caricatoDa}
        attivoIl={caricatoIl}
        etichettaOff="NO"
        etichettaOn="SI"
        onToggle={(nuovo) => impostaCreditoCaricato(id, nuovo)}
      />
    </div>
  )
}
