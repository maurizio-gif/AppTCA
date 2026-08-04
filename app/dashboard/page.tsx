import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { EnquiriesChart } from '@/components/EnquiriesChart'
import { FontiLead } from '@/components/FontiLead'
import { apparteneAGruppo, type GruppoContatto } from '@/lib/contatti'
import { prettifyKey } from '@/lib/format'

export const dynamic = 'force-dynamic'

// Chiave di giorno (YYYY-MM-DD) nel fuso di Roma, cosi' un'enquiry delle
// 00:30 non finisce sul giorno UTC precedente (vedi anche formatDateOra).
function chiaveGiorno(valoreISO: string): string {
  return new Date(valoreISO).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
}

function aggiungiGiorni(chiave: string, giorni: number): string {
  const d = new Date(`${chiave}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

type PuntoGiorno = { data: string; adulti: number; junior: number; altro: number }

// Serie continua giorno per giorno dalla prima enquiry ad oggi (fuso Roma),
// riempita a zero dove manca - cosi' il grafico ha una scala temporale
// reale invece di "saltare" i giorni senza enquiry.
function costruisciSerieGiornaliera(righe: { created_at: string; gruppo_attivita: string | null }[]): PuntoGiorno[] {
  if (righe.length === 0) return []

  const conteggi = new Map<string, { adulti: number; junior: number; altro: number }>()

  for (const riga of righe) {
    const chiave = chiaveGiorno(riga.created_at)
    const bucket = conteggi.get(chiave) ?? { adulti: 0, junior: 0, altro: 0 }
    const gruppo = (riga.gruppo_attivita || '').toLowerCase()
    if (gruppo === 'adulti') bucket.adulti += 1
    else if (gruppo === 'junior') bucket.junior += 1
    else bucket.altro += 1
    conteggi.set(chiave, bucket)
  }

  const chiavi = [...conteggi.keys()].sort()
  const primoGiorno = chiavi[0]
  const oggi = chiaveGiorno(new Date().toISOString())

  const serie: PuntoGiorno[] = []
  for (let giorno = primoGiorno; giorno <= oggi; giorno = aggiungiGiorni(giorno, 1)) {
    const bucket = conteggi.get(giorno) ?? { adulti: 0, junior: 0, altro: 0 }
    serie.push({ data: giorno, ...bucket })
  }
  return serie
}

// Chi arriva senza utm_source (link diretto, digitato a mano, passaparola
// non tracciato) e' comunque una fonte a tutti gli effetti: "Organico".
function classificaPerFonte(righe: { utm_source: string | null }[]): { fonte: string; conteggio: number }[] {
  const conteggi = new Map<string, number>()
  for (const riga of righe) {
    const chiave = (riga.utm_source || '').trim().toLowerCase() || 'organico'
    conteggi.set(chiave, (conteggi.get(chiave) ?? 0) + 1)
  }
  return [...conteggi.entries()]
    .map(([chiave, conteggio]) => ({ fonte: chiave === 'organico' ? 'Organico' : prettifyKey(chiave), conteggio }))
    .sort((a, b) => b.conteggio - a.conteggio)
}

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
    supabase.from('form_contatti').select('created_at, gruppo_attivita, gestito, utm_source').order('created_at'),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_scuola_tennis').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', false),
    supabase.from('form_summer_camp').select('*', { count: 'exact', head: true }).eq('caricato_pgm', true),
    supabase.from('form_invita_amico').select('*', { count: 'exact', head: true }),
    supabase.from('iscrizioni_eventi').select('*', { count: 'exact', head: true }),
  ])

  const righeContatti = contattiPerRiepilogo.data ?? []
  const serieGiornaliera = costruisciSerieGiornaliera(righeContatti)
  const fontiLead = classificaPerFonte(righeContatti)

  // Stesso criterio Adulti/Junior usato dalle due sezioni Enquiries (vedi
  // lib/contatti.ts): i contatori qui restano coerenti con cosa si trova
  // aprendo /dashboard/contatti/adulti o /junior.
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

      {(puoVedere('contatti-adulti') || puoVedere('contatti-junior')) && (
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

          <EnquiriesChart giorni={serieGiornaliera} />

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">Lead per fonte</h3>
            <FontiLead fonti={fontiLead} />
          </div>
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
