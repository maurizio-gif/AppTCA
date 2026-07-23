'use client'

import { useState, useTransition } from 'react'
import { aggiornaStato } from './actions'

const STATI_VALIDI = ['nuovo', 'in_lavorazione', 'contattato', 'chiuso']

// Unico pezzo di JS spedito al browser in questa pagina: cattura il cambio
// di stato e richiama la Server Action. Nessuna chiave Supabase qui dentro,
// solo una chiamata RPC verso il server (Next.js la serializza da solo).
export function StatoSelect({ id, statoIniziale }: { id: string; statoIniziale: string }) {
  const [stato, setStato] = useState(statoIniziale)
  const [isPending, startTransition] = useTransition()

  return (
    // stopPropagation: la riga della tabella e' cliccabile per espandersi,
    // non vogliamo che aprire questo select la faccia anche espandere/chiudere.
    <span onClick={(e) => e.stopPropagation()}>
      <select
        className="stato-select"
        data-stato={stato}
        value={stato}
        disabled={isPending}
        onChange={(e) => {
          const nuovoStato = e.target.value
          setStato(nuovoStato)
          startTransition(() => {
            aggiornaStato(id, nuovoStato)
          })
        }}
      >
        {STATI_VALIDI.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </span>
  )
}
