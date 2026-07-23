import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Pagina sola lettura: stessa logica di /dashboard/contatti (Server Component
// + service role client), senza la parte di aggiornamento stato — qui basta
// vedere l'elenco delle preiscrizioni.
export default async function ScuolaTennisPage() {
  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_scuola_tennis')
    .select(
      'id, created_at, minore_nome, minore_cognome, genitore_nome, genitore_cognome, genitore_email, genitore_cellulare, tipo_corso, frequenza'
    )
    .order('created_at', { ascending: false })

  if (error) {
    return <p style={{ color: '#8B1A1A' }}>Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <h1>Preiscrizioni Scuola Tennis</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #1A1A1A' }}>
            <th>Data</th>
            <th>Bambino/a</th>
            <th>Genitore</th>
            <th>Corso</th>
          </tr>
        </thead>
        <tbody>
          {righe?.map((riga) => (
            <tr key={riga.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
              <td>{new Date(riga.created_at).toLocaleString('it-IT')}</td>
              <td>{riga.minore_nome} {riga.minore_cognome}</td>
              <td>
                {riga.genitore_nome} {riga.genitore_cognome}
                <br />
                {riga.genitore_email} · {riga.genitore_cellulare}
              </td>
              <td>
                {riga.tipo_corso}
                <br />
                <span style={{ color: '#555' }}>{riga.frequenza}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {righe?.length === 0 && <p>Nessuna preiscrizione trovata.</p>}
    </div>
  )
}
