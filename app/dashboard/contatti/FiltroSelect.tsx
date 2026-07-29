'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const OPZIONI = [
  { valore: 'da_gestire', etichetta: 'Da gestire' },
  { valore: 'gestiti', etichetta: 'Gestiti' },
  { valore: 'tutti', etichetta: 'Tutti' },
] as const

export function FiltroSelect({ valore }: { valore: string }) {
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
      {OPZIONI.map((o) => (
        <option key={o.valore} value={o.valore}>
          {o.etichetta}
        </option>
      ))}
    </select>
  )
}
