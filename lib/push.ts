import webpush from 'web-push'

// Import consentito SOLO da file eseguiti lato server: usa VAPID_PRIVATE_KEY,
// la chiave segreta non deve mai finire nel bundle del browser.

let configurato = false
function assicuraConfigurazione() {
  if (configurato) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configurato = true
}

export type SottoscrizionePush = { endpoint: string; p256dh: string; auth: string }

export type RisultatoPush = { ok: true } | { ok: false; scaduta: boolean; errore: string }

// scaduta=true (404/410 dal servizio push del browser) significa che questo
// dispositivo ha disinstallato/disattivato le notifiche altrove: la riga in
// push_subscriptions va cancellata, non ha piu' senso riprovare.
export async function inviaPush(
  sottoscrizione: SottoscrizionePush,
  payload: { titolo: string; corpo: string; url: string }
): Promise<RisultatoPush> {
  assicuraConfigurazione()

  try {
    await webpush.sendNotification(
      { endpoint: sottoscrizione.endpoint, keys: { p256dh: sottoscrizione.p256dh, auth: sottoscrizione.auth } },
      JSON.stringify(payload)
    )
    return { ok: true }
  } catch (err: any) {
    const scaduta = err?.statusCode === 404 || err?.statusCode === 410
    return { ok: false, scaduta, errore: err?.message ?? 'Errore invio notifica push' }
  }
}
