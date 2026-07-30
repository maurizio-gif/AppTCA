'use client'

import { useEffect, useRef } from 'react'
import { logout } from '@/app/login/actions'

const LIMITE_INATTIVITA_MS = 30 * 60 * 1000

// Stessa soglia del breakpoint mobile in CSS (vedi globals.css, @media
// max-width: 860px): sotto, l'app diventa la versione mobile e il logout
// automatico non si applica.
const SOGLIA_DESKTOP_PX = 860

// Non resettare il timeout ad ogni singolo evento (mousemove ne genera
// decine al secondo): basta un controllo ogni pochi secondi, l'obiettivo e'
// sapere se c'e' stata attivita' nell'ultima finestra di 30 minuti, non il
// millisecondo esatto.
const THROTTLE_MS = 5000

const EVENTI_ATTIVITA = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const

// Slogga automaticamente dopo 30 minuti senza attivita', solo su desktop:
// su mobile la sessione resta attiva (si usa in modo piu' saltuario, un
// logout automatico sarebbe solo fastidioso).
export function LogoutInattivita() {
  const formRef = useRef<HTMLFormElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const ultimoResetRef = useRef(0)

  useEffect(() => {
    function isDesktop() {
      return window.innerWidth > SOGLIA_DESKTOP_PX
    }

    function armaTimeout() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (!isDesktop()) return
      timeoutRef.current = setTimeout(() => {
        formRef.current?.requestSubmit()
      }, LIMITE_INATTIVITA_MS)
    }

    function suAttivita() {
      const ora = Date.now()
      if (ora - ultimoResetRef.current < THROTTLE_MS) return
      ultimoResetRef.current = ora
      armaTimeout()
    }

    // Al mount e ad ogni resize (es. si passa da desktop a mobile e
    // viceversa ridimensionando la finestra): decide se il timeout deve
    // essere attivo o no in base alla larghezza attuale.
    armaTimeout()
    window.addEventListener('resize', armaTimeout)
    EVENTI_ATTIVITA.forEach((evento) => window.addEventListener(evento, suAttivita, { passive: true }))

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      window.removeEventListener('resize', armaTimeout)
      EVENTI_ATTIVITA.forEach((evento) => window.removeEventListener(evento, suAttivita))
    }
  }, [])

  return (
    <form ref={formRef} action={logout} style={{ display: 'none' }} aria-hidden="true">
      <button type="submit" tabIndex={-1} />
    </form>
  )
}
