import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { StatoSelect } from './StatoSelect'

const STATI_VALIDI = ['nuovo', 'in_lavorazione', 'contattato', 'chiuso']

export default async function ContattiPage({
  searchParams,
}: {
  searchParams: { stato?: string }
}) {
  const supabase = createSupabaseServiceClient()

  let query = supabase
    .from('form_contatti')
    .select('id, created_at, nome, cognome, email, cellulare, tipo_richiesta, motivo, stato, pagina')
    .order('created_at', { ascending: false })

  if (searchParams.stato) {
    query = query.eq('stato', searchParams.stato)
  }

  const { data: righe, error } = await query

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Form contatti ("Parliamone")</h1>
      </div>

      <FiltroStato attivo={searchParams.stato} />

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
              <th>Contatti</th>
              <th>Richiesta</th>
              <th>Pagina</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {righe?.map((riga) => (
              <tr key={riga.id}>
                <td>{new Date(riga.created_at).toLocaleString('it-IT')}</td>
                <td>{riga.nome} {riga.cognome}</td>
                <td>
                  {riga.email}
                  <br />
                  <span className="muted">{riga.cellulare}</span>
                </td>
                <td>
                  {riga.tipo_richiesta}
                  <br />
                  <span className="muted">{riga.motivo}</span>
                </td>
                <td>{riga.pagina}</td>
                <td>
                  <StatoSelect id={riga.id} statoIniziale={riga.stato ?? 'nuovo'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {righe?.length === 0 && <p className="empty-state">Nessuna richiesta trovata.</p>}
      </div>
    </div>
  )
}

function FiltroStato({ attivo }: { attivo?: string }) {
  const opzioni = ['tutti', ...STATI_VALIDI]
  return (
    <div className="filter-row">
      {opzioni.map((stato) => (
        <a
          key={stato}
          href={stato === 'tutti' ? '/dashboard/contatti' : `/dashboard/contatti?stato=${stato}`}
          className={`filter-pill ${(attivo ?? 'tutti') === stato ? 'active' : ''}`}
        >
          {stato}
        </a>
      ))}
    </div>
  )
}
