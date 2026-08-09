import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { EnquiriesChart } from '@/components/EnquiriesChart'
import { FontiLead } from '@/components/FontiLead'
import { FiltroData } from '@/components/FiltroData'
import { FiltroSelect } from '@/components/FiltroSelect'
import {
  OPZIONI_RANGE,
  calcolaRange,
  chiaveGiorno,
  classificaPer,
  costruisciSerieGiornaliera,
  formatBreve,
  parsePreset,
  type DimensioneLead,
} from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const SEZIONI_LEAD: { dimensione: DimensioneLead; titolo: string }[] = [
  { dimensione: 'fonte', titolo: 'Lead per fonte' },
  { dimensione: 'campagna', titolo: 'Lead per campagna' },
  { dimensione: 'cta', titolo: 'Lead per CTA' },
  { dimensione: 'pagina', titolo: 'Lead per pagina' },
  { dimensione: 'status', titolo: 'Lead Status' },
]

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; da?: string; a?: string }
}) {
  if (!(await utenteHaSezione('analytics'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('form_contatti')
    .select('created_at, gruppo_attivita, utm_source, utm_campaign, cta, pagina, esito_verifica_pgm')
    .order('created_at')

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const righeContatti = data ?? []

  const preset = parsePreset(searchParams.range)
  const oggi = chiaveGiorno(new Date().toISOString())
  const primoGiorno = righeContatti.reduce<string | undefined>((min, riga) => {
    const chiave = chiaveGiorno(riga.created_at)
    return !min || chiave < min ? chiave : min
  }, undefined) ?? oggi
  const { da, a } = calcolaRange(preset, oggi, searchParams.da, searchParams.a, primoGiorno)
  const righeNelRange = righeContatti.filter((riga) => {
    const chiave = chiaveGiorno(riga.created_at)
    return chiave >= da && chiave <= a
  })

  const serieGiornaliera = costruisciSerieGiornaliera(righeNelRange, da, a)

  // Stessi parametri da/a in ogni link di drill-down: la lista deve
  // restare coerente col conteggio mostrato (che e' gia' filtrato sul
  // periodo scelto qui).
  const parametriPeriodo = `da=${da}&a=${a}`
  const hrefDimensione = (dimensione: DimensioneLead, chiave: string) =>
    `/dashboard/analytics/lista?dimensione=${dimensione}&chiave=${encodeURIComponent(chiave)}&${parametriPeriodo}`

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      <section className="riepilogo-sezione">
        <div className="report-range-toolbar">
          <FiltroSelect valore={preset} opzioni={[...OPZIONI_RANGE]} paramName="range" ariaLabel="Periodo report" />
          {preset === 'custom' && <FiltroData dal={da} al={a} paramDal="da" paramAl="a" />}
          <p className="muted">
            Dal {formatBreve(da)} al {formatBreve(a)}
          </p>
        </div>

        <EnquiriesChart giorni={serieGiornaliera} />

        {SEZIONI_LEAD.map(({ dimensione, titolo }) => (
          <div key={dimensione} className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">{titolo}</h3>
            <FontiLead
              fonti={classificaPer(righeNelRange, dimensione).map((voce) => ({
                ...voce,
                href: hrefDimensione(dimensione, voce.chiave),
              }))}
            />
          </div>
        ))}
      </section>
    </div>
  )
}
