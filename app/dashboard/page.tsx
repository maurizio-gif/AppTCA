import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'

export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const email = headers().get('x-tca-user-email')
  const sezioniConsentite = await getSezioniConsentite(email)
  const puoVedere = (chiave: string) => sezioniConsentite.includes(chiave)

  const supabase = createSupabaseServiceClient()

  const [contattiDaGestire, contattiGestiti, scuolaTennis, summerCamp, invitaAmico, iscrizioniEventi] =
    await Promise.all([
      supabase.from('form_contatti').select('*', { count: 'exact', head: true }).eq('gestito', false),
      supabase.from('form_contatti').select('*', { count: 'exact', head: true }).eq('gestito', true),
      supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }),
      supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }),
      supabase.from('form_invita_amico').select('*', { count: 'exact', head: true }),
      supabase.from('iscrizioni_eventi').select('*', { count: 'exact', head: true }),
    ])

  return (
    <div>
      <div className="page-header">
        <h1>Riepilogo</h1>
      </div>

      {puoVedere('contatti') && (
        <SezioneRiepilogo titolo="Enquiries">
          <StatCard
            href="/dashboard/contatti?filtro=da_gestire"
            label="Da gestire"
            value={contattiDaGestire.count ?? 0}
          />
          <StatCard
            href="/dashboard/contatti?filtro=gestiti"
            label="Gestiti"
            value={contattiGestiti.count ?? 0}
          />
        </SezioneRiepilogo>
      )}

      {puoVedere('scuola-tennis') && (
        <SezioneRiepilogo titolo="Scuola tennis">
          <StatCard href="/dashboard/scuola-tennis" label="Preiscrizioni" value={scuolaTennis.count ?? 0} />
        </SezioneRiepilogo>
      )}

      {puoVedere('summer-camp') && (
        <SezioneRiepilogo titolo="Summer Camp">
          <StatCard href="/dashboard/summer-camp" label="Iscrizioni" value={summerCamp.count ?? 0} />
        </SezioneRiepilogo>
      )}

      {puoVedere('invita-amico') && (
        <SezioneRiepilogo titolo="Invita un amico">
          <StatCard href="/dashboard/invita-amico" label="Inviti" value={invitaAmico.count ?? 0} />
        </SezioneRiepilogo>
      )}

      {puoVedere('iscrizioni-eventi') && (
        <SezioneRiepilogo titolo="Iscrizioni eventi">
          <StatCard href="/dashboard/iscrizioni-eventi" label="Iscrizioni" value={iscrizioniEventi.count ?? 0} />
        </SezioneRiepilogo>
      )}
    </div>
  )
}

function SezioneRiepilogo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="riepilogo-sezione">
      <h2 className="riepilogo-sezione-titolo">{titolo}</h2>
      <div className="stat-row">{children}</div>
    </section>
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
