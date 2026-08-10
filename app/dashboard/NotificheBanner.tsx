'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useNotifiche } from './NotificheProvider'
import { ConfermaLetturaButton } from './notifiche/ConfermaLetturaButton'
import { RispondiNotifica } from './notifiche/RispondiNotifica'

// Overlay a tutto schermo sopra qualunque pagina del pannello (vedi
// NotificheProvider per il polling che alimenta questo stato): un
// messaggio nuovo non e' un semplice avviso in cima al contenuto, blocca
// il resto dell'app finche' non se ne conferma la lettura. Solo dopo la
// conferma si puo' chiudere la vista (con la x, rispondendo, o andando
// all'elenco Notifiche) - prima, nessuna via d'uscita.
export function NotificheBanner() {
  const { ultima, segnaLettaLocale, chiudiUltima } = useNotifiche()
  const [confermata, setConfermata] = useState(false)

  // Un nuovo messaggio (id diverso) riparte sempre da "non confermato",
  // anche se il precedente era arrivato fino alla risposta.
  useEffect(() => {
    setConfermata(false)
  }, [ultima?.id])

  // Blocca lo scroll della pagina sotto mentre l'overlay e' aperto: e'
  // pensato per coprire tutto, non solo la parte visibile senza scroll.
  useEffect(() => {
    if (!ultima) return
    const precedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedente
    }
  }, [ultima])

  if (!ultima) return null

  return (
    <div
      className="notifiche-overlay"
      onClick={() => {
        // Cliccare fuori chiude solo dopo la conferma: prima e' bloccante.
        if (confermata) chiudiUltima(ultima.id)
      }}
    >
      <div
        className="notifiche-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="Nuovo messaggio"
        onClick={(e) => e.stopPropagation()}
      >
        {confermata && (
          <button
            type="button"
            className="notifiche-modal-chiudi"
            aria-label="Chiudi"
            onClick={() => chiudiUltima(ultima.id)}
          >
            ×
          </button>
        )}
        <div className="notifiche-banner-riga-mittente">
          <span className="notifiche-banner-mittente">Messaggio da {ultima.daNome}</span>
          {ultima.numeroDestinatari > 1 && (
            <span className="notifiche-banner-badge-multiplo">
              A {ultima.numeroDestinatari} destinatari
            </span>
          )}
        </div>
        <p className="notifiche-banner-testo">{ultima.messaggio}</p>

        {!confermata && (
          <p className="muted notifiche-modal-nota">Conferma di aver letto per continuare.</p>
        )}

        <div className="notifiche-banner-azioni">
          {confermata ? (
            <>
              <RispondiNotifica
                aEmail={ultima.daEmail}
                nomeDestinatario={ultima.daNome}
                onInviata={() => chiudiUltima(ultima.id)}
              />
              <Link href="/dashboard/notifiche" className="link" onClick={() => chiudiUltima(ultima.id)}>
                Vai a Notifiche
              </Link>
            </>
          ) : (
            <ConfermaLetturaButton
              id={ultima.id}
              onConfermata={() => {
                segnaLettaLocale(ultima.id)
                setConfermata(true)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
