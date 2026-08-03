'use client'

import { useRef, useState, useTransition } from 'react'
import { inviaNotifica } from './actions'
import { ACCEPT_ALLEGATO, DIMENSIONE_MASSIMA_ALLEGATO, TIPI_ALLEGATO_CONSENTITI, formatDimensioneFile } from '@/lib/allegati'

export function ComponiNotifica({ destinatari }: { destinatari: { email: string; nome: string }[] }) {
  const [selezionati, setSelezionati] = useState<string[]>([])
  const [messaggio, setMessaggio] = useState('')
  const [allegato, setAllegato] = useState<File | null>(null)
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputFileRef = useRef<HTMLInputElement>(null)

  function toggleDestinatario(email: string) {
    setSelezionati((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))
  }

  function rimuoviAllegato() {
    setAllegato(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  // Stessi controlli del server (tipo, dimensione): qui solo per dare un
  // feedback immediato, la validazione che conta resta lato server.
  function scegliFile(file: File | null) {
    if (file && !TIPI_ALLEGATO_CONSENTITI[file.type]) {
      setEsito({ tipo: 'errore', testo: 'Tipo di file non supportato. Sono ammessi: JPG, PNG, PDF, Word, Excel.' })
      rimuoviAllegato()
      return
    }
    if (file && file.size > DIMENSIONE_MASSIMA_ALLEGATO) {
      setEsito({ tipo: 'errore', testo: 'Il file supera la dimensione massima di 5 MB.' })
      rimuoviAllegato()
      return
    }
    setEsito(null)
    setAllegato(file)
  }

  function invia() {
    const nomiSelezionati = destinatari.filter((d) => selezionati.includes(d.email)).map((d) => d.nome)
    const confermato = confirm(
      `Invia questo messaggio a: ${nomiSelezionati.join(', ')}?\n\n"${messaggio.trim()}"`
    )
    if (!confermato) return

    setEsito(null)
    const formData = new FormData()
    selezionati.forEach((email) => formData.append('destinatari', email))
    formData.append('messaggio', messaggio)
    if (allegato) formData.append('allegato', allegato)

    startTransition(async () => {
      const risultato = await inviaNotifica(formData)
      if (risultato.ok) {
        setEsito({
          tipo: 'ok',
          testo: `Messaggio inviato a ${selezionati.length} ${selezionati.length === 1 ? 'persona' : 'persone'}.`,
        })
        setSelezionati([])
        setMessaggio('')
        rimuoviAllegato()
      } else {
        setEsito({ tipo: 'errore', testo: risultato.errore })
      }
    })
  }

  return (
    <div className="componi-notifica">
      <h2 className="componi-notifica-titolo">Nuovo messaggio</h2>

      {esito && <p className={`timbra-esito ${esito.tipo}`}>{esito.testo}</p>}

      <div className="componi-notifica-destinatari">
        {destinatari.map((d) => {
          const attivo = selezionati.includes(d.email)
          return (
            <button
              key={d.email}
              type="button"
              className={`chip-toggle${attivo ? ' is-attivo' : ''}`}
              aria-pressed={attivo}
              disabled={isPending}
              onClick={() => toggleDestinatario(d.email)}
            >
              {d.nome}
            </button>
          )
        })}
        {destinatari.length === 0 && <p className="muted">Non ci sono altri operatori a cui scrivere.</p>}
      </div>
      {selezionati.length > 0 && (
        <p className="muted componi-notifica-conteggio">
          {selezionati.length} {selezionati.length === 1 ? 'destinatario selezionato' : 'destinatari selezionati'}.
        </p>
      )}

      <textarea
        className="gestione-note componi-notifica-testo"
        rows={3}
        value={messaggio}
        disabled={isPending}
        onChange={(e) => setMessaggio(e.target.value)}
        placeholder="Scrivi il messaggio…"
      />

      <div className="componi-notifica-allegato">
        <input
          ref={inputFileRef}
          type="file"
          accept={ACCEPT_ALLEGATO}
          disabled={isPending}
          onChange={(e) => scegliFile(e.target.files?.[0] ?? null)}
        />
        {allegato ? (
          <p className="muted">
            {allegato.name} ({formatDimensioneFile(allegato.size)}){' '}
            <button type="button" className="btn-link" disabled={isPending} onClick={rimuoviAllegato}>
              Rimuovi
            </button>
          </p>
        ) : (
          <p className="muted">Allegato facoltativo: JPG, PNG, PDF, Word o Excel, massimo 5 MB.</p>
        )}
      </div>

      <button
        type="button"
        className="btn btn-small"
        disabled={isPending || !messaggio.trim() || selezionati.length === 0}
        onClick={invia}
      >
        {isPending ? 'Invio…' : 'Invia'}
      </button>
    </div>
  )
}
