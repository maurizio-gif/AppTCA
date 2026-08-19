import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { invitaStaff } from './actions'
import { RimuoviButton } from './RimuoviButton'
import { PuoInvitareToggle } from './PuoInvitareToggle'
import { PuoCancellareToggle } from './PuoCancellareToggle'
import { PuoRiassegnareToggle } from './PuoRiassegnareToggle'
import { SezioniToggle } from './SezioniToggle'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { formatDateOra } from '@/lib/format'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Nome e cognome', 'Email']
const COLONNE_VISIBILI = [
  'email',
  'nome',
  'cognome',
  'puo_invitare',
  'puo_cancellare',
  'puo_riassegnare',
  'sezioni_consentite',
  'created_at',
]

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
      .select('email, nome, cognome, puo_invitare, puo_cancellare, puo_riassegnare, sezioni_consentite, created_at')
      // Sempre in ordine alfabetico di cognome, come ogni altro elenco di operatori.
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true }),
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

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>Chi ha il permesso «Può invitare» può invitare nuovi operatori e modificare i permessi altrui.</li>
          <li>
            Chi viene invitato parte con tutti i diritti (vede tutte le sezioni, può invitare); le restrizioni si
            impostano dopo, apri la sua scheda per togliere sezioni o permessi.
          </li>
          <li>
            «Sezioni visibili» decide quali voci compaiono nel menu di quella persona: sono le stesse chiavi
            elencate in questa pagina (Enquiries, Scuola tennis, Timbra cartellino, ecc.).
          </li>
          <li>«Può cancellare record» dà il diritto di cancellare definitivamente le Enquiries.</li>
          <li>
            «Può riassegnare le opportunità» serve per passare a un collega un'opportunità che non è la propria:
            chi ce l'ha in gestione può sempre passarla da sé, senza questo permesso.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Non puoi rimuovere il tuo stesso account, e senza il permesso «Può invitare» puoi solo consultare
          l'elenco.
        </p>
      </BoxIstruzioni>

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
                          <span className="detail-label">Può cancellare record</span>
                          <span className="detail-value">
                            {puoInvitare ? (
                              <PuoCancellareToggle email={s.email} puoCancellare={s.puo_cancellare} />
                            ) : s.puo_cancellare ? (
                              'Sì'
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Può riassegnare le opportunità</span>
                          <span className="detail-value">
                            {puoInvitare ? (
                              <PuoRiassegnareToggle email={s.email} puoRiassegnare={s.puo_riassegnare} />
                            ) : s.puo_riassegnare ? (
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
