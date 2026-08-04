type FonteConteggio = { fonte: string; conteggio: number }

// Classifica a barre orizzontali, un solo colore (magnitudine per fonte,
// non identita' tra poche categorie fisse: le fonti sono quelle che
// arrivano dai dati, non un insieme noto a priori). Ordinata dalla fonte
// piu' frequente, "Organico" incluso come una fonte tra le altre.
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
        return (
          <div key={f.fonte} className="fonti-lead-riga">
            <span className="fonti-lead-nome">{f.fonte}</span>
            <div className="fonti-lead-traccia">
              <div className="fonti-lead-barra" style={{ width: `${larghezzaBarra}%` }} />
            </div>
            <span className="fonti-lead-valore">
              {f.conteggio} <span className="muted">({percentuale}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
