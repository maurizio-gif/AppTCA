'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Spunta generica accanto ai filtri (es. "Solo i miei"): come FiltroSelect
// tiene lo stato in un parametro dell'URL, cosi' e' condivisibile e
// sopravvive al tasto Indietro. Presente = attiva, assente = spenta.
export function FiltroCheckbox({
  attivo,
  param,
  etichetta,
}: {
  attivo: boolean
  param: string
  etichetta: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <label className="filtro-checkbox">
      <input
        type="checkbox"
        checked={attivo}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString())
          if (e.target.checked) params.set(param, '1')
          else params.delete(param)
          router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }}
      />
      {etichetta}
    </label>
  )
}
