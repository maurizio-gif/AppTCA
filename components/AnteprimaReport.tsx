'use client'

import { useEffect, useState } from 'react'
import { SEPARATORE_CSV, costruisciCsv, letteraColonna } from '@/lib/csv'

// Anteprima del file prima di scaricarlo, non una versione "bella" del
// report: le righe e le colonne sono esattamente quelle che finiscono nel
// CSV (stessa sorgente, vedi lib/csv.ts), mostrate come le vedra' chi apre
// il file - griglia con lettere di colonna e numeri di riga, intestazioni
// sulla riga 1 come una riga qualsiasi del file.
//
// Da qui niente impaginazione a schede su mobile (a differenza di
// .data-table): un foglio di calcolo ha le colonne che ha, quindi la
// griglia scorre di lato invece di ricomporsi.
export function AnteprimaReport({
  titolo,
  sottotitolo,
  intestazioni,
  righe,
  riepilogo,
  nomeFile,
}: {
  titolo: string
  sottotitolo: string
  intestazioni: string[]
  righe: (string | number)[][]
  riepilogo: string
  // Nome con cui il file verra' salvato: mostrato in anteprima perche' fa
  // parte di "com'e' fatto il report", non solo del download.
  nomeFile?: string
}) {
  const [aperta, setAperta] = useState(false)
  const [vista, setVista] = useState<'foglio' | 'testo'>('foglio')

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
                {nomeFile && <p className="report-preview-nomefile">{nomeFile}</p>}
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

            <div className="vista-tabs report-preview-viste">
              <button
                type="button"
                className={`vista-tab${vista === 'foglio' ? ' attivo' : ''}`}
                onClick={() => setVista('foglio')}
              >
                Come si aprirà in Excel
              </button>
              <button
                type="button"
                className={`vista-tab${vista === 'testo' ? ' attivo' : ''}`}
                onClick={() => setVista('testo')}
              >
                Testo del file
              </button>
            </div>

            <div className="report-preview-body">
              {vista === 'foglio' ? (
                <table className="csv-foglio">
                  <thead>
                    <tr>
                      <th className="csv-foglio-angolo" aria-label="Riga" />
                      {intestazioni.map((testo, i) => (
                        <th key={testo} scope="col" className="csv-foglio-lettera">
                          {letteraColonna(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Le intestazioni sono la riga 1 del file, non
                        l'intestazione della tabella: e' cosi' che le
                        vedra' chi apre il CSV. */}
                    <tr className="csv-foglio-riga-uno">
                      <th scope="row" className="csv-foglio-numero">
                        1
                      </th>
                      {intestazioni.map((testo) => (
                        <td key={testo}>{testo}</td>
                      ))}
                    </tr>
                    {righe.map((riga, i) => (
                      <tr key={i}>
                        <th scope="row" className="csv-foglio-numero">
                          {i + 2}
                        </th>
                        {riga.map((valore, j) => (
                          <td key={j}>{valore}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <pre className="csv-testo">{costruisciCsv(intestazioni, righe)}</pre>
              )}
            </div>

            <div className="report-preview-footer">
              <div>
                <p className="muted">{riepilogo}</p>
                <p className="report-preview-nota">
                  {vista === 'foglio' ? (
                    <>
                      Il totale qui sopra non fa parte del file: il CSV contiene solo le {righe.length + 1} righe della
                      griglia, intestazioni comprese.
                    </>
                  ) : (
                    <>
                      Ogni valore è racchiuso fra virgolette e separato da «{SEPARATORE_CSV}»: è ciò che fa aprire il
                      file già incolonnato in Excel, e non si vede una volta aperto.
                    </>
                  )}
                </p>
              </div>
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
