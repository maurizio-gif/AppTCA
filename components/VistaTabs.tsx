'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Tab generiche guidate dal parametro "vista" nell'URL: stesso componente
// usato da Enquiries Adulti (Messaggi/Appuntamenti) e da Log operatori
// (Attività/Timbrature). Stato nell'URL cosi' e' condivisibile e
// sopravvive al tasto Indietro, stesso pattern di FiltroSelect.
export function VistaTabs({
  vista,
  tabs,
}: {
  vista: string
  tabs: { chiave: string; etichetta: string; contatore?: number }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function vai(nuovaVista: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('vista', nuovaVista)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="vista-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.chiave}
          type="button"
          className={`vista-tab${vista === tab.chiave ? ' attivo' : ''}`}
          onClick={() => vai(tab.chiave)}
        >
          {tab.etichetta}
          {!!tab.contatore && tab.contatore > 0 && <span className="vista-tab-contatore">{tab.contatore}</span>}
        </button>
      ))}
    </div>
  )
}
