import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { conPresaInCarico } from '@/lib/opportunita-server'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { RichiestaEvidenza } from '@/app/dashboard/contatti/RichiestaEvidenza'
import { formatDateOra, variantePillola } from '@/lib/format'
import {
  DIMENSIONI_VALIDE,
  chiaveGiorno,
  classificaPer,
  dataValida,
  filtraPerDimensione,
  filtraPerGiorno,
  formatDateWithWeekday,
  type DimensioneLead,
} from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Date & time', 'Name', 'Group', 'Status', 'Activity', 'Request']

const CAMPI_IN_EVIDENZA = ['id', 'created_at', 'nome', 'cognome', 'gruppo_attivita', 'tipo_richiesta', 'attivita', 'stato', 'motivo', 'data_richiesta', 'ora_richiesta']

const TITOLI_DIMENSIONE: Record<DimensioneLead, string> = {
  canale: 'Channel',
  attivita: 'Activity of interest',
  gruppo: 'Group',
  gestito_da: 'Handled by',
  fonte: 'Source',
  medium: 'Medium',
  campagna: 'Campaign',
  term: 'Search term',
  cta: 'CTA',
  pagina: 'Page',
  status: 'Lead status',
}

function parseDimensione(raw: string | undefined): DimensioneLead | null {
  return raw && (DIMENSIONI_VALIDE as readonly string[]).includes(raw) ? (raw as DimensioneLead) : null
}

// Lista delle anagrafiche dietro un conteggio di Analytics: si arriva qui
// cliccando un giorno del grafico o una riga di una classifica (Lead per
// fonte/campagna/CTA/pagina/status), mai navigando a mano - i parametri
// sono sempre quelli costruiti da app/dashboard/analytics/page.tsx.
export default async function AnalyticsListaPage({
  searchParams,
}: {
  searchParams: { giorno?: string; dimensione?: string; chiave?: string; da?: string; a?: string }
}) {
  if (!(await utenteHaSezione('analytics'))) {
    return <p className="error-banner">You don't have access to this section.</p>
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.from('form_contatti').select('*').order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Error loading data: {error.message}</p>
  }

  // Come nella pagina Analytics: la presa in carico arriva dall'opportunita'
  // della persona, non da un flag sulla richiesta.
  const righeContatti: Record<string, any>[] = await conPresaInCarico(data ?? [])
  const giorno = dataValida(searchParams.giorno) ? searchParams.giorno : undefined
  const dimensione = parseDimensione(searchParams.dimensione)
  const chiave = searchParams.chiave

  let righeFiltrate = righeContatti
  if (giorno) {
    righeFiltrate = filtraPerGiorno(righeFiltrate, giorno)
  } else if (dataValida(searchParams.da) && dataValida(searchParams.a)) {
    righeFiltrate = righeFiltrate.filter((riga) => {
      const c = chiaveGiorno(riga.created_at)
      return c >= searchParams.da! && c <= searchParams.a!
    })
  }

  if (dimensione && chiave !== undefined) {
    righeFiltrate = filtraPerDimensione(righeFiltrate, dimensione, chiave)
  }

  let descrizione = 'All contacts in the selected period'
  if (giorno) {
    descrizione = `Enquiries from ${formatDateWithWeekday(giorno)}`
  } else if (dimensione && chiave !== undefined) {
    const [voce] = classificaPer(righeFiltrate, dimensione)
    descrizione = `${TITOLI_DIMENSIONE[dimensione]}: ${voce?.fonte ?? chiave}`
  }

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      <p className="search-note">
        <Link href="/dashboard/analytics" className="link">
          ← Back to Analytics
        </Link>
      </p>

      <section className="riepilogo-sezione">
        <h2 className="riepilogo-sezione-titolo">
          {descrizione} — {righeFiltrate.length} {righeFiltrate.length === 1 ? 'contact' : 'contacts'}
        </h2>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                {COLONNE_TABELLA.map((colonna) => (
                  <th key={colonna}>{colonna}</th>
                ))}
              </tr>
            </thead>
            <AccordionGroup>
              <tbody>
                {righeFiltrate.map((riga) => (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={COLONNE_TABELLA.length + 1}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={CAMPI_IN_EVIDENZA}
                    evidenza={<RichiestaEvidenza riga={riga} />}
                    cells={[
                      formatDateOra(riga.created_at),
                      <>
                        {riga.nome} {riga.cognome}
                      </>,
                      riga.gruppo_attivita || 'Adults',
                      riga.stato || '—',
                      Array.isArray(riga.attivita) ? riga.attivita.join(', ') : riga.attivita || '—',
                      riga.tipo_richiesta ? (
                        <span className={`richiesta-badge richiesta-${variantePillola(riga.tipo_richiesta)}`}>
                          {riga.tipo_richiesta}
                        </span>
                      ) : (
                        '—'
                      ),
                    ]}
                  />
                ))}
              </tbody>
            </AccordionGroup>
          </table>

          {righeFiltrate.length === 0 && <p className="empty-state">No contacts found for this selection.</p>}
        </div>
      </section>
    </div>
  )
}
