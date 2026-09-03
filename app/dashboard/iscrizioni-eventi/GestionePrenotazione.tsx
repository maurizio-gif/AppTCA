'use client'

import { useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { ETICHETTE_STATO, type StatoPrenotazione } from '@/lib/eventi'
import {
  annullaPrenotazione,
  confermaPagamento,
  eliminaPrenotazione,
  riapriPrenotazione,
} from './actions'

type Risultato = { ok: true } | { ok: false; errore: string }

// Pannello "Gestione" dentro la riga aperta: registra l'incasso in cassa,
// libera il posto o cancella la riga. Le azioni sono Server Action passate
// per id (non prop): questo componente non fa altro che raccogliere gli
// input e mostrare l'errore che torna come valore — in produzione Next.js
// oscura i messaggi degli errori lanciati da una Server Action.
export function GestionePrenotazione({
  id,
  stato,
  quota,
  importoPagato,
  scadenza,
  pagatoDa,
  pagatoIl,
  annullataDa,
  annullataIl,
  puoEliminare,
}: {
  id: string
  stato: StatoPrenotazione
  quota: number | null
  importoPagato: number | null
  scadenza: string | null
  pagatoDa: string | null
  pagatoIl: string | null
  annullataDa: string | null
  annullataIl: string | null
  puoEliminare: boolean
}) {
  const [importo, setImporto] = useState(
    importoPagato != null ? String(importoPagato) : quota != null ? String(quota) : ''
  )
  const [motivo, setMotivo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaElimina, setConfermaElimina] = useState(false)
  const [isPending, startTransition] = useTransition()

  function esegui(azione: () => Promise<Risultato>) {
    setErrore(null)
    startTransition(async () => {
      const risultato = await azione()
      if (!risultato.ok) setErrore(risultato.errore)
      else setConfermaElimina(false)
    })
  }

  const importoNumerico = importo.trim() === '' ? null : Number(importo.replace(',', '.'))
  const importoNonValido =
    importoNumerico != null && (!Number.isFinite(importoNumerico) || importoNumerico < 0)

  return (
    // stopPropagation: la riga è cliccabile per aprire/chiudere l'accordion,
    // interagire coi campi qui dentro non deve richiuderla.
    <div className="gestione-box" onClick={(e) => e.stopPropagation()}>
      {stato !== 'confermata' && (
        <>
          <label className="gestione-note-label" htmlFor={`importo-${id}`}>
            Importo incassato in cassa (€)
          </label>
          <input
            id={`importo-${id}`}
            className="gestione-note"
            type="text"
            inputMode="decimal"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            placeholder={quota != null ? String(quota) : '0'}
          />
          <div className="gestione-riga">
            <button
              type="button"
              className="btn btn-small"
              disabled={isPending || importoNonValido}
              onClick={() => esegui(() => confermaPagamento(id, importoNumerico))}
            >
              Conferma pagamento
            </button>
          </div>
        </>
      )}

      {stato === 'confermata' && (
        <p className="gestione-meta">
          Pagamento registrato{importoPagato != null ? ` (€ ${importoPagato})` : ''}
          {pagatoDa ? ` da ${pagatoDa}` : ''}
          {pagatoIl ? ` il ${formatDateOra(pagatoIl)}` : ''}.
        </p>
      )}

      {stato === 'in_attesa_pagamento' && scadenza && (
        <p className="gestione-meta">Scadenza pagamento: {formatDateOra(scadenza)}.</p>
      )}

      {stato === 'annullata' && (
        <p className="gestione-meta">
          Annullata{annullataDa ? ` da ${annullataDa}` : ''}
          {annullataIl ? ` il ${formatDateOra(annullataIl)}` : ''}.
        </p>
      )}

      {stato !== 'annullata' && (
        <>
          <label className="gestione-note-label" htmlFor={`motivo-${id}`}>
            Motivo dell&apos;annullamento (opzionale)
          </label>
          <input
            id={`motivo-${id}`}
            className="gestione-note"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Es. rinuncia del partecipante"
          />
          <div className="gestione-riga">
            <button
              type="button"
              className="btn btn-small btn-ghost"
              disabled={isPending}
              onClick={() => esegui(() => annullaPrenotazione(id, motivo))}
            >
              Annulla prenotazione (libera il posto)
            </button>
          </div>
        </>
      )}

      {(stato === 'annullata' || stato === 'scaduta') && (
        <div className="gestione-riga">
          <button
            type="button"
            className="btn btn-small btn-ghost"
            disabled={isPending}
            onClick={() => esegui(() => riapriPrenotazione(id, 48))}
          >
            Riapri per altre 48 ore
          </button>
        </div>
      )}

      {puoEliminare && (
        <div className="gestione-riga">
          {!confermaElimina ? (
            <button
              type="button"
              className="btn btn-small btn-danger"
              disabled={isPending}
              onClick={() => setConfermaElimina(true)}
            >
              Cancella definitivamente
            </button>
          ) : (
            <>
              <span className="gestione-meta">
                Cancellazione definitiva: la riga non sarà più consultabile. Confermi?
              </span>
              <button
                type="button"
                className="btn btn-small btn-danger"
                disabled={isPending}
                onClick={() => esegui(() => eliminaPrenotazione(id))}
              >
                Sì, cancella
              </button>
              <button
                type="button"
                className="btn btn-small btn-ghost"
                disabled={isPending}
                onClick={() => setConfermaElimina(false)}
              >
                No
              </button>
            </>
          )}
        </div>
      )}

      <p className="gestione-meta">Stato attuale: {ETICHETTE_STATO[stato]}.</p>

      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
