import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

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
        <StatCard href="/dashboard/contatti" label="Richieste contatto" value={contatti.count ?? 0} />
        <StatCard href="/dashboard/scuola-tennis" label="Preiscrizioni scuola tennis" value={scuolaTennis.count ?? 0} />
        <StatCard href="/dashboard/invita-amico" label="Inviti amico" value={invitaAmico.count ?? 0} />
        <StatCard href="/dashboard/iscrizioni-eventi" label="Iscrizioni eventi" value={iscrizioniEventi.count ?? 0} />
      </div>
    </div>
  )
}

function StatCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="stat-card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </Link>
  )
}
