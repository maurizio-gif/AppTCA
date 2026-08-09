'use client'

import { useState, useTransition } from 'react'
import { SEZIONI, type SezioneChiave } from '@/lib/auth/sezioni'
import { impostaSezioni } from './actions'

export function SezioniToggle({
  email,
  sezioniAttive,
}: {
  email: string
  sezioniAttive: string[]
}) {
  const [attive, setAttive] = useState<string[]>(sezioniAttive)
  const [isPending, startTransition] = useTransition()

  function toggla(chiave: SezioneChiave) {
    const prossime = attive.includes(chiave)
      ? attive.filter((c) => c !== chiave)
      : [...attive, chiave]

    setAttive(prossime)
    startTransition(async () => {
      const risultato = await impostaSezioni(email, prossime)
      if (!risultato.ok) {
        setAttive(attive)
        alert(risultato.errore)
      }
    })
  }

  return (
    <div className="sezioni-toggle">
      {SEZIONI.map((s) => (
        <label key={s.chiave} className="sezioni-toggle-item">
          <input
            type="checkbox"
            checked={attive.includes(s.chiave)}
            disabled={isPending}
            onChange={() => toggla(s.chiave)}
          />
          {s.label}
        </label>
      ))}
    </div>
  )
}
