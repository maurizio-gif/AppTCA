'use client'

import { useTransition } from 'react'
import { aggiornaStato } from './actions'

const STATI_VALIDI = ['nuovo', 'in_lavorazione', 'contattato', 'chiuso']

// Unico pezzo di JS spedito al browser in questa pagina: cattura il cambio
// di stato e richiama la Server Action. Nessuna chiave Supabase qui dentro,
// solo una chiamata RPC verso il server (Next.js la serializza da solo).
export function StatoSelect({ id, statoIniziale }: { id: string; statoIniziale: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      defaultValue={statoIniziale}
      disabled={isPending}
      onChange={(e) => {
        const nuovoStato = e.target.value
        startTransition(() => {
          aggiornaStato(id, nuovoStato)
        })
      }}
    >
      {STATI_VALIDI.map((stato) => (
        <option key={stato} value={stato}>
          {stato}
        </option>
      ))}
    </select>
  )
}
