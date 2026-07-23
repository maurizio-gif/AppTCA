import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export default async function DashboardHome() {
  const supabase = createSupabaseServiceClient()

  const [contatti, scuolaTennis, invitaAmico, iscrizioniEventi] = await Promise.all([
    supabase.from('form_contatti').select('*', { count: 'exact', head: true }),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }),
    supabase.from('form_invita_amico').select('*', { count: 'exact', head: true }),
    supabase.from('iscrizioni_eventi').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div>
      <div className="page-header">
        <h1>Riepilogo</h1>
      </div>
      <div className="stat-row">
        <StatCard label="Richieste contatto" value={contatti.count ?? 0} />
        <StatCard label="Preiscrizioni scuola tennis" value={scuolaTennis.count ?? 0} />
        <StatCard label="Inviti amico" value={invitaAmico.count ?? 0} />
        <StatCard label="Iscrizioni eventi" value={iscrizioniEventi.count ?? 0} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
