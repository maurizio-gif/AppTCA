import Link from 'next/link'

type FonteConteggio = { fonte: string; conteggio: number; href?: string }

// Classifica a barre orizzontali, un solo colore (magnitudine per fonte,
// non identita' tra poche categorie fisse: le fonti sono quelle che
// arrivano dai dati, non un insieme noto a priori). Ordinata dalla fonte
// piu' frequente, "Organico" incluso come una fonte tra le altre.
//
// Ogni riga con un "href" (vedi lib/analytics.ts filtraPerDimensione) porta
// alla lista delle anagrafiche dietro quel conteggio, senza dover indovinare
// quale altra pagina/filtro applicare per ritrovarle.
export function FontiLead({ fonti }: { fonti: FonteConteggio[] }) {
  if (fonti.length === 0) {
    return <p className="muted">Ancora nessuna enquiry da classificare per fonte.</p>
  }

  const totale = fonti.reduce((somma, f) => somma + f.conteggio, 0)
  const massimo = Math.max(...fonti.map((f) => f.conteggio))

  return (
    <div className="fonti-lead">
      {fonti.map((f) => {
        const percentuale = totale > 0 ? Math.round((f.conteggio / totale) * 100) : 0
        const larghezzaBarra = massimo > 0 ? Math.max((f.conteggio / massimo) * 100, 4) : 0
        const contenuto = (
          <>
            <span className="fonti-lead-nome">{f.fonte}</span>
            <div className="fonti-lead-traccia">
              <div className="fonti-lead-barra" style={{ width: `${larghezzaBarra}%` }} />
            </div>
            <span className="fonti-lead-valore">
              {f.conteggio} <span className="muted">({percentuale}%)</span>
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
