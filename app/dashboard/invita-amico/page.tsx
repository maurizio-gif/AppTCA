import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import { VisiteContatto } from '@/components/VisiteContatto'
import { GestioneInvito } from './GestioneInvito'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Socio (chi invita)', 'Amico invitato']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'email_socio',
  'amico_nome',
  'amico_cognome',
  'amico_email',
  'amico_prefisso',
  'amico_cellulare',
  'gestito',
  'gestito_da',
  'gestito_il',
  'note',
]

type RigaInvito = Record<string, any>

const FILTRI_VALIDI = ['da_gestire', 'gestiti', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'da_gestire', etichetta: 'Da gestire' },
  { valore: 'gestiti', etichetta: 'Gestiti' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

// Singola selezione: assente (es. dal link "Invita un amico" nel menu) o non
// valida = "da gestire", cosi' e' quello che si vede aprendo la pagina.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'da_gestire'
}

function applicaFiltro(righe: RigaInvito[], filtro: Filtro): RigaInvito[] {
  if (filtro === 'tutti') return righe
  if (filtro === 'gestiti') return righe.filter((riga) => riga.gestito)
  return righe.filter((riga) => !riga.gestito)
}

export default async function InvitaAmicoPage({
  searchParams,
}: {
  searchParams: { filtro?: string }
}) {
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

  // Visite al sito di ciascun socio (per vid), per capire quanto e' "caldo"
  // l'invito - vedi VisiteContatto.
  const vids = [...new Set((righe ?? []).map((riga) => riga.vid).filter((v): v is string => !!v))]
  const { data: accessi } = vids.length > 0 ? await supabase.from('accessi').select('*').in('vid', vids) : { data: [] }
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

  const filtro = parseFiltro(searchParams.filtro)
  const righeFiltrate = applicaFiltro(righe ?? [], filtro)

  return (
    <div>
      <div className="page-header">
        <h1>Inviti "Invita un amico"</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Ogni riga è un invito compilato dal sito: «Socio» è chi invita (un contatto già esistente, solo
            l'email), «Amico invitato» è la persona nuova segnalata, con tutti i suoi contatti.
          </li>
          <li>Filtra tra Da gestire/Gestiti/Tutti con la tendina qui sotto.</li>
          <li>Apri una riga per vedere il dettaglio e aggiungere una nota interna.</li>
          <li>
            Per segnare un invito come «Gestito» devi prima scrivere e salvare una nota: è il modo per lasciare
            traccia di cosa è stato fatto (es. l'amico è stato ricontattato).
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
              <th>Socio</th>
              <th>Amico invitato</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {righeFiltrate.map((riga) => (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={4}
                  columns={COLONNE_TABELLA}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
                  evidenza={<VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />}
                  extra={
                    <GestioneInvito
                      id={riga.id}
                      gestito={!!riga.gestito}
                      gestitoDa={riga.gestito_da ?? null}
                      gestitoIl={riga.gestito_il ?? null}
                      noteIniziali={riga.note ?? null}
                    />
                  }
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
        {righeFiltrate.length === 0 && (
          <p className="empty-state">
            {filtro === 'tutti' ? 'Nessun invito trovato.' : 'Nessun invito in questo filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}
