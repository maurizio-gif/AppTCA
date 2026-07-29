import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { invitaStaff } from './actions'
import { RimuoviButton } from './RimuoviButton'
import { PuoInvitareToggle } from './PuoInvitareToggle'
import { SezioniToggle } from './SezioniToggle'
import { formatDateOra } from '@/lib/format'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Nome e cognome', 'Email']
const COLONNE_VISIBILI = ['email', 'nome', 'cognome', 'puo_invitare', 'sezioni_consentite', 'created_at']

export default async function UtentiPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  if (!(await utenteHaSezione('utenti'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = headers().get('x-tca-user-email')

  const [{ data: staff, error }, { data: viewer }] = await Promise.all([
    supabase
      .from('staff_users')
      .select('email, nome, cognome, puo_invitare, sezioni_consentite, created_at')
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
              Invito inviato con tutti i diritti di accesso. La persona riceverà un'email per impostare la password.
            </p>
          )}

          <form action={invitaStaff}>
            <div className="field">
              <label htmlFor="nome">Nome</label>
              <input id="nome" name="nome" type="text" required placeholder="Maria" />
            </div>
            <div className="field">
              <label htmlFor="cognome">Cognome</label>
              <input id="cognome" name="cognome" type="text" required placeholder="Rossi" />
            </div>
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
              <th></th>
              <th>Nome e cognome</th>
              <th>Email</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {staff?.map((s) => (
                <ExpandableRow
                  key={s.email}
                  id={s.email}
                  columnCount={3}
                  columns={COLONNE_TABELLA}
                  record={s}
                  hiddenKeys={COLONNE_VISIBILI}
                  extraTitle="Dettagli"
                  extra={
                    <>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Aggiunto il</span>
                          <span className="detail-value">{formatDateOra(s.created_at)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Può invitare</span>
                          <span className="detail-value">
                            {puoInvitare ? (
                              <PuoInvitareToggle email={s.email} puoInvitare={s.puo_invitare} />
                            ) : s.puo_invitare ? (
                              'Sì'
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Sezioni visibili</span>
                          <div className="detail-value">
                            {puoInvitare ? (
                              <SezioniToggle email={s.email} sezioniAttive={s.sezioni_consentite} />
                            ) : (
                              s.sezioni_consentite.join(', ') || '—'
                            )}
                          </div>
                        </div>
                      </div>
                      <RimuoviButton email={s.email} />
                    </>
                  }
                  cells={[
                    s.nome || s.cognome ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : '—',
                    <a href={`mailto:${s.email}`} className="contact-link">
                      {s.email}
                    </a>,
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>
        {error && <p className="error-banner">Errore nel caricamento: {error.message}</p>}
        {staff?.length === 0 && <p className="empty-state">Nessun utente ancora.</p>}
      </div>
    </div>
  )
}
