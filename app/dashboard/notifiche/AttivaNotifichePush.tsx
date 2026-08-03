'use client'

import { useEffect, useState } from 'react'
import { rimuoviSottoscrizionePush, salvaSottoscrizionePush } from './push-actions'

// Il servizio push accetta la chiave VAPID solo come Uint8Array, non come
// stringa: stessa codifica base64url usata da web-push per generarla.
function chiaveComeUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const testoGrezzo = atob(base64)
  return Uint8Array.from([...testoGrezzo].map((c) => c.charCodeAt(0)))
}

type Stato = 'verifica' | 'non-supportato' | 'attivo' | 'inattivo'

export function AttivaNotifichePush() {
  const [stato, setStato] = useState<Stato>('verifica')
  const [isPending, setIsPending] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStato('non-supportato')
      return
    }

    navigator.serviceWorker.getRegistration().then(async (registrazione) => {
      const sottoscrizione = await registrazione?.pushManager.getSubscription()
      setStato(sottoscrizione ? 'attivo' : 'inattivo')
    })
  }, [])

  async function attiva() {
    setErrore(null)
    setIsPending(true)
    try {
      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') {
        setErrore('Permesso negato: per attivarle in seguito, consenti le notifiche per questo sito dalle impostazioni del browser.')
        return
      }

      const chiavePubblica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!chiavePubblica) {
        setErrore('Notifiche push non configurate sul server.')
        return
      }

      const registrazione = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const sottoscrizione = await registrazione.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chiaveComeUint8Array(chiavePubblica) as BufferSource,
      })

      const json = sottoscrizione.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setErrore('Sottoscrizione push non valida: riprova.')
        return
      }

      const risultato = await salvaSottoscrizionePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      })

      if (!risultato.ok) {
        setErrore(risultato.errore)
        return
      }

      setStato('attivo')
    } catch {
      setErrore('Non è stato possibile attivare le notifiche push su questo dispositivo.')
    } finally {
      setIsPending(false)
    }
  }

  async function disattiva() {
    setErrore(null)
    setIsPending(true)
    try {
      const registrazione = await navigator.serviceWorker.getRegistration()
      const sottoscrizione = await registrazione?.pushManager.getSubscription()

      if (sottoscrizione) {
        await rimuoviSottoscrizionePush(sottoscrizione.endpoint)
        await sottoscrizione.unsubscribe()
      }

      setStato('inattivo')
    } catch {
      setErrore('Non è stato possibile disattivare le notifiche push su questo dispositivo.')
    } finally {
      setIsPending(false)
    }
  }

  if (stato === 'verifica') return null

  if (stato === 'non-supportato') {
    return (
      <p className="muted push-toggle-nota">
        Le notifiche push non sono supportate su questo browser. Su iPhone/iPad serve prima aggiungere il pannello
        alla schermata Home (Safari → Condividi → Aggiungi a Home), poi riprovare da lì.
      </p>
    )
  }

  return (
    <div className="push-toggle">
      {stato === 'attivo' ? (
        <>
          <span className="push-toggle-stato">Notifiche push attive su questo dispositivo.</span>
          <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={disattiva}>
            {isPending ? 'Disattivazione…' : 'Disattiva'}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-small" disabled={isPending} onClick={attiva}>
          {isPending ? 'Attivazione…' : 'Attiva notifiche push su questo dispositivo'}
        </button>
      )}
      {errore && <p className="gestione-errore">{errore}</p>}
    </div>
  )
}
