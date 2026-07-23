'use client'

import { useState } from 'react'
import { formatValue, prettifyKey } from '@/lib/format'

// Riga di tabella cliccabile: mostra le colonne riassuntive e, se aperta,
// una riga sotto con TUTTI i campi del record (utile per i dati che non
// stanno nella tabella: UTM, consensi, campi jsonb, ecc.).
export function ExpandableRow({
  cells,
  record,
  hiddenKeys = [],
  columnCount,
}: {
  cells: React.ReactNode[]
  record: Record<string, unknown>
  hiddenKeys?: string[]
  columnCount: number
}) {
  const [open, setOpen] = useState(false)

  const dettagli = Object.entries(record).filter(([key]) => !hiddenKeys.includes(key))

  return (
    <>
      <tr className="row-clickable" onClick={() => setOpen((o) => !o)}>
        <td className="expand-indicator">{open ? '▾' : '▸'}</td>
        {cells.map((cell, i) => (
          <td key={i}>{cell}</td>
        ))}
      </tr>
      {open && (
        <tr className="row-detail">
          <td colSpan={columnCount}>
            <div className="detail-grid">
              {dettagli.map(([key, value]) => (
                <div key={key} className="detail-item">
                  <span className="detail-label">{prettifyKey(key)}</span>
                  <span className="detail-value">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
