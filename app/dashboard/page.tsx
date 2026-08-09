import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, type GruppoContatto } from '@/lib/contatti'

export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const email = headers().get('x-tca-user-email')
  const sezioniConsentite = await getSezioniConsentite(email)
  const puoVedere = (chiave: string) => sezioniConsentite.includes(chiave)

  const supabase = createSupabaseServiceClient()

  const [
    contattiPerRiepilogo,
    scuolaTennisDaCaricare,
    scuolaTennisCaricato,
    summerCampDaCaricare,
    summerCampCaricato,
    invitaAmico,
    iscrizioniEventi,
  ] = await Promise.all([
    supabase.from('form_contatti').select('gruppo_attivita, gestito'),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_invita_amico').select('*', { count: 'exact', head: true }),
    supabase.from('iscrizioni_eventi').select('*', { count: 'exact', head: true }),
  ])

  const righeContatti = contattiPerRiepilogo.data ?? []

  // Stesso criterio Adulti/Junior usato dalle due sezioni Enquiries (vedi
  // lib/contatti.ts): i contatori "da gestire" restano il carico di lavoro
  // attuale.
  function contaContatti(gruppo: GruppoContatto, gestito: boolean) {
    return righeContatti.filter(
      (riga) => apparteneAGruppo(riga.gruppo_attivita, gruppo) && !!riga.gestito === gestito
    ).length
  }

  const contattiAdultiDaGestire = contaContatti('adulti', false)
  const contattiAdultiGestiti = contaContatti('adulti', true)
  const contattiJuniorDaGestire = contaContatti('junior', false)
  const contattiJuniorGestiti = contaContatti('junior', true)

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {puoVedere('dashboard-enquiries') && (
        <section className="riepilogo-sezione">
          <h2 className="riepilogo-sezione-titolo">Enquiries</h2>

          {puoVedere('contatti-adulti') && (
            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Adulti</h3>
              <div className="stat-row">
                <StatCard
                  href="/dashboard/contatti/adulti?filtro=da_gestire"
                  label="Da gestire"
                  value={contattiAdultiDaGestire}
                />
                <StatCard
                  href="/dashboard/contatti/adulti?filtro=gestiti"
                  label="Gestiti"
                  value={contattiAdultiGestiti}
                />
              </div>
            </div>
          )}

          {puoVedere('contatti-junior') && (
            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Junior</h3>
              <div className="stat-row">
                <StatCard
                  href="/dashboard/contatti/junior?filtro=da_gestire"
                  label="Da gestire"
                  value={contattiJuniorDaGestire}
                />
                <StatCard
                  href="/dashboard/contatti/junior?filtro=gestiti"
                  label="Gestiti"
                  value={contattiJuniorGestiti}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {puoVedere('scuola-tennis') && (
        <SezioneRiepilogo titolo="Scuola tennis">
          <StatCard
            href="/dashboard/scuola-tennis?filtro=da_caricare"
            label="Da caricare"
            value={scuolaTennisDaCaricare.count ?? 0}
          />
          <StatCard
            href="/dashboard/scuola-tennis?filtro=caricato"
            label="Caricato"
            value={scuolaTennisCaricato.count ?? 0}
          />
        </SezioneRiepilogo>
      )}

      {puoVedere('summer-camp') && (
        <SezioneRiepilogo titolo="Summer Camp">
          <StatCard
            href="/dashboard/summer-camp?filtro=da_caricare"
            label="Da caricare"
            value={summerCampDaCaricare.count ?? 0}
          />
          <StatCard
            href="/dashboard/summer-camp?filtro=caricato"
            label="Caricato"
            value={summerCampCaricato.count ?? 0}
          />
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

function SezioneRiepilogo({
  titolo,
  children,
  extra,
}: {
  titolo: string
  children: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <section className="riepilogo-sezione">
      <h2 className="riepilogo-sezione-titolo">{titolo}</h2>
      <div className="stat-row">{children}</div>
      {extra}
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
