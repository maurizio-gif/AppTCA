import Link from 'next/link'
import { formatDelta as formatDeltaDefault } from '@/lib/format'

type FonteConteggio = {
  fonte: string
  conteggio: number
  href?: string
  // Presenti solo quando in Analytics e' attivo un periodo di confronto
  // (vedi unisciConDelta in lib/analytics.ts): confronto=null significa
  // "nessun confronto", non "zero nel periodo precedente".
  confronto?: number | null
  delta?: number | null
}

// Classifica a barre orizzontali, un solo colore (magnitudine per fonte,
// non identita' tra poche categorie fisse: le fonti sono quelle che
// arrivano dai dati, non un insieme noto a priori). Ordinata dalla fonte
// piu' frequente, "Organico" incluso come una fonte tra le altre.
//
// Ogni riga con un "href" (vedi lib/analytics.ts filtraPerDimensione) porta
// alla lista delle anagrafiche dietro quel conteggio, senza dover indovinare
// quale altra pagina/filtro applicare per ritrovarle.
//
// messaggioVuoto/formatDelta hanno un default in italiano (usato da
// VisiteContatto nelle sezioni Enquiries/Scuola tennis/ecc): Analytics
// passa le sue varianti in inglese invece di duplicare il componente.
export function FontiLead({
  fonti,
  messaggioVuoto = 'Ancora nessuna enquiry da classificare per fonte.',
  formatDelta = formatDeltaDefault,
}: {
  fonti: FonteConteggio[]
  messaggioVuoto?: string
  formatDelta?: (delta: number | null) => string
}) {
  if (fonti.length === 0) {
    return <p className="muted">{messaggioVuoto}</p>
  }

  const totale = fonti.reduce((somma, f) => somma + f.conteggio, 0)
  const massimo = Math.max(...fonti.map((f) => f.conteggio))
  const conConfronto = fonti.some((f) => f.confronto !== undefined && f.confronto !== null)

  return (
    <div className="fonti-lead">
      {fonti.map((f) => {
        const percentuale = totale > 0 ? Math.round((f.conteggio / totale) * 100) : 0
        const larghezzaBarra = massimo > 0 ? Math.max((f.conteggio / massimo) * 100, 4) : 0
        const delta = f.delta ?? null
        const classeDelta = delta === null || delta === 0 ? '' : delta > 0 ? 'is-positivo' : 'is-negativo'
        const contenuto = (
          <>
            <span className="fonti-lead-nome">{f.fonte}</span>
            <div className="fonti-lead-traccia">
              <div className="fonti-lead-barra" style={{ width: `${larghezzaBarra}%` }} />
            </div>
            <span className="fonti-lead-valore">
              {f.conteggio} <span className="muted">({percentuale}%)</span>
              {conConfronto && (
                <span className={`fonti-lead-delta ${classeDelta}`}>
                  {f.confronto} → {f.conteggio} ({formatDelta(delta)})
                </span>
              )}
            </span>
          </>
        )
        return f.href ? (
          <Link key={f.fonte} href={f.href} className="fonti-lead-riga fonti-lead-riga-link">
            {contenuto}
          </Link>
        ) : (
          <div key={f.fonte} className="fonti-lead-riga">
            {contenuto}
          </div>
        )
      })}
    </div>
  )
}
