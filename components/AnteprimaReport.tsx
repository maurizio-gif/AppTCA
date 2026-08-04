'use client'

import { useEffect, useState } from 'react'

// Anteprima "da stampa" delle righe gia' filtrate, identiche a quelle che
// finirebbero nel CSV: serve a controllare il contenuto prima di scaricare,
// senza dover riaprire il file per accorgersi di un filtro sbagliato.
export function AnteprimaReport({
  titolo,
  sottotitolo,
  intestazioni,
  righe,
  riepilogo,
}: {
  titolo: string
  sottotitolo: string
  intestazioni: string[]
  righe: (string | number)[][]
  riepilogo: string
}) {
  const [aperta, setAperta] = useState(false)

  useEffect(() => {
    if (!aperta) return
    function suTastiera(e: KeyboardEvent) {
      if (e.key === 'Escape') setAperta(false)
    }
    window.addEventListener('keydown', suTastiera)
    return () => window.removeEventListener('keydown', suTastiera)
  }, [aperta])

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={righe.length === 0}
        onClick={() => setAperta(true)}
      >
        Vedi anteprima report
      </button>

      {aperta && (
        <div className="report-preview-overlay" onClick={() => setAperta(false)}>
          <div className="report-preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="report-preview-header">
              <div>
                <h3>{titolo}</h3>
                <p className="muted">{sottotitolo}</p>
              </div>
              <button
                type="button"
                className="report-preview-chiudi"
                onClick={() => setAperta(false)}
                aria-label="Chiudi anteprima"
              >
                ×
              </button>
            </div>

            <div className="report-preview-body">
              <table className="data-table">
                <thead>
                  <tr>
                    {intestazioni.map((testo) => (
                      <th key={testo}>{testo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {righe.map((riga, i) => (
                    <tr key={i}>
                      {riga.map((valore, j) => (
                        <td key={j} data-label={intestazioni[j]}>
                          {valore}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-preview-footer">
              <p className="muted">{riepilogo}</p>
              <button type="button" className="btn btn-small" onClick={() => setAperta(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
