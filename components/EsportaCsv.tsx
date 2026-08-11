'use client'

import { BOM_CSV, costruisciCsv } from '@/lib/csv'

// Esporta le righe GIA' filtrate visibili in tabella (nessun'altra
// chiamata al server: e' un semplice export lato client di cio' che si
// vede). Il contenuto del file lo costruisce lib/csv.ts, lo stesso che
// alimenta l'anteprima: cosi' cio' che si vede in anteprima e cio' che si
// scarica non possono divergere.
export function EsportaCsv({
  nomeFile,
  intestazioni,
  righe,
}: {
  nomeFile: string
  intestazioni: string[]
  righe: (string | number)[][]
}) {
  function scarica() {
    const blob = new Blob([BOM_CSV + costruisciCsv(intestazioni, righe)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeFile
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className="btn btn-small" disabled={righe.length === 0} onClick={scarica}>
      Esporta CSV
    </button>
  )
}
