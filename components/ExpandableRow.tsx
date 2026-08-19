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
  consultazione,
  sections = [],
  extra,
  extraTitle = 'Gestione',
  evidenziata = false,
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
  // Contenuto libero mostrato per primo, prima di tutto il resto (es.
  // RichiestaEvidenza, VisiteContatto, VisitePagine): a differenza di
  // `sections`, si occupa da solo del proprio titolo/contenitore, quindi
  // viene reso cosi' com'e', senza un wrapper ".detail-group" attorno.
  evidenza?: React.ReactNode
  // Blocchi da consultare (le visite al sito, per esempio): stanno sotto il
  // pannello di gestione, perche' si guardano, non si usano.
  consultazione?: React.ReactNode
  // Sezioni su misura (es. "Richiesta") mostrate dopo evidenza, prima di
  // "Gestione" e dei gruppi generici ricavati dal record.
  sections?: { title: string; content: React.ReactNode }[]
  extra?: React.ReactNode
  extraTitle?: string
  // Riga che richiede ancora un'azione e non deve passare inosservata (es. un
  // referral vinto col credito da caricare): sfondo e bordo di richiamo.
  evidenziata?: boolean
}) {
  const gruppo = useContext(AccordionContext)
  const [openLocale, setOpenLocale] = useState(false)
  const [tecniciAperti, setTecniciAperti] = useState(false)
  const [datiAperti, setDatiAperti] = useState(false)

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
        className={`row-clickable${open ? ' is-open' : ''}${evidenziata ? ' riga-evidenza' : ''}`}
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
              {/* Cosa ha chiesto la persona: due righe di contesto, prima di
                  tutto il resto. */}
              {evidenza}

              {/* Il pannello di gestione e' la ragione per cui si apre una
                  riga: sta in un contenitore staccato e in evidenza, insieme a
                  tutto cio' su cui si agisce (l'agenda, per esempio). I dati da
                  consultare stanno sotto, chiusi. */}
              {(extra || sections.length > 0) && (
                <div className="pannello-gestione">
                  {extra && (
                    <div className="pannello-gestione-blocco">
                      <div className="pannello-gestione-titolo">{extraTitle}</div>
                      {extra}
                    </div>
                  )}
                  {sections.map(({ title, content }) => (
                    <div className="pannello-gestione-blocco" key={title}>
                      <div className="pannello-gestione-titolo">{title}</div>
                      {content}
                    </div>
                  ))}
                </div>
              )}

              {consultazione}

              {/* Consultazione: chiusa per default, cosi' la gestione non
                  finisce annegata in venti campi che si guardano di rado. */}
              {dettagli.length > 0 && (
                <div className="detail-group">
                  <button
                    type="button"
                    className="detail-tecnici-toggle"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDatiAperti((o) => !o)
                    }}
                  >
                    {datiAperti ? '−' : '+'} {datiAperti ? 'Nascondi' : 'Mostra'} i dati della richiesta (
                    {dettagli.length})
                  </button>
                </div>
              )}

              {datiAperti && (
                <>
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
                </>
              )}
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
      <GrigliaDettagli voci={voci} />
    </div>
  )
}

// Stessa griglia etichetta/valore usata dai gruppi automatici, ma
// riutilizzabile dall'esterno per una `section` su misura (es. i dati del
// record collegato in Controllo Operatori): senza, quella sezione avrebbe
// un aspetto diverso dal resto del pannello aperto.
export function GrigliaDettagli({ voci }: { voci: [string, unknown][] }) {
  return (
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
  )
}
