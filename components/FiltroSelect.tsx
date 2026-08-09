'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Tendina a selezione singola generica per un parametro nell'URL: stesso
// componente usato da Enquiries, Scuola Tennis e Log operatori, solo le
// opzioni (e paramName, quando serve piu' di un filtro sulla stessa
// pagina) cambiano da pagina a pagina. paramName default "filtro" per non
// dover toccare le pagine che ne usano gia' uno solo.
export function FiltroSelect({
  valore,
  opzioni,
  paramName = 'filtro',
  ariaLabel = 'Filtra per stato',
}: {
  valore: string
  opzioni: { valore: string; etichetta: string }[]
  paramName?: string
  ariaLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <select
      className="filter-select"
      value={valore}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set(paramName, e.target.value)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      }}
      aria-label={ariaLabel}
    >
      {opzioni.map((o) => (
        <option key={o.valore} value={o.valore}>
          {o.etichetta}
        </option>
      ))}
    </select>
  )
}
