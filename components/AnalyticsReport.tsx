import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { EnquiriesChart } from '@/components/EnquiriesChart'
import { TotaleChart } from '@/components/TotaleChart'
import { FontiLead } from '@/components/FontiLead'
import { FiltroData } from '@/components/FiltroData'
import { FiltroSelect } from '@/components/FiltroSelect'
import {
  OPZIONI_RANGE,
  OPZIONI_CONFRONTO,
  calcolaRange,
  calcolaConfronto,
  chiaveGiorno,
  classificaPer,
  classificaGenerico,
  costruisciSerieGiornaliera,
  costruisciSerieTotale,
  filtraPerRangeGenerico,
  deltaPercentuale,
  formatBreve,
  formatDeltaEn,
  parsePreset,
  parsePresetConfronto,
  type DimensioneLead,
} from '@/lib/analytics'

type RigaSito = Record<string, any>
type RigaStorico = Record<string, any>

export const OPZIONI_FONTE = [
  { valore: 'sito', etichetta: 'Current site' },
  { valore: 'storico', etichetta: 'HubSpot historical' },
  { valore: 'entrambi', etichetta: 'Source comparison' },
] as const
export type FonteDati = (typeof OPZIONI_FONTE)[number]['valore']

export function parseFonte(raw: string | undefined): FonteDati {
  return raw === 'storico' || raw === 'entrambi' ? raw : 'sito'
}

// "canale" e' l'unica dimensione pensata per essere confrontabile 1:1 con lo
// storico HubSpot (vedi classificaCanale in lib/analytics.ts): la mostriamo
// per prima, seguita dalle dimensioni UTM grezze e da quelle specifiche del
// sito nuovo (CTA/pagina non hanno equivalente nello storico HubSpot).
const SEZIONI_LEAD: { dimensione: DimensioneLead; titolo: string }[] = [
  { dimensione: 'canale', titolo: 'Leads by channel' },
  { dimensione: 'fonte', titolo: 'Leads by source (UTM)' },
  { dimensione: 'medium', titolo: 'Leads by medium' },
  { dimensione: 'campagna', titolo: 'Leads by campaign' },
  { dimensione: 'term', titolo: 'Leads by search term' },
  { dimensione: 'cta', titolo: 'Leads by CTA' },
  { dimensione: 'pagina', titolo: 'Leads by page' },
  { dimensione: 'status', titolo: 'Lead status' },
]

// Stesse dimensioni "condivise" del sito (canale/fonte/medium/campagna/
// term, per il confronto) piu' due dimensioni native di HubSpot senza
// equivalente sul sito nuovo (modulo_origine, contact_status). Niente CTA/
// pagina: lo storico non li ha mai tracciati.
const SEZIONI_STORICO: {
  chiave: string
  titolo: string
  accessor: (r: RigaStorico) => unknown
  etichettaVuoto: string
}[] = [
  { chiave: 'canale', titolo: 'Leads by channel', accessor: (r) => r.fonte_acquisizione, etichettaVuoto: 'Unclassified' },
  { chiave: 'fonte', titolo: 'Leads by source (UTM)', accessor: (r) => r.utm_source, etichettaVuoto: 'Not set (historical data)' },
  { chiave: 'medium', titolo: 'Leads by medium', accessor: (r) => r.utm_medium, etichettaVuoto: 'Not set (historical data)' },
  {
    chiave: 'campagna',
    titolo: 'Leads by campaign',
    accessor: (r) => r.utm_campaign || r.campagna_prima_conversione,
    etichettaVuoto: 'No campaign',
  },
  { chiave: 'term', titolo: 'Leads by search term', accessor: (r) => r.utm_term, etichettaVuoto: 'No term (historical data)' },
  { chiave: 'modulo', titolo: 'Leads by HubSpot form/module', accessor: (r) => r.modulo_origine, etichettaVuoto: 'Not detected' },
  { chiave: 'status', titolo: 'Leads by contact status', accessor: (r) => r.contact_status, etichettaVuoto: 'Not set' },
]

