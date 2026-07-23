import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { ExpandableRow } from '@/components/ExpandableRow'

export const dynamic = 'force-dynamic'

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'email_socio',
  'amico_nome',
  'amico_cognome',
  'amico_email',
  'amico_prefisso',
  'amico_cellulare',
]

export default async function InvitaAmicoPage() {
  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_invita_amico')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Inviti "Invita un amico"</h1>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Socio</th>
              <th>Amico invitato</th>
            </tr>
          </thead>
          <tbody>
            {righe?.map((riga) => (
              <ExpandableRow
                key={riga.id}
                columnCount={4}
                record={riga}
                hiddenKeys={COLONNE_VISIBILI}
                cells={[
                  new Date(riga.created_at).toLocaleString('it-IT'),
                  riga.email_socio,
                  <>
                    {riga.amico_nome} {riga.amico_cognome}
                    <br />
                    <span className="muted">
                      {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
                    </span>
                  </>,
                ]}
              />
            ))}
          </tbody>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessun invito trovato.</p>}
      </div>
    </div>
  )
}
