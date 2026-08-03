import { formatDataConGiorno, variantePillola } from '@/lib/format'

type RigaContatto = Record<string, any>

// In evidenza appena si apre la riga, nell'ordine in cui servono a chi
// deve richiamare/rispondere: che tipo di richiesta e' (Richiamami,
// Appuntamento in sede, Messaggio...), poi giorno e orario se e' un
// appuntamento/richiamata, infine il testo per esteso scritto dal cliente -
// a tutta larghezza, non nella griglia stretta dei dettagli dove un testo
// lungo andrebbe a capo parola per parola.
//
// Nessuna direttiva 'use client'/'use server': e' pura JSX senza API
// specifiche dell'ambiente, quindi la riusano sia ContattiSezione (Server
// Component) sia CalendarioAppuntamenti (Client Component).
export function RichiestaEvidenza({ riga }: { riga: RigaContatto }) {
  const haTipo = !!riga.tipo_richiesta
  const haAppuntamento = !!(riga.data_richiesta || riga.ora_richiesta)
  const haMotivo = !!riga.motivo

  if (!haTipo && !haAppuntamento && !haMotivo) return null

  return (
    <div className="richiesta-evidenza">
      {haTipo && (
        <span className={`richiesta-badge richiesta-${variantePillola(riga.tipo_richiesta)}`}>
          {riga.tipo_richiesta}
        </span>
      )}
      {haAppuntamento && (
        <p className="richiesta-appuntamento">
          {riga.data_richiesta && formatDataConGiorno(riga.data_richiesta)}
          {riga.data_richiesta && riga.ora_richiesta && ' · '}
          {riga.ora_richiesta && `ore ${riga.ora_richiesta}`}
        </p>
      )}
      {haMotivo && <p className="richiesta-motivo">{riga.motivo}</p>}
    </div>
  )
}
