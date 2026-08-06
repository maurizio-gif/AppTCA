import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getSezioniConsentite } from '@/lib/auth/sezioni-server'
import { EnquiriesChart } from '@/components/EnquiriesChart'
import { FontiLead } from '@/components/FontiLead'
import { FiltroData } from '@/components/FiltroData'
import { FiltroSelect } from '@/components/FiltroSelect'
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

function formatBreve(chiave: string): string {
  const [anno, mese, giorno] = chiave.split('-')
  return `${giorno}/${mese}/${anno}`
}

const OPZIONI_RANGE = [
  { valore: 'tutto', etichetta: 'Tutto' },
  { valore: 'mtd', etichetta: 'Da inizio mese' },
  { valore: 'mese_precedente', etichetta: 'Mese precedente' },
  { valore: 'anno_corrente', etichetta: 'Anno corrente' },
  { valore: 'custom', etichetta: 'Personalizzato' },
] as const
type PresetRange = (typeof OPZIONI_RANGE)[number]['valore']
const VALORI_RANGE = OPZIONI_RANGE.map((o) => o.valore) as readonly string[]

// Assente o non valido = "Da inizio mese", cosi' e' quello che si vede
// aprendo la pagina senza parametri (comportamento di sempre finora).
function parsePreset(raw: string | undefined): PresetRange {
  if (raw && VALORI_RANGE.includes(raw)) return raw as PresetRange
  return 'mtd'
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
function dataValida(v: string | undefined): v is string {
  return !!v && RE_DATA.test(v)
}

// Range effettivo (chiavi YYYY-MM-DD, incluse entrambe) per il preset
// scelto. "custom" richiede due date valide con da <= a, altrimenti
// ricade su "Da inizio mese" invece di rompere la pagina. "tutto" copre
// dal primo contatto registrato ad oggi, cioe' nessun filtro di data.
function calcolaRange(
  preset: PresetRange,
  oggi: string,
  customDa: string | undefined,
  customA: string | undefined,
  primoGiorno: string
): { da: string; a: string } {
  const anno = Number(oggi.slice(0, 4))
  const mese = Number(oggi.slice(5, 7))

  if (preset === 'tutto') {
    return { da: primoGiorno, a: oggi }
  }

  if (preset === 'mese_precedente') {
    const meseScorso = mese === 1 ? 12 : mese - 1
    const annoMeseScorso = mese === 1 ? anno - 1 : anno
    const da = `${annoMeseScorso}-${String(meseScorso).padStart(2, '0')}-01`
    const a = aggiungiGiorni(`${oggi.slice(0, 7)}-01`, -1)
    return { da, a }
  }

  if (preset === 'anno_corrente') {
    return { da: `${anno}-01-01`, a: oggi }
  }

  // Basta una delle due date per applicare il filtro: l'altro estremo
  // ricade sul primo contatto registrato / oggi, invece di scartare tutta
  // la selezione finche' non sono valorizzate entrambe (prima causa per
  // cui la data scelta sembrava "non salvarsi").
  if (preset === 'custom') {
    const validaDa = dataValida(customDa) ? customDa : primoGiorno
    const validaA = dataValida(customA) ? customA : oggi
    if (validaDa <= validaA) return { da: validaDa, a: validaA }
  }

  return { da: `${oggi.slice(0, 7)}-01`, a: oggi }
}

type PuntoGiorno = { data: string; adulti: number; junior: number; altro: number }

// Serie continua giorno per giorno per tutto il range scelto (anche i
// giorni senza enquiry, a zero) - cosi' il grafico ha una scala temporale
// reale invece di "saltare" i giorni vuoti.
function costruisciSerieGiornaliera(
  righe: { created_at: string; gruppo_attivita: string | null }[],
  da: string,
  a: string
): PuntoGiorno[] {
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

  const serie: PuntoGiorno[] = []
  for (let giorno = da; giorno <= a; giorno = aggiungiGiorni(giorno, 1)) {
    const bucket = conteggi.get(giorno) ?? { adulti: 0, junior: 0, altro: 0 }
    serie.push({ data: giorno, ...bucket })
  }
  return serie
}

// Classifica generica per un campo testuale (fonte/cta/pagina): raggruppa
// senza distinguere maiuscole/minuscole ma mostra l'etichetta cosi' come
// arrivata la prima volta (es. "Richiedi Informazioni" resta tale, non
// diventa "Richiedi informazioni"). "prettifica" e' per i soli slug tipo
// utm_source (google -> Google), non per CTA/pagina gia' leggibili.
function classificaPer(
  righe: Record<string, unknown>[],
  campo: string,
  etichettaVuoto: string,
  prettifica = false
): { fonte: string; conteggio: number }[] {
  const conteggi = new Map<string, { etichetta: string; conteggio: number }>()

  for (const riga of righe) {
    const grezzo = String(riga[campo] ?? '').trim()
    const chiave = grezzo ? grezzo.toLowerCase() : '__vuoto__'
    const etichetta = grezzo ? (prettifica ? prettifyKey(grezzo.toLowerCase()) : grezzo) : etichettaVuoto
    const voce = conteggi.get(chiave)
    if (voce) voce.conteggio += 1
    else conteggi.set(chiave, { etichetta, conteggio: 1 })
  }

  return [...conteggi.values()]
    .sort((a, b) => b.conteggio - a.conteggio)
    .map((v) => ({ fonte: v.etichetta, conteggio: v.conteggio }))
}

// L'esito PGM ha piu' varianti per lo stesso "e' un lead nuovo" (es. "NUOVO"
// e "NUOVO Adulto" arrivano da rami diversi del flusso n8n): contano tutte
// come un'unica categoria "Nuovo" invece di restare separate.
function normalizzaEsitoPgm(valore: unknown): unknown {
  if (typeof valore === 'string' && valore.trim().toLowerCase().startsWith('nuovo')) return 'Nuovo'
  return valore
}

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: { range?: string; da?: string; a?: string }
}) {
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
    supabase
      .from('form_contatti')
      .select('created_at, gruppo_attivita, gestito, utm_source, utm_campaign, cta, pagina, esito_verifica_pgm')
      .order('created_at'),
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
  // attuale, non risentono del periodo scelto per il report sotto.
  function contaContatti(gruppo: GruppoContatto, gestito: boolean) {
    return righeContatti.filter(
      (riga) => apparteneAGruppo(riga.gruppo_attivita, gruppo) && !!riga.gestito === gestito
    ).length
  }

  const contattiAdultiDaGestire = contaContatti('adulti', false)
  const contattiAdultiGestiti = contaContatti('adulti', true)
  const contattiJuniorDaGestire = contaContatti('junior', false)
  const contattiJuniorGestiti = contaContatti('junior', true)

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
  const fontiLead = classificaPer(righeNelRange, 'utm_source', 'Organico', true)
  const campagnaLead = classificaPer(righeNelRange, 'utm_campaign', 'Nessuna campagna', true)
  const ctaLead = classificaPer(righeNelRange, 'cta', 'Nessuna CTA')
  const paginaLead = classificaPer(righeNelRange, 'pagina', 'Pagina non rilevata')
  const leadStatus = classificaPer(
    righeNelRange.map((r) => ({ ...r, esito_verifica_pgm: normalizzaEsitoPgm(r.esito_verifica_pgm) })),
    'esito_verifica_pgm',
    'Non verificato'
  )

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

          <details className="analytics-toggle">
            <summary className="analytics-toggle-titolo">Analytics</summary>

            <div className="report-range-toolbar">
              <FiltroSelect valore={preset} opzioni={[...OPZIONI_RANGE]} paramName="range" ariaLabel="Periodo report" />
              {preset === 'custom' && <FiltroData dal={da} al={a} paramDal="da" paramAl="a" />}
              <p className="muted">
                Dal {formatBreve(da)} al {formatBreve(a)}
              </p>
            </div>

            <EnquiriesChart giorni={serieGiornaliera} />

            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Lead per fonte</h3>
              <FontiLead fonti={fontiLead} />
            </div>

            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Lead per campagna</h3>
              <FontiLead fonti={campagnaLead} />
            </div>

            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Lead per CTA</h3>
              <FontiLead fonti={ctaLead} />
            </div>

            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Lead per pagina</h3>
              <FontiLead fonti={paginaLead} />
            </div>

            <div className="riepilogo-sottosezione">
              <h3 className="riepilogo-sottosezione-titolo">Lead Status</h3>
              <FontiLead fonti={leadStatus} />
            </div>
          </details>
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
