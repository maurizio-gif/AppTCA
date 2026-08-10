'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { inviaNotifica } from './actions'
import { ACCEPT_ALLEGATO, DIMENSIONE_MASSIMA_ALLEGATO, TIPI_ALLEGATO_CONSENTITI, formatDimensioneFile } from '@/lib/allegati'
import { SEZIONI, SEZIONI_SENZA_VOCE_MENU } from '@/lib/auth/sezioni'

const LINK_PREDEFINITO = '/dashboard/notifiche'

// Solo le sezioni con una pagina propria (stesso criterio della Sidebar):
// "Riepilogo Enquiries" non e' un link sensato, vive dentro /dashboard.
const SEZIONI_LINK = SEZIONI.filter((s) => !SEZIONI_SENZA_VOCE_MENU.includes(s.chiave))

export function ComponiNotifica({ destinatari }: { destinatari: { email: string; nome: string }[] }) {
  const [selezionati, setSelezionati] = useState<string[]>([])
  const [messaggio, setMessaggio] = useState('')
  const [link, setLink] = useState(LINK_PREDEFINITO)
  const [allegato, setAllegato] = useState<File | null>(null)
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [menuAperto, setMenuAperto] = useState(false)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuAperto) return
    function onClickFuori(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAperto(false)
    }
    document.addEventListener('mousedown', onClickFuori)
    return () => document.removeEventListener('mousedown', onClickFuori)
  }, [menuAperto])

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
    formData.append('link', link)
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
        setLink(LINK_PREDEFINITO)
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

      <div className="destinatari-select" ref={menuRef}>
        <button
          type="button"
          className="destinatari-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={menuAperto}
          disabled={isPending || destinatari.length === 0}
          onClick={() => setMenuAperto((a) => !a)}
        >
          <span>
            {destinatari.length === 0
              ? 'Non ci sono altri operatori a cui scrivere'
              : selezionati.length === 0
                ? 'Seleziona destinatari…'
                : `${selezionati.length} ${selezionati.length === 1 ? 'destinatario selezionato' : 'destinatari selezionati'}`}
          </span>
          <span className="destinatari-select-chevron" aria-hidden="true">
            {menuAperto ? '▲' : '▼'}
          </span>
        </button>

        {menuAperto && destinatari.length > 0 && (
          <ul className="destinatari-select-menu" role="listbox" aria-multiselectable="true">
            {destinatari.map((d) => {
              const attivo = selezionati.includes(d.email)
              return (
                <li key={d.email}>
                  <label className={`destinatari-select-opzione${attivo ? ' is-attivo' : ''}`}>
                    <input
                      type="checkbox"
                      checked={attivo}
                      disabled={isPending}
                      onChange={() => toggleDestinatario(d.email)}
                    />
                    {d.nome}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selezionati.length > 0 && (
        <div className="destinatari-select-tag-lista">
          {destinatari
            .filter((d) => selezionati.includes(d.email))
            .map((d) => (
              <span key={d.email} className="destinatari-select-tag">
                {d.nome}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleDestinatario(d.email)}
                  aria-label={`Rimuovi ${d.nome} dai destinatari`}
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      <textarea
        className="gestione-note componi-notifica-testo"
        rows={3}
        value={messaggio}
        disabled={isPending}
        onChange={(e) => setMessaggio(e.target.value)}
        placeholder="Scrivi il messaggio…"
      />

      <label className="componi-notifica-link">
        Apri su (link nella notifica push)
        <select value={link} disabled={isPending} onChange={(e) => setLink(e.target.value)}>
          <option value={LINK_PREDEFINITO}>Notifiche (predefinito)</option>
          {SEZIONI_LINK.filter((s) => s.href !== LINK_PREDEFINITO).map((s) => (
            <option key={s.chiave} value={s.href}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

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
