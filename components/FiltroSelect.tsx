'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Tendina a selezione singola generica per il parametro "filtro" nell'URL:
// stesso componente usato da Enquiries e Scuola Tennis, solo le opzioni
// cambiano da pagina a pagina.
export function FiltroSelect({
  valore,
  opzioni,
}: {
  valore: string
  opzioni: { valore: string; etichetta: string }[]
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
        params.set('filtro', e.target.value)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      }}
      aria-label="Filtra per stato"
    >
      {opzioni.map((o) => (
        <option key={o.valore} value={o.valore}>
          {o.etichetta}
        </option>
      ))}
    </select>
  )
}
