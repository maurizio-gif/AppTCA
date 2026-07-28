'use client'

import { useState } from 'react'
import { contactHrefFor, formatValue, isUrl, prettifyKey, raggruppaDettagli } from '@/lib/format'

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
  const [tecniciAperti, setTecniciAperti] = useState(false)

  const dettagli = Object.entries(record).filter(([key]) => !hiddenKeys.includes(key))
  const gruppiDettagli = raggruppaDettagli(dettagli)
  const gruppiNormali = gruppiDettagli.filter((g) => !g.tecnico)
  const gruppiTecnici = gruppiDettagli.filter((g) => g.tecnico)

  return (
    <>
      <tr
        className={`row-clickable${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
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
              {gruppiNormali.map((gruppo) => (
                <GruppoDettaglio key={gruppo.titolo} titolo={gruppo.titolo} voci={gruppo.voci} />
              ))}

              {gruppiTecnici.length > 0 && (
                <div className="detail-group">
                  <button
                    type="button"
                    className="detail-tecnici-toggle"
                    onClick={(e) => {
                      e.stopPropagation()
                      setTecniciAperti((o) => !o)
                    }}
                  >
                    {tecniciAperti ? '▾' : '▸'} {tecniciAperti ? 'Nascondi' : 'Mostra'} parametri tecnici
                  </button>
                </div>
              )}
              {tecniciAperti &&
                gruppiTecnici.map((gruppo) => (
                  <GruppoDettaglio key={gruppo.titolo} titolo={gruppo.titolo} voci={gruppo.voci} />
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function GruppoDettaglio({ titolo, voci }: { titolo: string; voci: [string, unknown][] }) {
  return (
    <div className="detail-group">
      <div className="detail-group-title">{titolo}</div>
      <div className="detail-grid">
        {voci.map(([key, value]) => {
          const contactHref = contactHrefFor(key, value)
          return (
            <div key={key} className="detail-item">
              <span className="detail-label">{prettifyKey(key)}</span>
              <span className="detail-value">
                {isUrl(value) ? (
                  <a href={value} target="_blank" rel="noreferrer">
                    {value}
                  </a>
                ) : contactHref ? (
                  <a href={contactHref}>{formatValue(value)}</a>
                ) : (
                  formatValue(value)
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
