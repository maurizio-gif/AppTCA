'use client'

// Nella PWA installata (manifest "display: standalone") un normale
// target="_blank" spesso resta "intrappolato" nella app invece di aprire
// il browser di sistema. Navigare la finestra corrente (prima versione di
// questo componente) NON risolve: la pagina si carica comunque dentro la
// stessa finestra standalone, senza barra degli indirizzi ne' controlli
// del browser - e' esattamente l'effetto "apre il browser dentro l'app"
// lamentato. Serve invece una vera nuova finestra/intent, che il sistema
// operativo non puo' ospitare dentro una PWA standalone e quindi passa
// al browser di default del telefono:
// - Android: un URL "intent://" forza la risoluzione tramite il browser
//   predefinito (stessa tecnica usata per uscire dai browser-in-app di
//   Instagram/Facebook), invece della Custom Tab agganciata alla PWA.
// - iOS/altri: window.open() chiamato esplicitamente da codice (non il
//   comportamento di default di un tag <a>) fa si' che WebKit apra
//   Safari, perche' una finestra standalone non puo' ospitare una
//   seconda scheda.
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        const standalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true

        if (!standalone) return

        e.preventDefault()

        const isAndroid = /android/i.test(window.navigator.userAgent)
        const matchSchema = href.match(/^(https?):\/\/(.+)$/i)

        if (isAndroid && matchSchema) {
          const [, schema, resto] = matchSchema
          window.location.href = `intent://${resto}#Intent;scheme=${schema};action=android.intent.action.VIEW;end`
        } else {
          window.open(href, '_blank', 'noopener,noreferrer')
        }
      }}
    >
      {children}
    </a>
  )
}
