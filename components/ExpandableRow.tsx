'use client'

import { createContext, useContext, useState } from 'react'
import { contactHrefFor, formatValue, isUrl, prettifyKey, raggruppaDettagli } from '@/lib/format'

// Coordina le ExpandableRow di una stessa tabella: tiene l'id della riga
// aperta, cosi' aprirne una chiude automaticamente le altre. Senza questo
// provider intorno alla tabella, ogni riga si apre/chiude per conto suo
// (fallback qui sotto in ExpandableRow).
const AccordionContext = createContext<{
  openId: string | null
  setOpenId: (id: string | null) => void
} | null>(null)

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return <AccordionContext.Provider value={{ openId, setOpenId }}>{children}</AccordionContext.Provider>
}

// Riga di tabella cliccabile: mostra le colonne riassuntive e, se aperta,
// una riga sotto con TUTTI i campi del record (utile per i dati che non
// stanno nella tabella: UTM, consensi, campi jsonb, ecc.).
export function ExpandableRow({
  id,
  cells,
  columns,
  record,
  hiddenKeys = [],
  columnCount,
  evidenza,
  extra,
  extraTitle = 'Gestione',
}: {
  // Identificativo univoco della riga nella tabella (es. l'id del record):
  // serve al gruppo di accordion per sapere quale riga tenere aperta.
  id: string
  cells: React.ReactNode[]
  // Etichette delle colonne (stesso ordine di `cells`): usate come
  // data-label sulle celle, cosi' su mobile la riga diventa una card con
  // "Etichetta: valore" invece di una tabella con scroll orizzontale.
  columns?: string[]
  record: Record<string, unknown>
  hiddenKeys?: string[]
  columnCount: number
  // Contenuto in evidenza mostrato per primo, a tutta larghezza e senza il
  // riquadro/titolo dei gruppi generici: per testo libero (es. il motivo
  // della richiesta) che nella griglia stretta dei dettagli andrebbe a capo
  // parola per parola invece di leggersi come un paragrafo normale.
  evidenza?: React.ReactNode
  extra?: React.ReactNode
  extraTitle?: string
}) {
  const gruppo = useContext(AccordionContext)
  const [openLocale, setOpenLocale] = useState(false)
  const [tecniciAperti, setTecniciAperti] = useState(false)

  const open = gruppo ? gruppo.openId === id : openLocale
  const alternaOpen = () => {
    if (gruppo) {
      gruppo.setOpenId(open ? null : id)
    } else {
      setOpenLocale((o) => !o)
    }
  }

  const dettagli = Object.entries(record).filter(([key]) => !hiddenKeys.includes(key))
  const gruppiDettagli = raggruppaDettagli(dettagli)
  const gruppiNormali = gruppiDettagli.filter((g) => !g.tecnico)
  const gruppiTecnici = gruppiDettagli.filter((g) => g.tecnico)

  return (
    <>
      <tr
        className={`row-clickable${open ? ' is-open' : ''}`}
        onClick={alternaOpen}
      >
        <td className="expand-indicator">{open ? '−' : '+'}</td>
        {cells.map((cell, i) => (
          <td key={i} data-label={columns?.[i]}>{cell}</td>
        ))}
      </tr>
      {open && (
        <tr className="row-detail">
          <td colSpan={columnCount}>
            <div className="detail-groups">
              {evidenza}
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
                    {tecniciAperti ? '−' : '+'} {tecniciAperti ? 'Nascondi' : 'Mostra'} parametri tecnici
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
