import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export default async function InvitaAmicoPage() {
  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_invita_amico')
    .select(
      'id, created_at, email_socio, amico_nome, amico_cognome, amico_email, amico_prefisso, amico_cellulare'
    )
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
              <th>Data</th>
              <th>Socio</th>
              <th>Amico invitato</th>
            </tr>
          </thead>
          <tbody>
            {righe?.map((riga) => (
              <tr key={riga.id}>
                <td>{new Date(riga.created_at).toLocaleString('it-IT')}</td>
                <td>{riga.email_socio}</td>
                <td>
                  {riga.amico_nome} {riga.amico_cognome}
                  <br />
                  <span className="muted">
                    {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessun invito trovato.</p>}
      </div>
    </div>
  )
}
