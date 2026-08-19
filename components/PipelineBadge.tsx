import { CLASSE_STATO, ETICHETTE_STATO, PASSI_AVANZAMENTO, type StatoPipeline } from '@/lib/pipeline'

// Stato del lead in una cella di tabella: il badge con il nome dello stato
// piu' una barretta di avanzamento a quattro segmenti, cosi' si vede a che
// punto e' la pipeline senza dover aprire la riga. "Perso" non ha
// avanzamento: la barra diventa tutta rossa.
//
// Nessuna direttiva 'use client': e' pura JSX, la usano sia i Server
// Component (la tabella) sia i client component (il pannello di gestione).
export function PipelineBadge({ stato }: { stato: StatoPipeline }) {
  const perso = stato === 'perso'
  const indice = PASSI_AVANZAMENTO.indexOf(stato)

  return (
    <span className="pipeline-badge-wrap">
      <span className={`richiesta-badge ${CLASSE_STATO[stato]}`}>{ETICHETTE_STATO[stato]}</span>
      <span className="pipeline-mini" aria-hidden="true">
        {PASSI_AVANZAMENTO.map((passo, i) => (
          <span
            key={passo}
            className={`pipeline-mini-seg${perso ? ' perso' : i <= indice ? ' pieno' : ''}${
              !perso && i === indice ? ' attuale' : ''
            }`}
          />
        ))}
      </span>
    </span>
  )
}
