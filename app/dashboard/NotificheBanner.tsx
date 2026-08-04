'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useNotifiche } from './NotificheProvider'
import { ConfermaLetturaButton } from './notifiche/ConfermaLetturaButton'
import { RispondiNotifica } from './notifiche/RispondiNotifica'

// In evidenza su qualunque pagina del pannello, non solo su /dashboard/notifiche:
// e' proprio il punto di "arriva in evidenza anche se sei gia' loggato" - non
// serve navigare da nessuna parte per accorgersene (vedi NotificheProvider per
// il polling che alimenta questo stato).
export function NotificheBanner() {
  const { ultima, segnaLettaLocale, chiudiUltima } = useNotifiche()
  const [confermata, setConfermata] = useState(false)

  // Un nuovo messaggio (id diverso) riparte sempre da "non confermato",
  // anche se il precedente era arrivato fino alla risposta.
  useEffect(() => {
    setConfermata(false)
  }, [ultima?.id])

  if (!ultima) return null

  return (
    <div className="notifiche-banner">
      <div className="notifiche-banner-corpo">
        <span className="notifiche-banner-mittente">Messaggio da {ultima.daNome}</span>
        <p className="notifiche-banner-testo">{ultima.messaggio}</p>
      </div>
      <div className="notifiche-banner-azioni">
        {confermata ? (
          <RispondiNotifica
            aEmail={ultima.daEmail}
            nomeDestinatario={ultima.daNome}
            onInviata={() => chiudiUltima(ultima.id)}
          />
        ) : (
          <ConfermaLetturaButton
            id={ultima.id}
            onConfermata={() => {
              segnaLettaLocale(ultima.id)
              setConfermata(true)
            }}
          />
        )}
        <Link href="/dashboard/notifiche" className="link" onClick={() => chiudiUltima(ultima.id)}>
          Vai a Notifiche
        </Link>
      </div>
    </div>
  )
}
