'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getStatoNotifiche, type UltimaNotifica } from './notifiche/actions'

const INTERVALLO_MS = 30000

type StatoNotifiche = {
  nonLette: number
  ultima: UltimaNotifica | null
  segnaLettaLocale: (id: number) => void
  chiudiUltima: (id: number) => void
}

const NotificheContext = createContext<StatoNotifiche | null>(null)

// Stato condiviso da Sidebar (badge nel menu) e NotificheBanner (avviso in
// evidenza): un solo polling per tutta l'app invece di uno per componente,
// cosi' i due restano sempre in accordo (confermare dal banner aggiorna
// subito anche il badge, senza aspettare il prossimo giro).
export function NotificheProvider({
  abilitato,
  nonLetteIniziali,
  children,
}: {
  // Chi non ha il permesso "Notifiche" (vedi lib/auth/sezioni.ts) non deve
  // ricevere nulla: nessun polling, badge sempre a zero, banner mai mostrato.
  abilitato: boolean
  nonLetteIniziali: number
  children: React.ReactNode
}) {
  const [nonLette, setNonLette] = useState(nonLetteIniziali)
  const [ultima, setUltima] = useState<UltimaNotifica | null>(null)
  // Id gia' mostrati come banner in questa sessione del browser: cosi' un
  // messaggio non ancora confermato non "risalta" di nuovo a ogni polling,
  // ma il banner resta comunque visibile finche' non si conferma.
  const idMostrati = useRef<Set<number>>(new Set())

  const aggiorna = useCallback(async () => {
    const stato = await getStatoNotifiche()
    setNonLette(stato.nonLette)

    if (stato.ultima && !idMostrati.current.has(stato.ultima.id)) {
      idMostrati.current.add(stato.ultima.id)
      setUltima(stato.ultima)
    }
  }, [])

  useEffect(() => {
    if (!abilitato) return
    aggiorna()
    const id = setInterval(aggiorna, INTERVALLO_MS)
    return () => clearInterval(id)
  }, [abilitato, aggiorna])

  // Solo il conteggio: il banner resta visibile dopo la conferma di lettura,
  // cosi' puo' proporre "Rispondi ora" invece di sparire subito (vedi
  // NotificheBanner). Si chiude solo con chiudiUltima, non da qui.
  function segnaLettaLocale(idNotifica: number) {
    setNonLette((n) => Math.max(0, n - 1))
  }

  function chiudiUltima(idNotifica: number) {
    setUltima((u) => (u?.id === idNotifica ? null : u))
  }

  return (
    <NotificheContext.Provider value={{ nonLette, ultima, segnaLettaLocale, chiudiUltima }}>
      {children}
    </NotificheContext.Provider>
  )
}

export function useNotifiche() {
  const ctx = useContext(NotificheContext)
  if (!ctx) throw new Error('useNotifiche deve essere usato dentro NotificheProvider')
  return ctx
}
