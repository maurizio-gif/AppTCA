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
    return <p style={{ color: '#8B1A1A' }}>Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <h1>Inviti "Invita un amico"</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #1A1A1A' }}>
            <th>Data</th>
            <th>Socio</th>
            <th>Amico invitato</th>
          </tr>
        </thead>
        <tbody>
          {righe?.map((riga) => (
            <tr key={riga.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
              <td>{new Date(riga.created_at).toLocaleString('it-IT')}</td>
              <td>{riga.email_socio}</td>
              <td>
                {riga.amico_nome} {riga.amico_cognome}
                <br />
                {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {righe?.length === 0 && <p>Nessun invito trovato.</p>}
    </div>
  )
}
