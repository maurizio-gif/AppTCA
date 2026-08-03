import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { formatDateOra } from '@/lib/format'
import { AZIONI_LOG, etichettaAzione, formattaDettagliLog } from '@/lib/audit'
import { FiltroSelect } from '@/components/FiltroSelect'

export const dynamic = 'force-dynamic'

// Un pannello di segreteria non genera migliaia di azioni al giorno: 300
// righe piu' recenti (dopo i filtri, vedi sotto) bastano abbondantemente
// senza bisogno di una paginazione vera.
const LIMITE = 300

export default async function LogOperatoriPage({
  searchParams,
}: {
  searchParams: { operatore?: string; azione?: string }
}) {
  if (!(await utenteHaSezione('log-operatori'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const operatoreFiltro = searchParams.operatore ?? 'tutti'
  const azioneFiltro = searchParams.azione ?? 'tutte'

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LIMITE)

  if (operatoreFiltro !== 'tutti') query = query.eq('email', operatoreFiltro)
  if (azioneFiltro !== 'tutte') query = query.eq('azione', azioneFiltro)

  const [{ data: righe, error }, { data: staffAll }, { data: emailLog }] = await Promise.all([
    query,
    supabase.from('staff_users').select('email, nome, cognome'),
    supabase.from('audit_log').select('email'),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  // Chi ha fatto almeno un'azione, non solo lo staff attuale: cosi' resta
  // filtrabile anche un operatore rimosso in seguito, o un tentativo di
  // accesso con un'email non autorizzata.
  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  const emailUniche = [...new Set((emailLog ?? []).map((r) => r.email).filter((e): e is string => !!e))].sort()

  const opzioniOperatori = [
    { valore: 'tutti', etichetta: 'Tutti gli operatori' },
    ...emailUniche.map((email) => {
      const s = mappaStaff.get(email)
      const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
      return { valore: email, etichetta: nomeCompleto || email }
    }),
  ]

  const opzioniAzioni = [
    { valore: 'tutte', etichetta: 'Tutte le azioni' },
    ...Object.entries(AZIONI_LOG).map(([chiave, etichetta]) => ({ valore: chiave, etichetta })),
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Log operatori</h1>
      </div>

      <p className="muted" style={{ marginBottom: 16 }}>
        Le azioni piu' significative fatte dagli operatori nel pannello: accessi, permessi modificati, contatti
        gestiti o cancellati, iscrizioni segnate su PerfectGym. Non e' un log di ogni singolo click, solo delle
        azioni con un effetto reale.
      </p>

      <div className="filtri-toolbar">
        <FiltroSelect
          valore={operatoreFiltro}
          opzioni={opzioniOperatori}
          paramName="operatore"
          ariaLabel="Filtra per operatore"
        />
        <FiltroSelect valore={azioneFiltro} opzioni={opzioniAzioni} paramName="azione" ariaLabel="Filtra per azione" />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Operatore</th>
              <th>Azione</th>
              <th>Dettagli</th>
            </tr>
          </thead>
          <tbody>
            {(righe ?? []).map((riga) => (
              <tr key={riga.id}>
                <td data-label="Quando">{formatDateOra(riga.created_at)}</td>
                <td data-label="Operatore">{riga.email ?? '—'}</td>
                <td data-label="Azione">{etichettaAzione(riga.azione)}</td>
                <td data-label="Dettagli">{formattaDettagliLog(riga)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(righe ?? []).length === 0 && <p className="empty-state">Nessuna azione registrata.</p>}
        {(righe ?? []).length === LIMITE && (
          <p className="muted" style={{ marginTop: 12 }}>
            Mostrate le {LIMITE} azioni più recenti per questo filtro: restringi la ricerca per vederne altre.
          </p>
        )}
      </div>
    </div>
  )
}