function classeDelta(delta: number | null): string {
  if (delta === null || delta === 0) return ''
  return delta > 0 ? 'is-positivo' : 'is-negativo'
}

function TotaleCard({ titolo, valore }: { titolo: string; valore: number }) {
  return (
    <div className="stat-card stat-card-static">
      <div className="value">{valore}</div>
      <div className="label">{titolo}</div>
    </div>
  )
}

type SearchParamsAnalytics = {
  range?: string
  da?: string
  a?: string
  fonte?: string
  confronto?: string
  cda?: string
  ca?: string
}

// Corpo del report Analytics (filtri, grafici, classifiche), condiviso tra
// la pagina interna autenticata (app/dashboard/analytics) e il link
// pubblico di sola lettura (app/report/analytics/[token]): stessa logica di
// caricamento dati e stesso rendering, per non rischiare che le due pagine
// divergano nel tempo. In modalita' pubblica non si passano gli href di
// drill-down (la lista di dettaglio mostra dati personali e resta dietro
// login).
export async function AnalyticsReport({
  searchParams,
  modalitaPubblica = false,
}: {
  searchParams: SearchParamsAnalytics
  modalitaPubblica?: boolean
}) {
  const fonte = parseFonte(searchParams.fonte)
  const supabase = createSupabaseServiceClient()

  // Fetch solo delle tabelle richieste dalla fonte scelta: lo storico
  // HubSpot (4000 righe) non serve caricarlo quando si guarda solo il sito,
  // e viceversa.
  let righeSito: RigaSito[] = []
  let righeStorico: RigaStorico[] = []

  if (fonte === 'sito' || fonte === 'entrambi') {
    const { data, error } = await supabase
      .from('form_contatti')
      .select('created_at, gruppo_attivita, utm_source, utm_medium, utm_campaign, utm_term, cta, pagina, esito_verifica_pgm')
      .order('created_at')
    if (error) return <p className="error-banner">Error loading data (site): {error.message}</p>
    righeSito = data ?? []
  }

  if (fonte === 'storico' || fonte === 'entrambi') {
    // Supabase limita ogni singola richiesta a 1000 righe (db_max_rows di
    // PostgREST): lo storico ne ha ~4000, quindi va paginato, altrimenti
    // si vedrebbe solo un quarto dei lead (i piu' vecchi, essendo l'ordine
    // per data_acquisizione crescente).
    const DIMENSIONE_PAGINA = 1000
    for (let pagina = 0; ; pagina++) {
      const { data, error } = await supabase
        .from('lead_hubspot_storico')
        .select('data_acquisizione, fonte_acquisizione, utm_source, utm_medium, utm_campaign, utm_term, modulo_origine, campagna_prima_conversione, contact_status')
        .order('data_acquisizione')
        .range(pagina * DIMENSIONE_PAGINA, pagina * DIMENSIONE_PAGINA + DIMENSIONE_PAGINA - 1)
      if (error) return <p className="error-banner">Error loading data (historical): {error.message}</p>
      righeStorico = righeStorico.concat(data ?? [])
      if (!data || data.length < DIMENSIONE_PAGINA) break
    }
  }

  const oggi = chiaveGiorno(new Date().toISOString())

  const primoGiornoSito = righeSito.reduce<string | undefined>((min, r) => {
    const chiave = chiaveGiorno(r.created_at)
    return !min || chiave < min ? chiave : min
  }, undefined)
  const primoGiornoStorico = righeStorico.reduce<string | undefined>((min, r) => {
    if (!r.data_acquisizione) return min
    const chiave = chiaveGiorno(r.data_acquisizione)
    return !min || chiave < min ? chiave : min
  }, undefined)
  const primoGiorno = [primoGiornoSito, primoGiornoStorico].filter((v): v is string => !!v).sort()[0] ?? oggi

  // Il confronto tra sorgenti nasce per rispondere a "come sta andando
  // questo mese rispetto allo stesso periodo dell'anno scorso": parte gia'
  // cosi' invece di "Tutto" + nessun confronto, che li' non direbbe nulla
  // (le due fonti non si sovrappongono quasi mai).
  const preset = parsePreset(searchParams.range, fonte === 'entrambi' ? 'mtd' : 'tutto')
  const { da, a } = calcolaRange(preset, oggi, searchParams.da, searchParams.a, primoGiorno)

  // Il periodo di confronto esiste solo per fonte="entrambi": storico e
  // sito non coesistono (uno si e' fermato il 22/07/2026, l'altro e'
  // appena partito), quindi li' non confronta "prima vs dopo" sulla stessa
  // fonte, ma applica il periodo principale al sito (attuale) e il periodo
  // di confronto allo storico (es. "agosto 2026" sul sito vs "agosto 2025"
  // su HubSpot). Sulle altre fonti il confronto periodo su periodo non ha
  // dato risultati leggibili, quindi non e' piu' esposto in UI.
  const presetConfronto =
    fonte === 'entrambi' ? parsePresetConfronto(searchParams.confronto, 'anno_precedente') : 'nessuno'
  const rangeConfronto = calcolaConfronto(presetConfronto, da, a, searchParams.cda, searchParams.ca)

  const righeSitoPeriodo = filtraPerRangeGenerico(righeSito, (r) => r.created_at, da, a)
  const righeStoricoPeriodo = filtraPerRangeGenerico(righeStorico, (r) => r.data_acquisizione, da, a)
  const righeStoricoConfronto = rangeConfronto
    ? filtraPerRangeGenerico(righeStorico, (r) => r.data_acquisizione, rangeConfronto.da, rangeConfronto.a)
    : null

  // Stessi parametri da/a in ogni link di drill-down: la lista deve
  // restare coerente col conteggio mostrato (che e' gia' filtrato sul
  // periodo scelto qui). Solo il sito ha una lista di dettaglio, e solo
  // nella pagina autenticata: il link pubblico non deve poter arrivare ai
  // dati personali della lista.
  const parametriPeriodo = `da=${da}&a=${a}`
  const hrefDimensione = modalitaPubblica
    ? undefined
    : (dimensione: DimensioneLead, chiave: string) =>
        `/dashboard/analytics/lista?dimensione=${dimensione}&chiave=${encodeURIComponent(chiave)}&${parametriPeriodo}`

  return (
    <>
      <p className="muted analytics-sottotitolo">
        <strong>Current site</strong> — enquiries submitted on the new website. <strong>HubSpot historical</strong> —
        leads imported from HubSpot before the switch (snapshot as of 22 July 2026). <strong>Source comparison</strong>{' '}
        — current site vs. HubSpot historical for the same period last year.
      </p>

      <section className="riepilogo-sezione">
        <div className="report-range-toolbar">
          <label className="report-range-campo">
            <span>Data source</span>
            <FiltroSelect
              valore={fonte}
              opzioni={[...OPZIONI_FONTE]}
              paramName="fonte"
              ariaLabel="Data source"
              azzera={['range', 'da', 'a', 'confronto', 'cda', 'ca']}
            />
          </label>
          <label className="report-range-campo">
            <span>Period</span>
            <FiltroSelect valore={preset} opzioni={[...OPZIONI_RANGE]} paramName="range" ariaLabel="Report period" />
          </label>
          {preset === 'custom' && (
            <FiltroData dal={da} al={a} paramDal="da" paramAl="a" etichettaDal="From" etichettaAl="To" />
          )}
          {fonte === 'entrambi' && (
            <label className="report-range-campo">
              <span>Historical period</span>
              <FiltroSelect
                valore={presetConfronto}
                opzioni={[...OPZIONI_CONFRONTO]}
                paramName="confronto"
                ariaLabel="Historical comparison period"
              />
            </label>
          )}
          {fonte === 'entrambi' && presetConfronto === 'personalizzato' && (
            <FiltroData
              dal={searchParams.cda ?? ''}
              al={searchParams.ca ?? ''}
              paramDal="cda"
              paramAl="ca"
              etichettaDal="From"
              etichettaAl="To"
            />
          )}
        </div>
        <p className="muted">
          {fonte === 'entrambi' ? (
            <>
              Site from {formatBreve(da)} to {formatBreve(a)}
              {rangeConfronto && (
                <> — historical from {formatBreve(rangeConfronto.da)} to {formatBreve(rangeConfronto.a)}</>
              )}
              {!rangeConfronto && <> — historical in the same period</>}
            </>
          ) : (
            <>
              From {formatBreve(da)} to {formatBreve(a)}
            </>
          )}
        </p>

        {fonte === 'sito' && (
          <>
            <div className="stat-row">
              <TotaleCard titolo="Enquiries in period" valore={righeSitoPeriodo.length} />
            </div>

            <EnquiriesChart giorni={costruisciSerieGiornaliera(righeSitoPeriodo, da, a)} />

            {SEZIONI_LEAD.map(({ dimensione, titolo }) => {
              const fonti = classificaPer(righeSitoPeriodo, dimensione).map((voce) => ({
                ...voce,
                href: hrefDimensione?.(dimensione, voce.chiave),
              }))
              return (
                <div key={dimensione} className="riepilogo-sottosezione">
                  <h3 className="riepilogo-sottosezione-titolo">{titolo}</h3>
                  <FontiLead fonti={fonti} messaggioVuoto="Nothing to show for this period yet." formatDelta={formatDeltaEn} />
                </div>
              )
            })}
          </>
        )}

        {fonte === 'storico' && (
          <>
            <div className="stat-row">
              <TotaleCard titolo="Historical leads in period" valore={righeStoricoPeriodo.length} />
            </div>

            <TotaleChart giorni={costruisciSerieTotale(righeStoricoPeriodo, (r) => r.data_acquisizione, da, a)} />

            {SEZIONI_STORICO.map(({ chiave, titolo, accessor, etichettaVuoto }) => (
              <div key={chiave} className="riepilogo-sottosezione">
                <h3 className="riepilogo-sottosezione-titolo">{titolo}</h3>
                <FontiLead
                  fonti={classificaGenerico(righeStoricoPeriodo, accessor, etichettaVuoto)}
                  messaggioVuoto="Nothing to show for this period yet."
                  formatDelta={formatDeltaEn}
                />
              </div>
            ))}
          </>
        )}

        {fonte === 'entrambi' && (() => {
          // Il sito resta sempre sul periodo principale (created_at); lo
          // storico usa il periodo di confronto (data_acquisizione) se
          // scelto, altrimenti ricade sullo stesso periodo del sito (utile
          // solo per le finestre in cui le due fonti si sono sovrapposte).
          // Solo il totale lead, senza suddivisioni per canale/campagna:
          // le due fonti hanno tassonomie diverse, un confronto semplice
          // sul numero di lead e' piu' onesto di un dettaglio che sembra
          // preciso ma paragona categorie non equivalenti.
          const righeStoricoConfrontate = righeStoricoConfronto ?? righeStoricoPeriodo
          const etichettaStorico = rangeConfronto
            ? `HubSpot historical (from ${formatBreve(rangeConfronto.da)} to ${formatBreve(rangeConfronto.a)})`
            : 'HubSpot historical in the same period'
          const delta = deltaPercentuale(righeSitoPeriodo.length, righeStoricoConfrontate.length)
          return (
            <div className="stat-row">
              <div className="stat-card stat-card-static">
                <div className="value">{righeStoricoConfrontate.length}</div>
                <div className="label">{etichettaStorico}</div>
              </div>
              <div className="stat-card stat-card-static">
                <div className="value">{righeSitoPeriodo.length}</div>
                <div className="label">Current site in period</div>
                <div className={`stat-card-delta ${classeDelta(delta)}`}>
                  {formatDeltaEn(delta)} vs historical
                </div>
              </div>
            </div>
          )
        })()}
      </section>
    </>
  )
}
