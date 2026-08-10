'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Due date (dal/al) come parametri nell'URL: stesso pattern di
// FiltroSelect, ma per un intervallo invece di una singola scelta.
// etichettaDal/etichettaAl hanno un default in italiano (usato da Enquiries/
// Log operatori): Analytics passa "From"/"To" invece di duplicare il
// componente.
export function FiltroData({
  dal,
  al,
  paramDal = 'dal',
  paramAl = 'al',
  etichettaDal = 'Dal',
  etichettaAl = 'Al',
}: {
  dal: string
  al: string
  paramDal?: string
  paramAl?: string
  etichettaDal?: string
  etichettaAl?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function aggiorna(param: string, valore: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valore) params.set(param, valore)
    else params.delete(param)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="filtro-date">
      <label className="filtro-date-campo">
        <span>{etichettaDal}</span>
        <input type="date" value={dal} max={al} onChange={(e) => aggiorna(paramDal, e.target.value)} />
      </label>
      <label className="filtro-date-campo">
        <span>{etichettaAl}</span>
        <input type="date" value={al} min={dal} onChange={(e) => aggiorna(paramAl, e.target.value)} />
      </label>
    </div>
  )
}
