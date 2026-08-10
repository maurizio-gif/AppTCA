'use client'

// Esporta in PDF con la stampa del browser invece di una libreria dedicata
// (nessuna dipendenza aggiuntiva, nessun servizio esterno da mantenere):
// il CSS @media print (vedi globals.css) nasconde menu/filtri/pulsanti e
// lascia solo il contenuto del report, l'utente sceglie "Salva come PDF"
// tra le stampanti nel dialogo che il browser apre da solo.
export function ExportPdfButton() {
  return (
    <button type="button" className="btn btn-small no-print" onClick={() => window.print()}>
      Export to PDF
    </button>
  )
}
