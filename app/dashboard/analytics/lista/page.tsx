import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { RichiestaEvidenza } from '@/app/dashboard/contatti/RichiestaEvidenza'
import { formatDataConGiorno, formatDateOra, variantePillola } from '@/lib/format'
import {
  DIMENSIONI_VALIDE,
  chiaveGiorno,
  classificaPer,
  dataValida,
  filtraPerDimensione,
  filtraPerGiorno,
  type DimensioneLead,
} from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data e ora', 'Nome e cognome', 'Gruppo', 'Stato', 'Attività', 'Richiesta']

const CAMPI_IN_EVIDENZA = ['id', 'created_at', 'nome', 'cognome', 'gruppo_attivita', 'tipo_richiesta', 'attivita', 'stato', 'motivo', 'data_richiesta', 'ora_richiesta']

const TITOLI_DIMENSIONE: Record<DimensioneLead, string> = {
  canale: 'Canale',
  fonte: 'Fonte',
  medium: 'Medium',
  campagna: 'Campagna',
  term: 'Termine di ricerca',
  cta: 'CTA',
  pagina: 'Pagina',
  status: 'Lead Status',
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
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.from('form_contatti').select('*').order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const righeContatti: Record<string, any>[] = data ?? []
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

  let descrizione = 'Tutti i contatti nel periodo selezionato'
  if (giorno) {
    descrizione = `Enquiry del ${formatDataConGiorno(giorno)}`
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
          ← Torna ad Analytics
        </Link>
      </p>

      <section className="riepilogo-sezione">
        <h2 className="riepilogo-sezione-titolo">
          {descrizione} — {righeFiltrate.length} {righeFiltrate.length === 1 ? 'contatto' : 'contatti'}
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
                      riga.gruppo_attivita || 'Adulti',
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

          {righeFiltrate.length === 0 && <p className="empty-state">Nessun contatto trovato per questa selezione.</p>}
        </div>
      </section>
    </div>
  )
}
