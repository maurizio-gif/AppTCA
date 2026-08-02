'use client'

// Nella PWA installata (manifest "display: standalone") un normale
// target="_blank" spesso apre il link dentro una finestra ancora
// "intrappolata" nella app invece che nel browser di sistema (capita
// soprattutto su iOS). Se siamo in modalita' standalone navighiamo la
// finestra corrente: uscire dallo scope dell'app forza il sistema ad
// aprire il vero browser esterno.
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

        if (standalone) {
          e.preventDefault()
          window.location.href = href
        }
      }}
    >
      {children}
    </a>
  )
}
