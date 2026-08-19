import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, type GruppoContatto } from '@/lib/contatti'
import { normalizzaStato, type StatoPipeline } from '@/lib/pipeline'

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
    invitiPerRiepilogo,
    iscrizioniEventi,
  ] = await Promise.all([
    supabase.from('form_contatti').select('gruppo_attivita, opportunita_id'),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_invita_amico').select('stato, credito_caricato'),
    supabase.from('iscrizioni_eventi').select('*', { count: 'exact', head: true }),
  ])

  const righeContatti = contattiPerRiepilogo.data ?? []

  // Il carico di lavoro delle Enquiries e' lo stato dell'opportunita' della
  // persona, non piu' un flag sulla richiesta: servono quindi gli stati delle
  // opportunita' collegate.
  const opportunitaIds = [...new Set(righeContatti.map((r) => r.opportunita_id).filter(Boolean))] as string[]
  const { data: opportunitaContatti } = opportunitaIds.length
    ? await supabase.from('opportunita').select('id, stato').in('id', opportunitaIds)
    : { data: [] as { id: string; stato: string }[] }
  const statoOpportunita = new Map((opportunitaContatti ?? []).map((o) => [o.id, normalizzaStato(o.stato)]))

  // Stesso criterio Adulti/Junior usato dalle due sezioni Enquiries (vedi
  // lib/contatti.ts). Una richiesta senza opportunita' (manca l'email, quindi
  // non c'e' una persona) conta come da prendere in carico: e' lavoro che
  // qualcuno deve guardare, non deve sparire dai numeri.
  function contaContatti(gruppo: GruppoContatto, stato: StatoPipeline) {
    return righeContatti.filter(
      (riga) =>
        apparteneAGruppo(riga.gruppo_attivita, gruppo) &&
        (riga.opportunita_id ? statoOpportunita.get(riga.opportunita_id) ?? 'nuovo' : 'nuovo') === stato
    ).length
  }

  const contattiAdultiDaPrendere = contaContatti('adulti', 'nuovo')
  const contattiAdultiInGestione = contaContatti('adulti', 'in_gestione')
  const contattiJuniorDaPrendere = contaContatti('junior', 'nuovo')
  const contattiJuniorInGestione = contaContatti('junior', 'in_gestione')

  // Contatori di "Invita un amico": opportunita' da prendere in carico, in
  // gestione, e referral vinti col credito del socio ancora da caricare - che
  // e' l'unica cosa che li tiene aperti.
  const righeInviti = invitiPerRiepilogo.data ?? []
  const contaInviti = (stato: StatoPipeline) =>
    righeInviti.filter((riga) => normalizzaStato(riga.stato) === stato).length
  const invitiCreditoDaCaricare = righeInviti.filter(
    (riga) => normalizzaStato(riga.stato) === 'vinto' && !riga.credito_caricato
  ).length


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
                  href="/dashboard/contatti/adulti?filtro=da_prendere"
                  label="Da prendere in carico"
                  value={contattiAdultiDaPrendere}
                />
                <StatCard
                  href="/dashboard/contatti/adulti?filtro=in_gestione"
                  label="In gestione"
                  value={contattiAdultiInGestione}
                />
              </div>
            </div>
          )}

          {puoVedere('contatti-junior') && (
            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Junior</h3>
              <div className="stat-row">
                <StatCard
                  href="/dashboard/contatti/junior?filtro=da_prendere"
                  label="Da prendere in carico"
                  value={contattiJuniorDaPrendere}
                />
                <StatCard
                  href="/dashboard/contatti/junior?filtro=in_gestione"
                  label="In gestione"
                  value={contattiJuniorInGestione}
                />
              </div>
            </div>
          )}

          {puoVedere('invita-amico') && (
            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Invita un amico</h3>
              <div className="stat-row">
                <StatCard
                  href="/dashboard/invita-amico?filtro=nuovi"
                  label="Da prendere in carico"
                  value={contaInviti('nuovo')}
                />
                <StatCard
                  href="/dashboard/invita-amico?filtro=in_gestione"
                  label="In gestione"
                  value={contaInviti('in_gestione')}
                />
                <StatCard
                  href="/dashboard/invita-amico?filtro=da_caricare"
                  label="Credito da caricare"
                  value={invitiCreditoDaCaricare}
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
