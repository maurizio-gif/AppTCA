import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Bambino/a', 'Genitore', 'Corso']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'genitore_email',
  'genitore_cellulare',
  'frequenza',
]

// Pagina sola lettura: stessa logica di /dashboard/contatti (Server Component
// + service role client), senza la parte di aggiornamento stato — qui basta
// vedere l'elenco delle preiscrizioni.
export default async function ScuolaTennisPage() {
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

  return (
    <div>
      <div className="page-header">
        <h1>Preiscrizioni Scuola Tennis</h1>
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
                    <>
                      {riga.tipo_corso}
                      <br />
                      <span className="muted">{riga.frequenza}</span>
                    </>,
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessuna preiscrizione trovata.</p>}
      </div>
    </div>
  )
}
