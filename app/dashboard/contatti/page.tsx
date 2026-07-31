import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDataConGiorno, formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { GestioneSezione } from './GestioneSezione'
import { RicercaContatti } from './RicercaContatti'
import { FiltroSelect } from '@/components/FiltroSelect'

// Solo i campi essenziali per la lettura al volo (senza espandere la riga):
// data, nome, stato, attivita' e richiesta - data per prima perche' su
// mobile diventa la riga principale della lista (vedi CSS .row-clickable).
// Contatti e stato di gestione restano un tap di distanza nel pannello espanso.
const COLONNE_TABELLA = ['Data e ora', 'Nome e cognome', 'Stato', 'Attività', 'Richiesta']

export const dynamic = 'force-dynamic'

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'nome',
  'cognome',
  'tipo_richiesta',
  'attivita',
  'stato',
  'gestito',
  'gestito_da',
  'gestito_il',
  'note',
  // Mostrati in evidenza appena si apre la riga (vedi RichiestaEvidenza),
  // non nella griglia generica dei dettagli.
  'motivo',
  'data_richiesta',
  'ora_richiesta',
]

const ETICHETTA_GRUPPO: Record<string, string> = {
  adulti: 'Adulti',
  junior: 'Junior',
}

const FILTRI_VALIDI = ['da_gestire', 'gestiti', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'da_gestire', etichetta: 'Da gestire' },
  { valore: 'gestiti', etichetta: 'Gestiti' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

type RigaContatto = Record<string, any>

// Singola selezione: assente (es. dal link "Enquiries" nel menu) o non
// valida = "da gestire", cosi' e' quello che si vede aprendo la pagina.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'da_gestire'
}

function applicaFiltro(righe: RigaContatto[], filtro: Filtro): RigaContatto[] {
  if (filtro === 'tutti') return righe
  if (filtro === 'gestiti') return righe.filter((riga) => riga.gestito)
  return righe.filter((riga) => !riga.gestito)
}

// La ricerca ignora il filtro Da gestire/Gestiti: cerca su tutti i
// contatti, gestiti o meno, dentro nome, cognome, email e cellulare.
const CAMPI_RICERCA = ['nome', 'cognome', 'email', 'cellulare'] as const

function corrispondeRicerca(riga: RigaContatto, query: string): boolean {
  return CAMPI_RICERCA.some((campo) => {
    const valore = riga[campo]
    return typeof valore === 'string' && valore.toLowerCase().includes(query)
  })
}

// In evidenza appena si apre la riga, nell'ordine in cui servono a chi
// deve richiamare/rispondere: che tipo di richiesta e' (Richiamami,
// Appuntamento in sede, Messaggio...), poi giorno e orario se e' un
// appuntamento/richiamata, infine il testo per esteso scritto dal cliente -
// a tutta larghezza, non nella griglia stretta dei dettagli dove un testo
// lungo andrebbe a capo parola per parola.
function RichiestaEvidenza({ riga }: { riga: RigaContatto }) {
  const haTipo = !!riga.tipo_richiesta
  const haAppuntamento = !!(riga.data_richiesta || riga.ora_richiesta)
  const haMotivo = !!riga.motivo

  if (!haTipo && !haAppuntamento && !haMotivo) return null

  return (
    <div className="richiesta-evidenza">
      {haTipo && (
        <span className={`richiesta-badge richiesta-${variantePillola(riga.tipo_richiesta)}`}>
          {riga.tipo_richiesta}
        </span>
      )}
      {haAppuntamento && (
        <p className="richiesta-appuntamento">
          {riga.data_richiesta && formatDataConGiorno(riga.data_richiesta)}
          {riga.data_richiesta && riga.ora_richiesta && ' · '}
          {riga.ora_richiesta && `ore ${riga.ora_richiesta}`}
        </p>
      )}
      {haMotivo && <p className="richiesta-motivo">{riga.motivo}</p>}
    </div>
  )
}

function raggruppaPerAttivita(righe: RigaContatto[]) {
  const gruppi = new Map<string, RigaContatto[]>()

  for (const riga of righe) {
    const chiave = (riga.gruppo_attivita || '').toLowerCase() || 'altro'
    if (!gruppi.has(chiave)) gruppi.set(chiave, [])
    gruppi.get(chiave)!.push(riga)
  }

  const ordine = [
    'adulti',
    'junior',
    ...[...gruppi.keys()].filter((k) => k !== 'adulti' && k !== 'junior'),
  ]

  return ordine
    .filter((chiave) => gruppi.has(chiave))
    .map((chiave) => ({
      chiave,
      label: ETICHETTA_GRUPPO[chiave] ?? 'Altro',
      righe: gruppi.get(chiave)!,
    }))
}

export default async function ContattiPage({
  searchParams,
}: {
  searchParams: { filtro?: string; q?: string }
}) {
  if (!(await utenteHaSezione('contatti'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = headers().get('x-tca-user-email')

  const [{ data: righe, error }, { data: viewer }] = await Promise.all([
    supabase.from('form_contatti').select('*').order('created_at', { ascending: false }),
    supabase.from('staff_users').select('puo_cancellare').eq('email', emailCorrente ?? '').maybeSingle(),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const puoCancellare = !!viewer?.puo_cancellare

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtro = parseFiltro(searchParams.filtro)
  const righeFiltrate = query
    ? (righe ?? []).filter((riga) => corrispondeRicerca(riga, query))
    : applicaFiltro(righe ?? [], filtro)
  const gruppi = raggruppaPerAttivita(righeFiltrate)

  return (
    <div>
      <div className="page-header">
        <h1>Enquiries</h1>
      </div>

      <div className="filtri-toolbar">
        <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
        {query ? (
          <p className="search-note">
            Ricerca su tutti i contatti, gestiti e da gestire —{' '}
            <a href="/dashboard/contatti" className="link">
              annulla ricerca
            </a>
          </p>
        ) : (
          <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
        )}
      </div>

      <div className="data-table-wrap">
        <AccordionGroup>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Data e ora</th>
                <th>Nome e cognome</th>
                <th>Stato</th>
                <th>Attività</th>
                <th>Richiesta</th>
              </tr>
            </thead>
            {gruppi.map((gruppo) => (
              <tbody key={gruppo.chiave}>
                <tr className="table-group-header">
                  <td colSpan={6}>
                    {gruppo.label}
                    <span className="count">({gruppo.righe.length})</span>
                  </td>
                </tr>
                {gruppo.righe.map((riga) => (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={6}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
                    evidenza={<RichiestaEvidenza riga={riga} />}
                    extra={
                      <GestioneSezione
                        id={riga.id}
                        gestito={!!riga.gestito}
                        gestitoDa={riga.gestito_da ?? null}
                        gestitoIl={riga.gestito_il ?? null}
                        noteIniziali={riga.note ?? null}
                        puoCancellare={puoCancellare}
                      />
                    }
                    cells={[
                      formatDateOra(riga.created_at),
                      <>{riga.nome} {riga.cognome}</>,
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
            ))}
          </table>
        </AccordionGroup>

        {righeFiltrate.length === 0 && (
          <p className="empty-state">
            {query ? 'Nessun risultato per la ricerca.' : 'Nessuna richiesta trovata.'}
          </p>
        )}
      </div>
    </div>
  )
}
