import { FontiLead } from '@/components/FontiLead'
import { formatDateOra } from '@/lib/format'
import { contaVisitePerPagina, type RigaAccesso } from '@/lib/visite'

// Nel dettaglio di ogni contatto/iscrizione che ha un vid: quante volte ha
// visto il sito e quali pagine, per farsi un'idea di quanto sia "caldo" il
// lead prima di richiamarlo. Un vid assente da "accessi" (form compilati
// prima di attivare il tracciamento, o senza consenso analytics) non mostra
// nulla, invece di una sezione vuota.
//
// Nessuna direttiva 'use client': e' pura JSX senza API specifiche
// dell'ambiente, quindi la riusano sia le pagine Server Component sia
// CalendarioAppuntamenti (Client Component).
export function VisiteContatto({ accessi }: { accessi: RigaAccesso[] }) {
  if (accessi.length === 0) return null

  const pagine = contaVisitePerPagina(accessi)
  const ordinateAsc = [...accessi].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <div className="detail-group">
      <div className="detail-group-title">
        Visite al sito — {accessi.length} {accessi.length === 1 ? 'pagina vista' : 'pagine viste'}
      </div>
      <p className="muted">
        Dal {formatDateOra(ordinateAsc[0].created_at)} al{' '}
        {formatDateOra(ordinateAsc[ordinateAsc.length - 1].created_at)}
      </p>
      <FontiLead fonti={pagine.map((p) => ({ fonte: p.pagina, conteggio: p.volte }))} />
    </div>
  )
}
