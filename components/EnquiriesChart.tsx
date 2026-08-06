'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDataConGiorno } from '@/lib/format'

type PuntoGiorno = { data: string; adulti: number; junior: number; altro: number }

const LARGHEZZA_COLONNA = 52
const ALTEZZA_BARRA = 140

type Attivo = { indice: number; x: number; y: number }

// Grafico a barre impilate (Adulti/Junior, + Altro se presente) con un
// giorno per colonna, larghezza fissa per colonna: su schermi stretti si
// vedono di conseguenza poche colonne per volta ma grandi, su schermi larghi
// di piu' - stessa logica, nessun breakpoint dedicato. La corsia scorre
// lateralmente dal primo giorno con enquiry (a sinistra) a oggi (a destra,
// posizione iniziale) anche per centinaia di giorni, senza paginazione.
export function EnquiriesChart({
  giorni,
  hrefGiorno,
}: {
  giorni: PuntoGiorno[]
  // Se passato, la colonna attiva mostra un link alla lista delle
  // anagrafiche di quel giorno (vedi app/dashboard/analytics/page.tsx).
  hrefGiorno?: (giorno: string) => string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [attivo, setAttivo] = useState<Attivo | null>(null)

  const maxTotale = useMemo(
    () => Math.max(1, ...giorni.map((g) => g.adulti + g.junior + g.altro)),
    [giorni]
  )
  const haAltro = useMemo(() => giorni.some((g) => g.altro > 0), [giorni])

  // Parte mostrando oggi (l'estremo destro), si torna indietro scorrendo.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [giorni])

  // Tocca altrove per chiudere il tooltip su mobile (dove non c'e' un vero
  // "mouseleave"). pointerdown invece di click: arriva prima del click della
  // colonna appena toccata, cosi' non richiude il tooltip che quel tap ha
  // appena aperto.
  useEffect(() => {
    function suPointerDownFuori(e: PointerEvent) {
      const target = e.target as Element | null
      if (!target?.closest('.enquiries-chart-colonna') && !target?.closest('.enquiries-chart-tooltip')) {
        setAttivo(null)
      }
    }
    document.addEventListener('pointerdown', suPointerDownFuori)
    return () => document.removeEventListener('pointerdown', suPointerDownFuori)
  }, [])

  if (giorni.length === 0) {
    return <p className="muted enquiries-chart-vuoto">Ancora nessuna enquiry da mostrare nel grafico.</p>
  }

  function mostraTooltip(indice: number, elemento: HTMLElement) {
    const rect = elemento.getBoundingClientRect()
    const x = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90)
    setAttivo({ indice, x, y: rect.top })
  }

  const giornoAttivo = attivo ? giorni[attivo.indice] : null

  return (
    <div className="enquiries-chart">
      <div className="enquiries-chart-legenda">
        <span className="enquiries-chart-legenda-voce">
          <span className="enquiries-chart-swatch enquiries-chart-swatch-adulti" />
          Adulti
        </span>
        <span className="enquiries-chart-legenda-voce">
          <span className="enquiries-chart-swatch enquiries-chart-swatch-junior" />
          Junior
        </span>
        {haAltro && (
          <span className="enquiries-chart-legenda-voce">
            <span className="enquiries-chart-swatch enquiries-chart-swatch-altro" />
            Altro
          </span>
        )}
        <span className="enquiries-chart-hint">← scorri per andare indietro nel tempo</span>
      </div>

      <div
        className="enquiries-chart-scroll"
        ref={scrollRef}
        onScroll={() => setAttivo(null)}
      >
        <div className="enquiries-chart-track">
          {giorni.map((giorno, indice) => {
            const totale = giorno.adulti + giorno.junior + giorno.altro
            const altezzaAdulti = Math.max((giorno.adulti / maxTotale) * ALTEZZA_BARRA, giorno.adulti > 0 ? 3 : 0)
            const altezzaJunior = Math.max((giorno.junior / maxTotale) * ALTEZZA_BARRA, giorno.junior > 0 ? 3 : 0)
            const altezzaAltro = Math.max((giorno.altro / maxTotale) * ALTEZZA_BARRA, giorno.altro > 0 ? 3 : 0)
            const etichettaGiorno = `${giorno.data.slice(8, 10)}/${giorno.data.slice(5, 7)}`

            return (
              <button
                type="button"
                key={giorno.data}
                className={`enquiries-chart-colonna${attivo?.indice === indice ? ' is-attiva' : ''}`}
                style={{ width: LARGHEZZA_COLONNA }}
                onMouseEnter={(e) => mostraTooltip(indice, e.currentTarget)}
                onMouseLeave={() => setAttivo(null)}
                onFocus={(e) => mostraTooltip(indice, e.currentTarget)}
                onBlur={() => setAttivo(null)}
                onClick={(e) => mostraTooltip(indice, e.currentTarget)}
              >
                <div className="enquiries-chart-barra" style={{ height: ALTEZZA_BARRA }}>
                  {totale === 0 ? (
                    <div className="enquiries-chart-segmento-vuoto" />
                  ) : (
                    <>
                      {giorno.altro > 0 && (
                        <div
                          className="enquiries-chart-segmento enquiries-chart-segmento-altro"
                          style={{ height: altezzaAltro }}
                        />
                      )}
                      {giorno.junior > 0 && (
                        <div
                          className="enquiries-chart-segmento enquiries-chart-segmento-junior"
                          style={{ height: altezzaJunior }}
                        />
                      )}
                      {giorno.adulti > 0 && (
                        <div
                          className="enquiries-chart-segmento enquiries-chart-segmento-adulti"
                          style={{ height: altezzaAdulti }}
                        />
                      )}
                    </>
                  )}
                </div>
                <span className="enquiries-chart-etichetta">{etichettaGiorno}</span>
                <span
                  className={`enquiries-chart-totale-tag${totale === 0 ? ' is-zero' : ''}`}
                >
                  {totale}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {giornoAttivo && attivo && (
        <div className="enquiries-chart-tooltip" style={{ left: attivo.x, top: attivo.y }} role="status">
          <div className="enquiries-chart-tooltip-data">{formatDataConGiorno(giornoAttivo.data)}</div>
          <div className="enquiries-chart-tooltip-riga">
            <span className="enquiries-chart-tooltip-chiave enquiries-chart-tooltip-chiave-adulti" />
            <span>Adulti</span>
            <strong>{giornoAttivo.adulti}</strong>
          </div>
          <div className="enquiries-chart-tooltip-riga">
            <span className="enquiries-chart-tooltip-chiave enquiries-chart-tooltip-chiave-junior" />
            <span>Junior</span>
            <strong>{giornoAttivo.junior}</strong>
          </div>
          {giornoAttivo.altro > 0 && (
            <div className="enquiries-chart-tooltip-riga">
              <span className="enquiries-chart-tooltip-chiave enquiries-chart-tooltip-chiave-altro" />
              <span>Altro</span>
              <strong>{giornoAttivo.altro}</strong>
            </div>
          )}
          <div className="enquiries-chart-tooltip-totale">
            <span>Totale</span>
            <strong>{giornoAttivo.adulti + giornoAttivo.junior + giornoAttivo.altro}</strong>
          </div>
          {hrefGiorno && giornoAttivo.adulti + giornoAttivo.junior + giornoAttivo.altro > 0 && (
            <Link href={hrefGiorno(giornoAttivo.data)} className="enquiries-chart-tooltip-link">
              Vedi il dettaglio →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
