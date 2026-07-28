'use client'

import { useState } from 'react'
import { formatValue, isUrl, prettifyKey, raggruppaDettagli } from '@/lib/format'

// Riga di tabella cliccabile: mostra le colonne riassuntive e, se aperta,
// una riga sotto con TUTTI i campi del record (utile per i dati che non
// stanno nella tabella: UTM, consensi, campi jsonb, ecc.).
export function ExpandableRow({
  cells,
  columns,
  record,
  hiddenKeys = [],
  columnCount,
  extra,
  extraTitle = 'Gestione',
}: {
  cells: React.ReactNode[]
  // Etichette delle colonne (stesso ordine di `cells`): usate come
  // data-label sulle celle, cosi' su mobile la riga diventa una card con
  // "Etichetta: valore" invece di una tabella con scroll orizzontale.
  columns?: string[]
  record: Record<string, unknown>
  hiddenKeys?: string[]
  columnCount: number
  extra?: React.ReactNode
  extraTitle?: string
}) {
  const [open, setOpen] = useState(false)

  const dettagli = Object.entries(record).filter(([key]) => !hiddenKeys.includes(key))
  const gruppiDettagli = raggruppaDettagli(dettagli)

  return (
    <>
      <tr className="row-clickable" onClick={() => setOpen((o) => !o)}>
        <td className="expand-indicator">{open ? '▾' : '▸'}</td>
        {cells.map((cell, i) => (
          <td key={i} data-label={columns?.[i]}>{cell}</td>
        ))}
      </tr>
      {open && (
        <tr className="row-detail">
          <td colSpan={columnCount}>
            <div className="detail-groups">
              {extra && (
                <div className="detail-group">
                  <div className="detail-group-title">{extraTitle}</div>
                  {extra}
                </div>
              )}
              {gruppiDettagli.map((gruppo) => (
                <div key={gruppo.titolo} className="detail-group">
                  <div className="detail-group-title">{gruppo.titolo}</div>
                  <div className="detail-grid">
                    {gruppo.voci.map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <span className="detail-label">{prettifyKey(key)}</span>
                        <span className="detail-value">
                          {isUrl(value) ? (
                            <a href={value} target="_blank" rel="noreferrer">
                              {value}
                            </a>
                          ) : (
                            formatValue(value)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
