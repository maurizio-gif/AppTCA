import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { FiltroSelect } from '@/components/FiltroSelect'
import { formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { CaricatoPgmToggle } from './CaricatoPgmToggle'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Bambino/a', 'Genitore', 'Corso']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'genitore_email',
  'genitore_cellulare',
  'frequenza',
  'caricato_pgm',
  'caricato_pgm_da',
  'caricato_pgm_il',
]

const FILTRI_VALIDI = ['da_caricare', 'caricato', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'da_caricare', etichetta: 'Da caricare' },
  { valore: 'caricato', etichetta: 'Caricato' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

// Singola selezione: assente (es. dal link "Scuola tennis" nel menu) o non
// valida = "da caricare", cosi' e' quello che si vede aprendo la pagina.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'da_caricare'
}

function applicaFiltro(righe: Record<string, any>[], filtro: Filtro) {
  if (filtro === 'tutti') return righe
  if (filtro === 'caricato') return righe.filter((riga) => riga.caricato_pgm)
  return righe.filter((riga) => !riga.caricato_pgm)
}

// Pagina di sola lettura per i dati del form, con in aggiunta il toggle
// Caricato su Perfect Gym: stessa logica/formattazione di /dashboard/contatti
// (Server Component + service role client).
export default async function ScuolaTennisPage({
  searchParams,
}: {
  searchParams: { filtro?: string }
}) {
  if (!(await utenteHaSezione('scuola-tennis'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_scuola_tennis')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const filtro = parseFiltro(searchParams.filtro)
  const righeFiltrate = applicaFiltro(righe ?? [], filtro)

  return (
    <div>
      <div className="page-header">
        <h1>Preiscrizioni Scuola Tennis</h1>
      </div>

      <div className="filtri-toolbar">
        <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Bambino/a</th>
              <th>Genitore</th>
              <th>Corso</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {righeFiltrate.map((riga) => (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={5}
                  columns={COLONNE_TABELLA}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
                  extraTitle="Caricato su Perfect Gym"
                  extra={
                    <CaricatoPgmToggle
                      id={riga.id}
                      caricato={!!riga.caricato_pgm}
                      caricatoDa={riga.caricato_pgm_da ?? null}
                      caricatoIl={riga.caricato_pgm_il ?? null}
                    />
                  }
                  cells={[
                    formatDateOra(riga.created_at),
                    <>{riga.minore_nome} {riga.minore_cognome}</>,
                    <>
                      {riga.genitore_nome} {riga.genitore_cognome}
                      <br />
                      <ContactLinks email={riga.genitore_email} phone={riga.genitore_cellulare} />
                    </>,
                    <>
                      {riga.tipo_corso ? (
                        <span className={`richiesta-badge richiesta-${variantePillola(riga.tipo_corso)}`}>
                          {riga.tipo_corso}
                        </span>
                      ) : (
                        '—'
                      )}
                      <br />
                      <span className="muted">{riga.frequenza}</span>
                    </>,
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>
        {righeFiltrate.length === 0 && <p className="empty-state">Nessuna preiscrizione trovata.</p>}
      </div>
    </div>
  )
}
