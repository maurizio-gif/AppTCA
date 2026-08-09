import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { EnquiriesChart } from '@/components/EnquiriesChart'
import { TotaleChart } from '@/components/TotaleChart'
import { FontiLead } from '@/components/FontiLead'
import { FiltroData } from '@/components/FiltroData'
import { FiltroSelect } from '@/components/FiltroSelect'
import { formatDelta } from '@/lib/format'
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
  parsePreset,
  parsePresetConfronto,
  type DimensioneLead,
} from '@/lib/analytics'

export const dynamic = 'force-dynamic'

type RigaSito = Record<string, any>
type RigaStorico = Record<string, any>

const OPZIONI_FONTE = [
  { valore: 'sito', etichetta: 'Sito attuale' },
  { valore: 'storico', etichetta: 'Storico HubSpot' },
  { valore: 'entrambi', etichetta: 'Confronto sorgenti' },
] as const
type FonteDati = (typeof OPZIONI_FONTE)[number]['valore']

function parseFonte(raw: string | undefined): FonteDati {
  return raw === 'storico' || raw === 'entrambi' ? raw : 'sito'
}

// "canale" e' l'unica dimensione pensata per essere confrontabile 1:1 con lo
// storico HubSpot (vedi classificaCanale in lib/analytics.ts): la mostriamo
// per prima, seguita dalle dimensioni UTM grezze e da quelle specifiche del
// sito nuovo (CTA/pagina non hanno equivalente nello storico HubSpot).
const SEZIONI_LEAD: { dimensione: DimensioneLead; titolo: string }[] = [
  { dimensione: 'canale', titolo: 'Lead per canale' },
  { dimensione: 'fonte', titolo: 'Lead per fonte (UTM)' },
  { dimensione: 'medium', titolo: 'Lead per medium' },
  { dimensione: 'campagna', titolo: 'Lead per campagna' },
  { dimensione: 'term', titolo: 'Lead per termine di ricerca' },
  { dimensione: 'cta', titolo: 'Lead per CTA' },
  { dimensione: 'pagina', titolo: 'Lead per pagina' },
  { dimensione: 'status', titolo: 'Lead Status' },
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
  { chiave: 'canale', titolo: 'Lead per canale', accessor: (r) => r.fonte_acquisizione, etichettaVuoto: 'Non classificato' },
  { chiave: 'fonte', titolo: 'Lead per fonte (UTM)', accessor: (r) => r.utm_source, etichettaVuoto: 'Non impostata (dato storico)' },
  { chiave: 'medium', titolo: 'Lead per medium', accessor: (r) => r.utm_medium, etichettaVuoto: 'Non impostato (dato storico)' },
  {
    chiave: 'campagna',
    titolo: 'Lead per campagna',
    accessor: (r) => r.utm_campaign || r.campagna_prima_conversione,
    etichettaVuoto: 'Nessuna campagna',
  },
  { chiave: 'term', titolo: 'Lead per termine di ricerca', accessor: (r) => r.utm_term, etichettaVuoto: 'Nessun termine (dato storico)' },
  { chiave: 'modulo', titolo: 'Lead per modulo/form HubSpot', accessor: (r) => r.modulo_origine, etichettaVuoto: 'Non rilevato' },
  { chiave: 'status', titolo: 'Lead per stato contatto', accessor: (r) => r.contact_status, etichettaVuoto: 'Non impostato' },
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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; da?: string; a?: string; fonte?: string; confronto?: string; cda?: string; ca?: string }
}) {
  if (!(await utenteHaSezione('analytics'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

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
    if (error) return <p className="error-banner">Errore nel caricamento (sito): {error.message}</p>
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
      if (error) return <p className="error-banner">Errore nel caricamento (storico): {error.message}</p>
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

  const preset = parsePreset(searchParams.range)
  const { da, a } = calcolaRange(preset, oggi, searchParams.da, searchParams.a, primoGiorno)

  // Il periodo di confronto esiste solo per fonte="entrambi": storico e
  // sito non coesistono (uno si e' fermato il 22/07/2026, l'altro e'
  // appena partito), quindi li' non confronta "prima vs dopo" sulla stessa
  // fonte, ma applica il periodo principale al sito (attuale) e il periodo
  // di confronto allo storico (es. "agosto 2026" sul sito vs "agosto 2025"
  // su HubSpot). Sulle altre fonti il confronto periodo su periodo non ha
  // dato risultati leggibili, quindi non e' piu' esposto in UI.
  const presetConfronto = fonte === 'entrambi' ? parsePresetConfronto(searchParams.confronto) : 'nessuno'
  const rangeConfronto = calcolaConfronto(presetConfronto, da, a, searchParams.cda, searchParams.ca)

  const righeSitoPeriodo = filtraPerRangeGenerico(righeSito, (r) => r.created_at, da, a)
  const righeStoricoPeriodo = filtraPerRangeGenerico(righeStorico, (r) => r.data_acquisizione, da, a)
  const righeStoricoConfronto = rangeConfronto
    ? filtraPerRangeGenerico(righeStorico, (r) => r.data_acquisizione, rangeConfronto.da, rangeConfronto.a)
    : null

  // Stessi parametri da/a in ogni link di drill-down: la lista deve
  // restare coerente col conteggio mostrato (che e' gia' filtrato sul
  // periodo scelto qui). Solo il sito ha una lista di dettaglio.
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
          <label className="report-range-campo">
            <span>Fonte dati</span>
            <FiltroSelect valore={fonte} opzioni={[...OPZIONI_FONTE]} paramName="fonte" ariaLabel="Fonte dati" />
          </label>
          <label className="report-range-campo">
            <span>Periodo</span>
            <FiltroSelect valore={preset} opzioni={[...OPZIONI_RANGE]} paramName="range" ariaLabel="Periodo report" />
          </label>
          {preset === 'custom' && <FiltroData dal={da} al={a} paramDal="da" paramAl="a" />}
          {fonte === 'entrambi' && (
            <label className="report-range-campo">
              <span>Storico nel periodo</span>
              <FiltroSelect
                valore={presetConfronto}
                opzioni={[...OPZIONI_CONFRONTO]}
                paramName="confronto"
                ariaLabel="Periodo di confronto per lo storico"
              />
            </label>
          )}
          {fonte === 'entrambi' && presetConfronto === 'personalizzato' && (
            <FiltroData dal={searchParams.cda ?? ''} al={searchParams.ca ?? ''} paramDal="cda" paramAl="ca" />
          )}
        </div>
        <p className="muted">
          {fonte === 'entrambi' ? (
            <>
              Sito dal {formatBreve(da)} al {formatBreve(a)}
              {rangeConfronto && (
                <> — storico dal {formatBreve(rangeConfronto.da)} al {formatBreve(rangeConfronto.a)}</>
              )}
              {!rangeConfronto && <> — storico nello stesso periodo</>}
            </>
          ) : (
            <>
              Dal {formatBreve(da)} al {formatBreve(a)}
            </>
          )}
        </p>

        {fonte === 'sito' && (
          <>
            <div className="stat-row">
              <TotaleCard titolo="Enquiries nel periodo" valore={righeSitoPeriodo.length} />
            </div>

            <EnquiriesChart giorni={costruisciSerieGiornaliera(righeSitoPeriodo, da, a)} />

            {SEZIONI_LEAD.map(({ dimensione, titolo }) => {
              const fonti = classificaPer(righeSitoPeriodo, dimensione).map((voce) => ({
                ...voce,
                href: hrefDimensione(dimensione, voce.chiave),
              }))
              return (
                <div key={dimensione} className="riepilogo-sottosezione">
                  <h3 className="riepilogo-sottosezione-titolo">{titolo}</h3>
                  <FontiLead fonti={fonti} />
                </div>
              )
            })}
          </>
        )}

        {fonte === 'storico' && (
          <>
            <div className="stat-row">
              <TotaleCard titolo="Lead storici nel periodo" valore={righeStoricoPeriodo.length} />
            </div>

            <TotaleChart giorni={costruisciSerieTotale(righeStoricoPeriodo, (r) => r.data_acquisizione, da, a)} />

            {SEZIONI_STORICO.map(({ chiave, titolo, accessor, etichettaVuoto }) => (
              <div key={chiave} className="riepilogo-sottosezione">
                <h3 className="riepilogo-sottosezione-titolo">{titolo}</h3>
                <FontiLead fonti={classificaGenerico(righeStoricoPeriodo, accessor, etichettaVuoto)} />
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
            ? `Storico HubSpot (dal ${formatBreve(rangeConfronto.da)} al ${formatBreve(rangeConfronto.a)})`
            : 'Storico HubSpot nello stesso periodo'
          const delta = deltaPercentuale(righeSitoPeriodo.length, righeStoricoConfrontate.length)
          return (
            <div className="stat-row">
              <div className="stat-card stat-card-static">
                <div className="value">{righeStoricoConfrontate.length}</div>
                <div className="label">{etichettaStorico}</div>
              </div>
              <div className="stat-card stat-card-static">
                <div className="value">{righeSitoPeriodo.length}</div>
                <div className="label">Sito attuale nel periodo</div>
                <div className={`stat-card-delta ${classeDelta(delta)}`}>
                  {formatDelta(delta)} rispetto allo storico
                </div>
              </div>
            </div>
          )
        })()}
      </section>
    </div>
  )
}
