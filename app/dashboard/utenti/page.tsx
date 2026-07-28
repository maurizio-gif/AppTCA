import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { invitaStaff } from './actions'
import { RimuoviButton } from './RimuoviButton'
import { PuoInvitareToggle } from './PuoInvitareToggle'
import { formatDateOra } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function UtentiPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  const supabase = createSupabaseServiceClient()
  const emailCorrente = headers().get('x-tca-user-email')

  const [{ data: staff, error }, { data: viewer }] = await Promise.all([
    supabase
      .from('staff_users')
      .select('email, nome, cognome, puo_invitare, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('staff_users')
      .select('puo_invitare')
      .eq('email', emailCorrente ?? '')
      .maybeSingle(),
  ])

  const puoInvitare = !!viewer?.puo_invitare

  return (
    <div>
      <div className="page-header">
        <h1>Gestione utenti</h1>
      </div>

      {puoInvitare ? (
        <div className="login-card" style={{ maxWidth: 480, margin: '0 0 28px' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Invita un nuovo utente</h2>

          {searchParams.error && <p className="error-banner">{searchParams.error}</p>}
          {searchParams.ok && (
            <p className="muted" style={{ marginBottom: 16 }}>
              Invito inviato. La persona riceverà un'email per impostare password, nome e cognome.
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
      ) : (
        <p className="muted" style={{ marginBottom: 20 }}>
          Non hai il permesso di invitare nuovi utenti: puoi solo consultare l'elenco.
        </p>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Aggiunto il</th>
              <th>Permessi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff?.map((s) => (
              <tr key={s.email}>
                <td>{s.nome || s.cognome ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : '—'}</td>
                <td>{s.email}</td>
                <td>{formatDateOra(s.created_at)}</td>
                <td>
                  {puoInvitare ? (
                    <PuoInvitareToggle email={s.email} puoInvitare={s.puo_invitare} />
                  ) : s.puo_invitare ? (
                    'Può invitare'
                  ) : (
                    '—'
                  )}
                </td>
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
