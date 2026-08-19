'use client'

import { ToggleConMeta } from '@/components/ToggleConMeta'
import { impostaCreditoCaricato } from './actions'

// Toggle "Credito caricato SI/NO", stesso componente e stesso gesto del
// "Caricato su PerfectGym" di Scuola Tennis. Compare solo sui referral vinti:
// finche' e' su NO l'invito resta in evidenza nell'elenco.
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
    <ToggleConMeta
      attivo={caricato}
      attivoDa={caricatoDa}
      attivoIl={caricatoIl}
      etichettaOff="NO"
      etichettaOn="SI"
      onToggle={(nuovo) => impostaCreditoCaricato(id, nuovo)}
    />
  )
}
