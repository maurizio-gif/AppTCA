'use client'

// Esporta le righe GIA' filtrate visibili in tabella (nessun'altra
// chiamata al server: e' un semplice export lato client di cio' che si
// vede). BOM iniziale ('﻿') e separatore ';' cosi' Excel su Windows
// apre il file mostrando correttamente le lettere accentate, invece del
// comportamento predefinito pensato per la virgola come separatore.
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
    const escapeCella = (valore: string | number) => `"${String(valore).replace(/"/g, '""')}"`
    const csv = [intestazioni, ...righe].map((riga) => riga.map(escapeCella).join(';')).join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
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
