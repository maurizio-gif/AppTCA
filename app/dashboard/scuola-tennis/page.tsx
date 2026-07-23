import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { ExpandableRow } from '@/components/ExpandableRow'

export const dynamic = 'force-dynamic'

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'minore_nome',
  'minore_cognome',
  'genitore_nome',
  'genitore_cognome',
  'genitore_email',
  'genitore_cellulare',
  'tipo_corso',
  'frequenza',
]

// Pagina sola lettura: stessa logica di /dashboard/contatti (Server Component
// + service role client), senza la parte di aggiornamento stato — qui basta
// vedere l'elenco delle preiscrizioni.
export default async function ScuolaTennisPage() {
  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_scuola_tennis')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Preiscrizioni Scuola Tennis</h1>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Bambino/a</th>
              <th>Genitore</th>
              <th>Corso</th>
            </tr>
          </thead>
          <tbody>
            {righe?.map((riga) => (
              <ExpandableRow
                key={riga.id}
                columnCount={5}
                record={riga}
                hiddenKeys={COLONNE_VISIBILI}
                cells={[
                  new Date(riga.created_at).toLocaleString('it-IT'),
                  <>{riga.minore_nome} {riga.minore_cognome}</>,
                  <>
                    {riga.genitore_nome} {riga.genitore_cognome}
                    <br />
                    <span className="muted">{riga.genitore_email} · {riga.genitore_cellulare}</span>
                  </>,
                  <>
                    {riga.tipo_corso}
                    <br />
                    <span className="muted">{riga.frequenza}</span>
                  </>,
                ]}
              />
            ))}
          </tbody>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessuna preiscrizione trovata.</p>}
      </div>
    </div>
  )
}
