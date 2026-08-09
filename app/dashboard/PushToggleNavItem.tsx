'use client'

import { usePushSottoscrizione } from './notifiche/usePushSottoscrizione'

// Sempre in evidenza nel menu (non solo dentro la pagina Notifiche): grafica
// volutamente diversa dalle voci di navigazione, e' un interruttore che
// agisce sul posto, non un link che porta altrove.
export function PushToggleNavItem() {
  const { stato, isPending, errore, attiva, disattiva } = usePushSottoscrizione()

  if (stato === 'verifica') return null

  if (stato === 'non-supportato') {
    return (
      <button
        type="button"
        className="push-nav-toggle"
        disabled
        title="Non supportate su questo browser. Su iPhone/iPad: Safari → Condividi → Aggiungi a Home, poi riprova da lì."
      >
        <BellIcon />
        <span>Push non supportate</span>
      </button>
    )
  }

  const attivo = stato === 'attivo'

  return (
    <div className="push-nav-item">
      <button
        type="button"
        className={`push-nav-toggle${attivo ? ' is-attivo' : ''}`}
        disabled={isPending}
        onClick={attivo ? disattiva : attiva}
        title={
          attivo
            ? 'Notifiche push attive su questo dispositivo: premi per disattivarle'
            : 'Attiva le notifiche push su questo dispositivo'
        }
      >
        <BellIcon acceso={attivo} />
        <span>{isPending ? 'Attendere…' : attivo ? 'Push attive' : 'Attiva push'}</span>
      </button>
      {errore && <p className="push-nav-errore">{errore}</p>}
    </div>
  )
}

function BellIcon({ acceso }: { acceso?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={acceso ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="nav-icon"
      aria-hidden="true"
    >
      <path d="M12 3.5a5 5 0 0 0-5 5v3.2c0 .9-.35 1.77-1 2.4L5 15h14l-1-1c-.65-.63-1-1.5-1-2.4V8.5a5 5 0 0 0-5-5Z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  )
}
