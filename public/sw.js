// Service worker minimo, solo per le notifiche push: nessuna cache offline,
// non e' l'obiettivo di questa PWA (i dati sono sempre live da Supabase).

self.addEventListener('push', (event) => {
  let dati = {}
  try {
    dati = event.data ? event.data.json() : {}
  } catch {
    dati = {}
  }

  const titolo = dati.titolo || 'CRM TCA'
  const opzioni = {
    body: dati.corpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: dati.url || '/dashboard/notifiche' },
  }

  event.waitUntil(self.registration.showNotification(titolo, opzioni))
})

// Un click porta alla pagina Notifiche riusando una scheda gia' aperta del
// pannello, se c'e', invece di aprirne sempre una nuova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/notifiche'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((elenco) => {
      for (const client of elenco) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          if (typeof client.navigate === 'function') client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
