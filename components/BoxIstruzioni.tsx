'use client'

import { useState } from 'react'

// Istruzioni d'uso pieghevoli, chiuse di default: stesso linguaggio del
// toggle "Mostra/Nascondi parametri tecnici" di ExpandableRow, qui
// generalizzato per un blocco di contenuto qualsiasi invece che per i
// campi tecnici di un record.
export function BoxIstruzioni({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const [aperto, setAperto] = useState(false)

  return (
    <div className="box-istruzioni">
      <button type="button" className="box-istruzioni-toggle" onClick={() => setAperto((a) => !a)}>
        {aperto ? '−' : '+'} {titolo}
      </button>
      {aperto && <div className="box-istruzioni-corpo">{children}</div>}
    </div>
  )
}
