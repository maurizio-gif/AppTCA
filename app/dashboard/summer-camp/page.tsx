import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Bambino/a', 'Genitore', 'Settimane']

const COLONNE_VISIBILI = ['id', 'created_at', 'genitore_email', 'genitore_cellulare']

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

// Pagina sola lettura: stessa logica/formattazione di /dashboard/scuola-tennis
// (Server Component + service role client), niente aggiornamento stato -
// qui basta vedere l'elenco delle iscrizioni al Summer Camp.
export default async function SummerCampPage() {
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

  return (
    <div>
      <div className="page-header">
        <h1>Iscrizioni Summer Camp</h1>
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
              {righe?.map((riga) => (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={5}
                  columns={COLONNE_TABELLA}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
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
        {righe?.length === 0 && <p className="empty-state">Nessuna iscrizione trovata.</p>}
      </div>
    </div>
  )
}
