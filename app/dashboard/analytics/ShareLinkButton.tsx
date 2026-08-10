'use client'

import { useState } from 'react'
import { generaLinkCondiviso, rigeneraLinkCondiviso } from './actions'

// Riusa le classi .report-preview-* (vedi components/AnteprimaReport.tsx e
// globals.css): stesso stile di modale gia' presente nell'app, niente CSS
// nuovo da mantenere solo per questo pulsante.
export function ShareLinkButton({ tokenIniziale }: { tokenIniziale: string | null }) {
  const [aperto, setAperto] = useState(false)
  const [token, setToken] = useState(tokenIniziale)
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [copiato, setCopiato] = useState(false)

  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/report/analytics/${token}` : ''

  async function generaLink() {
    setCaricamento(true)
    setErrore(null)
    const risultato = await generaLinkCondiviso()
    setCaricamento(false)
    if (!risultato.ok) {
      setErrore(risultato.errore)
      return
    }
    setToken(risultato.token)
  }

  async function rigeneraLink() {
    if (!confirm('Il link attuale smettera\' subito di funzionare per chiunque lo abbia ricevuto. Continuare?')) return
    setCaricamento(true)
    setErrore(null)
    const risultato = await rigeneraLinkCondiviso()
    setCaricamento(false)
    if (!risultato.ok) {
      setErrore(risultato.errore)
      return
    }
    setToken(risultato.token)
    setCopiato(false)
  }

  async function copiaLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  return (
    <>
      <button type="button" className="btn btn-small" onClick={() => setAperto(true)}>
        Share link
      </button>

      {aperto && (
        <div className="report-preview-overlay" onClick={() => setAperto(false)}>
          <div className="report-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-preview-header">
              <div>
                <h3>Shareable link</h3>
                <p className="muted">
                  Anyone with this link can view the report — no login required. It&apos;s read-only: filters and
                  periods can be changed, but there&apos;s no drill-down into individual leads.
                </p>
              </div>
              <button type="button" className="report-preview-chiudi" onClick={() => setAperto(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="report-preview-body">
              {errore && <p className="error-banner">{errore}</p>}

              {!token && (
                <button type="button" className="btn" onClick={generaLink} disabled={caricamento}>
                  {caricamento ? 'Generating…' : 'Generate link'}
                </button>
              )}

              {token && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div className="field" style={{ flex: 1, margin: 0 }}>
                    <label htmlFor="analytics-share-link">Link</label>
                    <input id="analytics-share-link" type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
                  </div>
                  <button type="button" className="btn btn-small" onClick={copiaLink}>
                    {copiato ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {token && (
              <div className="report-preview-footer">
                <p className="muted">Need to stop sharing it?</p>
                <button type="button" className="btn btn-small btn-danger" onClick={rigeneraLink} disabled={caricamento}>
                  Revoke &amp; create new link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
