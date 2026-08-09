import { formatDateOra } from '@/lib/format'
import type { RigaAccesso } from '@/lib/visite'

// In evidenza appena si apre la riga (stesso posto di RichiestaEvidenza per
// i contatti): l'elenco di tutte le pagine viste da questo visitatore, piu'
// recente per prima, con provenienza - e' il dettaglio che la ricerca di
// questa sezione serve a mostrare, non ha senso nasconderlo in un'altra tab.
export function VisitePagine({ pagine }: { pagine: RigaAccesso[] }) {
  return (
    <div className="detail-group">
      <div className="detail-group-title">Pagine visitate ({pagine.length})</div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data e ora</th>
              <th>Pagina</th>
              <th>Provenienza</th>
            </tr>
          </thead>
          <tbody>
            {pagine.map((accesso) => (
              <tr key={accesso.id}>
                <td data-label="Data e ora">{formatDateOra(accesso.created_at)}</td>
                <td data-label="Pagina">{accesso.pagina || '—'}</td>
                <td data-label="Provenienza" className="muted">
                  {accesso.referrer || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
