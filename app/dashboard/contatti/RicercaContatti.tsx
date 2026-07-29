'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Aggiorna l'URL (parametro "q") con un debounce, cosi' la ricerca non
// ricarica la pagina a ogni tasto premuto. Il filtro Da gestire/Gestiti
// resta nell'URL ma viene ignorato lato server finche' c'e' una ricerca
// attiva (vedi ContattiPage): qui serve solo a non perderlo quando si
// cancella il testo.
export function RicercaContatti({ valoreIniziale }: { valoreIniziale: string }) {
  const [valore, setValore] = useState(valoreIniziale)
  const primoRender = useRef(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (primoRender.current) {
      primoRender.current = false
      return
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const pulito = valore.trim()
      if (pulito) {
        params.set('q', pulito)
      } else {
        params.delete('q')
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, 300)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valore])

  return (
    <div className="search-box">
      <svg
        className="search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M20 20l-4.8-4.8" />
      </svg>
      <input
        type="search"
        value={valore}
        onChange={(e) => setValore(e.target.value)}
        placeholder="Cerca per nome, cognome, email o cellulare"
        aria-label="Cerca contatto"
      />
    </div>
  )
}
