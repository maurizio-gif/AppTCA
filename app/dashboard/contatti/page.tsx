import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { GestioneSezione } from './GestioneSezione'
import { RicercaContatti } from './RicercaContatti'
import { RichiestaSezione } from './RichiestaSezione'

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
  // Mostrati in modo dedicato nella sezione "Richiesta" (vedi RichiestaSezione),
  // non piu' nella griglia generica "Altri dettagli".
  'motivo',
  'data_richiesta',
  'ora_richiesta',
  // Esito interno di verifica su PerfectGym: non deve comparire per nessuno.
  'esito_verifica_pgm',
]

const ETICHETTA_GRUPPO: Record<string, string> = {
  adulti: 'Adulti',
  junior: 'Junior',
}

const FILTRI_VALIDI = ['da_gestire', 'gestiti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const ETICHETTA_FILTRO: Record<Filtro, string> = {
  da_gestire: 'Da gestire',
  gestiti: 'Gestiti',
}

type RigaContatto = Record<string, any>

// Selezione multipla in OR: assente (es. dal link "Enquiries" nel
// menu) = solo "da gestire", cosi' e' quello che si vede aprendo la
// pagina; stringa vuota = nessun filtro selezionato (nessuna riga
// corrisponde); altrimenti lista separata da virgola dei filtri attivi.
function parseFiltri(raw: string | undefined): Set<Filtro> {
  if (raw === undefined) return new Set(['da_gestire'])
  if (raw === '') return new Set()
  return new Set(raw.split(',').filter((f): f is Filtro => (FILTRI_VALIDI as readonly string[]).includes(f)))
}

function toggleFiltro(attivi: Set<Filtro>, chiave: Filtro): Set<Filtro> {
  const next = new Set(attivi)
  if (next.has(chiave)) {
    next.delete(chiave)
  } else {
    next.add(chiave)
  }
  return next
}

function applicaFiltro(righe: RigaContatto[], attivi: Set<Filtro>): RigaContatto[] {
  if (attivi.size === 0) return []
  return righe.filter(
    (riga) => (attivi.has('gestiti') && riga.gestito) || (attivi.has('da_gestire') && !riga.gestito)
  )
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

  const { data: righe, error } = await supabase
    .from('form_contatti')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtriAttivi = parseFiltri(searchParams.filtro)
  const righeFiltrate = query
    ? (righe ?? []).filter((riga) => corrispondeRicerca(riga, query))
    : applicaFiltro(righe ?? [], filtriAttivi)
  const gruppi = raggruppaPerAttivita(righeFiltrate)

  return (
    <div>
      <div className="page-header">
        <h1>Enquiries</h1>
      </div>

      <div className="contatti-toolbar">
        <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
        {query ? (
          <p className="search-note">
            Ricerca su tutti i contatti, gestiti e da gestire —{' '}
            <a href="/dashboard/contatti" className="link">
              annulla ricerca
            </a>
          </p>
        ) : (
          <FiltroGestione attivi={filtriAttivi} />
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
                    sections={[
                      {
                        title: 'Richiesta',
                        content: (
                          <RichiestaSezione
                            tipo={riga.tipo_richiesta ?? null}
                            motivo={riga.motivo ?? null}
                            dataRichiesta={riga.data_richiesta ?? null}
                            oraRichiesta={riga.ora_richiesta ?? null}
                          />
                        ),
                      },
                    ]}
                    extra={
                      <GestioneSezione
                        id={riga.id}
                        gestito={!!riga.gestito}
                        gestitoDa={riga.gestito_da ?? null}
                        gestitoIl={riga.gestito_il ?? null}
                        noteIniziali={riga.note ?? null}
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

function FiltroGestione({ attivi }: { attivi: Set<Filtro> }) {
  return (
    <div className="filter-row">
      {FILTRI_VALIDI.map((chiave) => {
        const next = toggleFiltro(attivi, chiave)
        const href = `/dashboard/contatti?filtro=${[...next].join(',')}`
        return (
          <a
            key={chiave}
            href={href}
            className={`filter-pill ${attivi.has(chiave) ? 'active' : ''}`}
          >
            {ETICHETTA_FILTRO[chiave]}
          </a>
        )
      })}
    </div>
  )
}
