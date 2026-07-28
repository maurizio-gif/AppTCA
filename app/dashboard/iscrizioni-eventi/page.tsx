import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Evento', 'Partecipante', 'Socio', 'Pagamento', 'Contratto PGM']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'nome_evento',
  'nome',
  'cognome',
  'email',
  'cellulare',
  'socio',
  'importo_pagato',
  'stato_contratto_pgm',
  'link_pgm',
]

// Tabella sbloccata dopo aver attivato RLS (era esposta senza protezione).
// Contiene anche il link al contratto PerfectGym (link_pgm), utile alla
// segreteria per aprire direttamente la pratica del socio.
export default async function IscrizioniEventiPage() {
  if (!(await utenteHaSezione('iscrizioni-eventi'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('iscrizioni_eventi')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Iscrizioni Eventi</h1>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Evento</th>
              <th>Partecipante</th>
              <th>Socio</th>
              <th>Pagamento</th>
              <th>Contratto PGM</th>
            </tr>
          </thead>
          <tbody>
            {righe?.map((riga) => (
              <ExpandableRow
                key={riga.id}
                columnCount={7}
                columns={COLONNE_TABELLA}
                record={riga}
                hiddenKeys={COLONNE_VISIBILI}
                cells={[
                  formatDateOra(riga.created_at),
                  riga.nome_evento,
                  <>
                    {riga.nome} {riga.cognome}
                    <br />
                    <ContactLinks email={riga.email} phone={riga.cellulare} />
                  </>,
                  riga.socio ? 'Sì' : 'No',
                  riga.importo_pagato != null ? `€ ${riga.importo_pagato}` : '-',
                  <>
                    {riga.stato_contratto_pgm}
                    {riga.link_pgm && (
                      <>
                        {' · '}
                        <a href={riga.link_pgm} target="_blank" rel="noreferrer" className="link">
                          apri
                        </a>
                      </>
                    )}
                  </>,
                ]}
              />
            ))}
          </tbody>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessuna iscrizione trovata.</p>}
      </div>
    </div>
  )
}
