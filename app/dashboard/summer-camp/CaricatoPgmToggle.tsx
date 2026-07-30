'use client'

import { ToggleConMeta } from '@/components/ToggleConMeta'
import { impostaCaricatoPgm } from './actions'

export function CaricatoPgmToggle({
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
      etichettaOff="Da caricare"
      etichettaOn="Caricato"
      onToggle={(nuovo) => impostaCaricatoPgm(id, nuovo)}
    />
  )
}
