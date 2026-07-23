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
    return <p style={{ color: '#8B1A1A' }}>Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <h1>Form contatti ("Parliamone")</h1>

      <div style={{ marginBottom: 16 }}>
        <FiltroStato attivo={searchParams.stato} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #1A1A1A' }}>
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
            <tr key={riga.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
              <td>{new Date(riga.created_at).toLocaleString('it-IT')}</td>
              <td>{riga.nome} {riga.cognome}</td>
              <td>
                {riga.email}
                <br />
                {riga.cellulare}
              </td>
              <td>
                {riga.tipo_richiesta}
                <br />
                <span style={{ color: '#555' }}>{riga.motivo}</span>
              </td>
              <td>{riga.pagina}</td>
              <td>
                <StatoSelect id={riga.id} statoIniziale={riga.stato ?? 'nuovo'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {righe?.length === 0 && <p>Nessuna richiesta trovata.</p>}
    </div>
  )
}

function FiltroStato({ attivo }: { attivo?: string }) {
  const opzioni = ['tutti', ...STATI_VALIDI]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opzioni.map((stato) => (
        <a
          key={stato}
          href={stato === 'tutti' ? '/dashboard/contatti' : `/dashboard/contatti?stato=${stato}`}
          style={{
            padding: '4px 10px',
            border: '1px solid #EBEBEB',
            borderRadius: 999,
            textDecoration: 'none',
            color: (attivo ?? 'tutti') === stato ? '#fff' : '#1A1A1A',
            background: (attivo ?? 'tutti') === stato ? '#8B1A1A' : 'transparent',
          }}
        >
          {stato}
        </a>
      ))}
    </div>
  )
}
