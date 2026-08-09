'use client'

import Link from 'next/link'
import { variantePillola } from '@/lib/format'
import { ETICHETTA_ORIGINE, hrefContatto, type ContattoAnagrafica } from '@/lib/visite'

// Badge Origine: cliccabile solo quando esiste una sezione con una ricerca
// da riusare per ritrovare il contatto (per ora solo Enquiry - vedi
// lib/visite.ts hrefContatto). stopPropagation perche' il badge sta dentro
// la riga cliccabile della tabella (accordion ExpandableRow) - richiede
// 'use client' perche' un event handler non puo' attraversare il confine
// Server->Client come prop di un Server Component (vedi ContactLinks per
// lo stesso pattern).
export function BadgeOrigine({ contatto }: { contatto: ContattoAnagrafica }) {
  const badge = (
    <span className={`richiesta-badge richiesta-${variantePillola(contatto.origine)}`}>
      {ETICHETTA_ORIGINE[contatto.origine]}
    </span>
  )
  const href = hrefContatto(contatto)
  if (!href) return badge

  return (
    <Link href={href} className="link" onClick={(e) => e.stopPropagation()}>
      {badge}
    </Link>
  )
}
