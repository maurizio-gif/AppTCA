'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deltaPercentuale, formatDateWithWeekday, formatDeltaEn, type PuntoConfronto } from '@/lib/analytics'

const LARGHEZZA_COLONNA = 62
const ALTEZZA_BARRA = 140

type Attivo = { indice: number; x: number; y: number }

function etichettaBreve(chiave: string | null): string {
  if (!chiave) return '—'
  return `${chiave.slice(8, 10)}/${chiave.slice(5, 7)}`
}

// L'anno solo sull'etichetta dello storico: col confronto predefinito
// ("anno precedente") giorno e mese coincidono con quelli del sito, quindi
// senza l'anno le due righe di date sembrerebbero ripetute per errore.
function etichettaBreveConAnno(chiave: string | null): string {
  if (!chiave) return '—'
  return `${etichettaBreve(chiave)}/${chiave.slice(2, 4)}`
}

// Istogramma affiancato (non impilato) per il confronto tra sorgenti: due
// barre per colonna, storico HubSpot a sinistra e sito attuale a destra,
// cosi' si legge da passato a presente. Le colonne sono accoppiate per
// posizione nel periodo (vedi abbinaSerieConfronto), non per data: i due
// periodi sono diversi per definizione (es. agosto 2026 vs agosto 2025).
// Scala e comportamento (scroll laterale con partenza sull'ultimo giorno,
// tooltip su hover/tap) restano quelli di EnquiriesChart.
export function ConfrontoChart({
  giorni,
  etichettaSito = 'Current site',
  etichettaStorico = 'HubSpot historical',
}: {
  giorni: PuntoConfronto[]
  etichettaSito?: string
  etichettaStorico?: string
}) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [attivo, setAttivo] = useState<Attivo | null>(null)

  // Scala condivisa dalle due serie: se ognuna avesse la propria, due barre
  // alte uguali potrebbero rappresentare numeri diversi e il confronto
  // visivo - che e' tutto il senso del grafico - sarebbe falsato.
  const maxTotale = useMemo(
    () => Math.max(1, ...giorni.map((g) => Math.max(g.sito, g.storico))),
    [giorni]
  )

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
    return <p className="muted enquiries-chart-vuoto">No data to compare in the chart yet.</p>
  }

  function mostraTooltip(indice: number, elemento: HTMLElement) {
    const rect = elemento.getBoundingClientRect()
    const x = Math.min(Math.max(rect.left + rect.width / 2, 110), window.innerWidth - 110)
    setAttivo({ indice, x, y: rect.top })
  }

  const giornoAttivo = attivo ? giorni[attivo.indice] : null
  const deltaAttivo = giornoAttivo ? deltaPercentuale(giornoAttivo.sito, giornoAttivo.storico) : null

  return (
    <div className="enquiries-chart confronto-chart">
      <div className="enquiries-chart-legenda">
        <span className="enquiries-chart-legenda-voce">
          <span className="enquiries-chart-swatch confronto-chart-swatch-storico" />
          {etichettaStorico}
        </span>
        <span className="enquiries-chart-legenda-voce">
          <span className="enquiries-chart-swatch confronto-chart-swatch-sito" />
          {etichettaSito}
        </span>
        <span className="enquiries-chart-hint">← scroll to go back in time</span>
      </div>

      <div className="enquiries-chart-scroll" ref={scrollRef} onScroll={() => setAttivo(null)}>
        <div className="enquiries-chart-track">
          {giorni.map((giorno, indice) => {
            const altezzaSito = Math.max((giorno.sito / maxTotale) * ALTEZZA_BARRA, giorno.sito > 0 ? 3 : 0)
            const altezzaStorico = Math.max((giorno.storico / maxTotale) * ALTEZZA_BARRA, giorno.storico > 0 ? 3 : 0)

            return (
              <button
                type="button"
                key={`${giorno.dataSito ?? 'x'}-${giorno.dataStorico ?? 'x'}`}
                className={`enquiries-chart-colonna${attivo?.indice === indice ? ' is-attiva' : ''}`}
                style={{ width: LARGHEZZA_COLONNA }}
                onMouseEnter={(e) => mostraTooltip(indice, e.currentTarget)}
                onMouseLeave={() => setAttivo(null)}
                onFocus={(e) => mostraTooltip(indice, e.currentTarget)}
                onBlur={() => setAttivo(null)}
                onClick={(e) => {
                  // Come in EnquiriesChart: il click porta al dettaglio del
                  // giorno, che pero' esiste solo per le enquiry del sito
                  // (lo storico HubSpot non ha una lista di drill-down).
                  if (giorno.dataSito && giorno.sito > 0) {
                    router.push(`/dashboard/analytics/lista?giorno=${giorno.dataSito}`)
                    return
                  }
                  mostraTooltip(indice, e.currentTarget)
                }}
              >
                <div className="confronto-chart-coppia" style={{ height: ALTEZZA_BARRA }}>
                  <div className="confronto-chart-barra">
                    {giorno.storico === 0 ? (
                      <div className="enquiries-chart-segmento-vuoto" />
                    ) : (
                      <div className="enquiries-chart-segmento confronto-chart-segmento-storico" style={{ height: altezzaStorico }} />
                    )}
                  </div>
                  <div className="confronto-chart-barra">
                    {giorno.sito === 0 ? (
                      <div className="enquiries-chart-segmento-vuoto" />
                    ) : (
                      <div className="enquiries-chart-segmento confronto-chart-segmento-sito" style={{ height: altezzaSito }} />
                    )}
                  </div>
                </div>

                {/* Storico sopra, sito sotto: stesso ordine della legenda,
                    delle due pillole di conteggio e delle barre da sinistra
                    a destra. */}
                <span className="confronto-chart-etichetta-storico">{etichettaBreveConAnno(giorno.dataStorico)}</span>
                <span className="enquiries-chart-etichetta confronto-chart-etichetta-sito">
                  {etichettaBreve(giorno.dataSito)}
                </span>

                <span className="confronto-chart-tags">
                  <span
                    className={`enquiries-chart-totale-tag confronto-chart-tag-storico${giorno.storico === 0 ? ' is-zero' : ''}`}
                  >
                    {giorno.storico}
                  </span>
                  <span
                    className={`enquiries-chart-totale-tag confronto-chart-tag-sito${giorno.sito === 0 ? ' is-zero' : ''}`}
                  >
                    {giorno.sito}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {giornoAttivo && attivo && (
        <div
          className="enquiries-chart-tooltip confronto-chart-tooltip-largo"
          style={{ left: attivo.x, top: attivo.y }}
          role="status"
        >
          <div className="enquiries-chart-tooltip-riga">
            <span className="enquiries-chart-tooltip-chiave confronto-chart-chiave-storico" />
            <span>{giornoAttivo.dataStorico ? formatDateWithWeekday(giornoAttivo.dataStorico) : '—'}</span>
            <strong>{giornoAttivo.storico}</strong>
          </div>
          <div className="enquiries-chart-tooltip-riga">
            <span className="enquiries-chart-tooltip-chiave confronto-chart-chiave-sito" />
            <span>{giornoAttivo.dataSito ? formatDateWithWeekday(giornoAttivo.dataSito) : '—'}</span>
            <strong>{giornoAttivo.sito}</strong>
          </div>
          <div className="enquiries-chart-tooltip-totale">
            <span>Change</span>
            <strong>{formatDeltaEn(deltaAttivo)}</strong>
          </div>
          {giornoAttivo.dataSito && giornoAttivo.sito > 0 && (
            <div className="enquiries-chart-tooltip-hint">Click for site details</div>
          )}
        </div>
      )}
    </div>
  )
}
