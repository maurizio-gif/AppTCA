'use client'

import Link from 'next/link'
import { useNotifiche } from './NotificheProvider'
import { ConfermaLetturaButton } from './notifiche/ConfermaLetturaButton'

// In evidenza su qualunque pagina del pannello, non solo su /dashboard/notifiche:
// e' proprio il punto di "arriva in evidenza anche se sei gia' loggato" - non
// serve navigare da nessuna parte per accorgersene (vedi NotificheProvider per
// il polling che alimenta questo stato).
export function NotificheBanner() {
  const { ultima, segnaLettaLocale } = useNotifiche()

  if (!ultima) return null

  return (
    <div className="notifiche-banner">
      <div className="notifiche-banner-corpo">
        <span className="notifiche-banner-mittente">Messaggio da {ultima.daNome}</span>
        <p className="notifiche-banner-testo">{ultima.messaggio}</p>
      </div>
      <div className="notifiche-banner-azioni">
        <ConfermaLetturaButton id={ultima.id} onConfermata={() => segnaLettaLocale(ultima.id)} />
        <Link href="/dashboard/notifiche" className="link">
          Vai a Notifiche
        </Link>
      </div>
    </div>
  )
}
