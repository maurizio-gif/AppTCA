'use client'

import { useState, useTransition } from 'react'
import { inviaNotifica } from './actions'

export function ComponiNotifica({ destinatari }: { destinatari: { email: string; nome: string }[] }) {
  const [selezionati, setSelezionati] = useState<string[]>([])
  const [messaggio, setMessaggio] = useState('')
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleDestinatario(email: string) {
    setSelezionati((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))
  }

  function invia() {
    setEsito(null)
    startTransition(async () => {
      const risultato = await inviaNotifica(selezionati, messaggio)
      if (risultato.ok) {
        setEsito({
          tipo: 'ok',
          testo: `Messaggio inviato a ${selezionati.length} ${selezionati.length === 1 ? 'persona' : 'persone'}.`,
        })
        setSelezionati([])
        setMessaggio('')
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
        {destinatari.map((d) => (
          <label key={d.email} className="sezioni-toggle-item">
            <input
              type="checkbox"
              checked={selezionati.includes(d.email)}
              disabled={isPending}
              onChange={() => toggleDestinatario(d.email)}
            />
            {d.nome}
          </label>
        ))}
        {destinatari.length === 0 && <p className="muted">Non ci sono altri operatori a cui scrivere.</p>}
      </div>

      <textarea
        className="gestione-note componi-notifica-testo"
        rows={3}
        value={messaggio}
        disabled={isPending}
        onChange={(e) => setMessaggio(e.target.value)}
        placeholder="Scrivi il messaggio…"
      />

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
