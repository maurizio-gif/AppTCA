import { formatDataRichiesta, variantePillola } from '@/lib/format'

// Etichette leggibili per i 3 tipi noti (il form li manda in minuscolo);
// un tipo non previsto qui viene comunque mostrato cosi' com'e'.
const ETICHETTA_RICHIESTA: Record<string, string> = {
  messaggio: 'Messaggio',
  richiamami: 'Richiamami',
  'appuntamento in sede': 'Appuntamento in sede',
}

function IconaRichiesta({ tipo }: { tipo: string }) {
  const chiave = tipo.trim().toLowerCase()
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="richiesta-badge-icon"
    >
      {chiave === 'richiamami' ? (
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C9.6 21 3 14.4 3 6a2 2 0 0 1 2-2z" />
      ) : chiave === 'appuntamento in sede' ? (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </>
      ) : (
        <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      )}
    </svg>
  )
}

export function RichiestaSezione({
  tipo,
  motivo,
  dataRichiesta,
  oraRichiesta,
}: {
  tipo: string | null
  motivo: string | null
  dataRichiesta: string | null
  oraRichiesta: string | null
}) {
  const dataFormattata = formatDataRichiesta(dataRichiesta)
  const haAppuntamento = !!(dataFormattata || oraRichiesta)

  return (
    <div className="richiesta-dettaglio">
      <div className="richiesta-riepilogo">
        {tipo && (
          <span className={`richiesta-badge richiesta-badge-lg richiesta-${variantePillola(tipo)}`}>
            <IconaRichiesta tipo={tipo} />
            {ETICHETTA_RICHIESTA[tipo.trim().toLowerCase()] ?? tipo}
          </span>
        )}

        {haAppuntamento && (
          <div className="richiesta-appuntamento">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="richiesta-appuntamento-icon"
            >
              <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
              <path d="M3.5 9.5h17M8 3v4M16 3v4" />
            </svg>
            <div>
              {dataFormattata && (
                <span className="richiesta-appuntamento-data">{dataFormattata}</span>
              )}
              {oraRichiesta && (
                <span className="richiesta-appuntamento-ora">ore {oraRichiesta}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {motivo ? (
        <div className="richiesta-messaggio">{motivo}</div>
      ) : (
        !haAppuntamento && <p className="muted">Nessun dettaglio aggiuntivo.</p>
      )}
    </div>
  )
}
