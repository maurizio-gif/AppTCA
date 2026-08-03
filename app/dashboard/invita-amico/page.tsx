import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'

export const dynamic = 'force-dynamic'

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'email_socio',
  'amico_nome',
  'amico_cognome',
  'amico_email',
  'amico_prefisso',
  'amico_cellulare',
]

export default async function InvitaAmicoPage() {
  if (!(await utenteHaSezione('invita-amico'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_invita_amico')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Inviti "Invita un amico"</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>Elenco di sola lettura: ogni riga è un invito compilato dal sito, un socio che invita un amico.</li>
          <li>Apri una riga per vedere tutti i dettagli (contatti dell'amico invitato, dati di provenienza).</li>
        </ol>
      </BoxIstruzioni>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Socio</th>
              <th>Amico invitato</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {righe?.map((riga) => (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={4}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
                  cells={[
                    formatDateOra(riga.created_at),
                    riga.email_socio,
                    <>
                      {riga.amico_nome} {riga.amico_cognome}
                      <br />
                      <span className="muted">
                        {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
                      </span>
                    </>,
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>
        {righe?.length === 0 && <p className="empty-state">Nessun invito trovato.</p>}
      </div>
    </div>
  )
}
