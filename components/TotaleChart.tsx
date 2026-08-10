'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDateWithWeekday } from '@/lib/analytics'

type PuntoGiornoTotale = { data: string; totale: number }

const LARGHEZZA_COLONNA = 40
const ALTEZZA_BARRA = 120

type Attivo = { indice: number; x: number; y: number }

// Variante a singola serie di EnquiriesChart: usata per lead_hubspot_storico,
// che non ha un equivalente di gruppo_attivita (adulti/junior) su cui
// suddividere la barra, e non ha una pagina di dettaglio su cui rimandare
// al click (i lead storici non hanno un drill-down dedicato).
export function TotaleChart({ giorni }: { giorni: PuntoGiornoTotale[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [attivo, setAttivo] = useState<Attivo | null>(null)

  const maxTotale = useMemo(() => Math.max(1, ...giorni.map((g) => g.totale)), [giorni])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [giorni])

  useEffect(() => {
    function suPointerDownFuori(e: PointerEvent) {
      const target = e.target as Element | null
      if (!target?.closest('.enquiries-chart-colonna')) {
        setAttivo(null)
      }
    }
    document.addEventListener('pointerdown', suPointerDownFuori)
    return () => document.removeEventListener('pointerdown', suPointerDownFuori)
  }, [])

  if (giorni.length === 0) {
    return <p className="muted enquiries-chart-vuoto">No historical leads to show in the chart yet.</p>
  }

  function mostraTooltip(indice: number, elemento: HTMLElement) {
    const rect = elemento.getBoundingClientRect()
    const x = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90)
    setAttivo({ indice, x, y: rect.top })
  }

  const giornoAttivo = attivo ? giorni[attivo.indice] : null

  return (
    <div className="enquiries-chart">
      <div
        className="enquiries-chart-scroll"
        ref={scrollRef}
        onScroll={() => setAttivo(null)}
      >
        <div className="enquiries-chart-track">
          {giorni.map((giorno, indice) => {
            const altezza = Math.max((giorno.totale / maxTotale) * ALTEZZA_BARRA, giorno.totale > 0 ? 3 : 0)
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
                  {giorno.totale === 0 ? (
                    <div className="enquiries-chart-segmento-vuoto" />
                  ) : (
                    <div className="enquiries-chart-segmento enquiries-chart-segmento-storico" style={{ height: altezza }} />
                  )}
                </div>
                <span className="enquiries-chart-etichetta">{etichettaGiorno}</span>
                <span className={`enquiries-chart-totale-tag${giorno.totale === 0 ? ' is-zero' : ''}`}>
                  {giorno.totale}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {giornoAttivo && attivo && (
        <div className="enquiries-chart-tooltip" style={{ left: attivo.x, top: attivo.y }} role="status">
          <div className="enquiries-chart-tooltip-data">{formatDateWithWeekday(giornoAttivo.data)}</div>
          <div className="enquiries-chart-tooltip-totale">
            <span>Leads</span>
            <strong>{giornoAttivo.totale}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
