import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { FiltroSelect } from '@/components/FiltroSelect'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { CaricatoPgmToggle } from './CaricatoPgmToggle'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Bambino/a', 'Genitore', 'Settimane']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'genitore_email',
  'genitore_cellulare',
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

// Singola selezione: assente (es. dal link "Summer Camp" nel menu) o non
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

function riepilogoSettimane(riga: Record<string, any>) {
  const settimane = Array.isArray(riga.settimane) ? riga.settimane : []
  const preCamp = Array.isArray(riga.pre_camp_settimane) ? riga.pre_camp_settimane : []

  if (settimane.length === 0 && preCamp.length === 0) return '—'

  return (
    <>
      {settimane.length > 0 && `${settimane.length} settiman${settimane.length === 1 ? 'a' : 'e'}`}
      {settimane.length > 0 && preCamp.length > 0 && <br />}
      {preCamp.length > 0 && (
        <span className="muted">
          + {preCamp.length} pre-camp
        </span>
      )}
    </>
  )
}

// Pagina di sola lettura per i dati del form, con in aggiunta il toggle
// Caricato su Perfect Gym: stessa logica/formattazione di
// /dashboard/scuola-tennis (Server Component + service role client).
export default async function SummerCampPage({
  searchParams,
}: {
  searchParams: { filtro?: string }
}) {
  if (!(await utenteHaSezione('summer-camp'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_summer_camp')
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
        <h1>Iscrizioni Summer Camp</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>Filtra tra Da caricare/Caricato/Tutti con la tendina qui sotto.</li>
          <li>
            Apri una riga per vedere tutti i dettagli dell'iscrizione (bambino/a, genitore, settimane scelte, note
            mediche).
          </li>
          <li>
            Una volta caricata l'iscrizione su PerfectGym, attiva il toggle «Caricato su Perfect Gym»: resta
            visibile chi l'ha segnata e quando.
          </li>
        </ol>
      </BoxIstruzioni>

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
              <th>Settimane</th>
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
                    riepilogoSettimane(riga),
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>
        {righeFiltrate.length === 0 && <p className="empty-state">Nessuna iscrizione trovata.</p>}
      </div>
    </div>
  )
}
