'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Le classifiche di Analytics sono tante e lunghe: aperte tutte insieme
// costringono a scorrere parecchio per arrivare a quella che interessa.
// Qui diventano sezioni richiudibili, chiuse all'apertura della pagina,
// con un comando per aprirle tutte in un colpo solo.
//
// Il contenuto resta SEMPRE nel DOM anche da chiusa (nascosto via CSS) e
// non viene smontato: l'export PDF e' la stampa del browser (vedi
// ExportPdfButton), quindi una sezione non renderizzata sparirebbe dal
// PDF - il @media print in globals.css le riapre tutte.

const Contesto = createContext<{
  aperte: Set<string>
  alterna: (id: string) => void
} | null>(null)

export function GruppoSezioni({ idSezioni, children }: { idSezioni: string[]; children: ReactNode }) {
  const [aperte, setAperte] = useState<Set<string>>(new Set())

  const tutteAperte = idSezioni.length > 0 && idSezioni.every((id) => aperte.has(id))

  function alterna(id: string) {
    setAperte((precedenti) => {
      const nuove = new Set(precedenti)
      if (nuove.has(id)) nuove.delete(id)
      else nuove.add(id)
      return nuove
    })
  }

  return (
    <Contesto.Provider value={{ aperte, alterna }}>
      <div className="sezioni-toolbar no-print">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setAperte(tutteAperte ? new Set() : new Set(idSezioni))}
        >
          {tutteAperte ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {children}
    </Contesto.Provider>
  )
}

export function SezioneAccordion({
  id,
  titolo,
  children,
}: {
  id: string
  titolo: string
  children: ReactNode
}) {
  const gruppo = useContext(Contesto)
  const [apertaLocale, setApertaLocale] = useState(false)
  const aperta = gruppo ? gruppo.aperte.has(id) : apertaLocale

  return (
    <section className={`sezione-accordion${aperta ? ' is-aperta' : ''}`}>
      <button
        type="button"
        className="sezione-accordion-testata"
        aria-expanded={aperta}
        onClick={() => (gruppo ? gruppo.alterna(id) : setApertaLocale((o) => !o))}
      >
        <span className="sezione-accordion-titolo">{titolo}</span>
        <span className="sezione-accordion-indicatore" aria-hidden="true">
          {aperta ? '−' : '+'}
        </span>
      </button>
      <div className="sezione-accordion-corpo">{children}</div>
    </section>
  )
}
