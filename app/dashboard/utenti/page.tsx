import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { invitaStaff } from './actions'
import { RimuoviButton } from './RimuoviButton'

export const dynamic = 'force-dynamic'

export default async function UtentiPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  const supabase = createSupabaseServiceClient()

  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('email, created_at')
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="page-header">
        <h1>Gestione utenti</h1>
      </div>

      <div className="login-card" style={{ maxWidth: 480, margin: '0 0 28px' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Invita un nuovo utente</h2>

        {searchParams.error && <p className="error-banner">{searchParams.error}</p>}
        {searchParams.ok && (
          <p className="muted" style={{ marginBottom: 16 }}>
            Invito inviato. La persona riceverà un'email per impostare la password.
          </p>
        )}

        <form action={invitaStaff}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="nome@esempio.it" />
          </div>
          <button type="submit" className="btn">
            Invita
          </button>
        </form>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Aggiunto il</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff?.map((s) => (
              <tr key={s.email}>
                <td>{s.email}</td>
                <td>{new Date(s.created_at).toLocaleString('it-IT')}</td>
                <td>
                  <RimuoviButton email={s.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="error-banner">Errore nel caricamento: {error.message}</p>}
        {staff?.length === 0 && <p className="empty-state">Nessun utente ancora.</p>}
      </div>
    </div>
  )
}
