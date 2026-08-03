import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, classificaContatto, type GruppoContatto } from '@/lib/contatti'
import type { SezioneChiave } from '@/lib/auth/sezioni'
import { GestioneSezione } from './GestioneSezione'
import { RicercaContatti } from './RicercaContatti'
import { RichiestaEvidenza } from './RichiestaEvidenza'
import { VistaTabs } from '@/components/VistaTabs'
import { CalendarioAppuntamenti } from './CalendarioAppuntamenti'
import { FiltroSelect } from '@/components/FiltroSelect'

// Solo i campi essenziali per la lettura al volo (senza espandere la riga):
// data, nome, stato, attivita' e richiesta - data per prima perche' su
// mobile diventa la riga principale della lista (vedi CSS .row-clickable).
// Contatti e stato di gestione restano un tap di distanza nel pannello espanso.
const COLONNE_TABELLA = ['Data e ora', 'Nome e cognome', 'Stato', 'Attività', 'Richiesta']

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
  'gruppo_attivita',
  // Mostrati in evidenza appena si apre la riga (vedi RichiestaEvidenza),
  // non nella griglia generica dei dettagli.
  'motivo',
  'data_richiesta',
  'ora_richiesta',
]

const FILTRI_VALIDI = ['da_gestire', 'gestiti', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'da_gestire', etichetta: 'Da gestire' },
  { valore: 'gestiti', etichetta: 'Gestiti' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

type RigaContatto = Record<string, any>

// Singola selezione: assente (es. dal link nel menu) o non valida = "da
// gestire", cosi' e' quello che si vede aprendo la pagina.
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
// contatti della sezione, gestiti o meno, dentro nome, cognome, email e
// cellulare.
const CAMPI_RICERCA = ['nome', 'cognome', 'email', 'cellulare'] as const

function corrispondeRicerca(riga: RigaContatto, query: string): boolean {
  return CAMPI_RICERCA.some((campo) => {
    const valore = riga[campo]
    return typeof valore === 'string' && valore.toLowerCase().includes(query)
  })
}

// Pagina condivisa da /dashboard/contatti/adulti e /dashboard/contatti/junior:
// stessa UI, filtrata sul gruppo assegnato a questa sezione (vedi
// lib/contatti.ts) e gestita separatamente cosi' da poter dare il permesso
// di accesso a operatori diversi per Adulti e per Junior.
//
// Solo per Adulti, la sezione si divide in due viste (vedi VistaTabs):
// Messaggi (da smaltire subito, in ordine di arrivo) e Appuntamenti
// (mostrati nel calendario in base al giorno fissato, non a quando e'
// arrivata la richiesta - vedi CalendarioAppuntamenti). Su Junior non c'e'
// questa distinzione, resta l'unica lista di sempre.
export async function ContattiSezione({
  gruppo,
  titolo,
  permesso,
  basePath,
  searchParams,
}: {
  gruppo: GruppoContatto
  titolo: string
  permesso: SezioneChiave
  basePath: string
  searchParams: { filtro?: string; q?: string; vista?: string }
}) {
  if (!(await utenteHaSezione(permesso))) {
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

  const righeSezione = (righe ?? []).filter((riga) => apparteneAGruppo(riga.gruppo_attivita, gruppo))

  const conDivisioneViste = gruppo === 'adulti'
  const messaggiSezione = conDivisioneViste
    ? righeSezione.filter((riga) => classificaContatto(riga) === 'messaggio')
    : righeSezione
  const appuntamentiSezione = conDivisioneViste
    ? righeSezione.filter((riga) => classificaContatto(riga) !== 'messaggio')
    : []

  const vista = conDivisioneViste && searchParams.vista === 'appuntamenti' ? 'appuntamenti' : 'messaggi'

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtro = parseFiltro(searchParams.filtro)
  const righeFiltrate = query
    ? messaggiSezione.filter((riga) => corrispondeRicerca(riga, query))
    : applicaFiltro(messaggiSezione, filtro)

  return (
    <div>
      <div className="page-header">
        <h1>{titolo}</h1>
      </div>

      {conDivisioneViste && (
        <VistaTabs
          vista={vista}
          tabs={[
            { chiave: 'messaggi', etichetta: 'Messaggi', contatore: messaggiSezione.filter((r) => !r.gestito).length },
            {
              chiave: 'appuntamenti',
              etichetta: 'Appuntamenti',
              contatore: appuntamentiSezione.filter((r) => !r.gestito).length,
            },
          ]}
        />
      )}

      {vista === 'appuntamenti' ? (
        <CalendarioAppuntamenti righe={appuntamentiSezione} puoCancellare={puoCancellare} />
      ) : (
        <>
          <div className="filtri-toolbar">
            <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
            {query ? (
              <p className="search-note">
                Ricerca su tutti i contatti, gestiti e da gestire —{' '}
                <a href={basePath} className="link">
                  annulla ricerca
                </a>
              </p>
            ) : (
              <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
            )}
          </div>

          <div className="data-table-wrap">
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
              <AccordionGroup>
                <tbody>
                  {righeFiltrate.map((riga) => (
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
              </AccordionGroup>
            </table>

            {righeFiltrate.length === 0 && (
              <p className="empty-state">
                {query ? 'Nessun risultato per la ricerca.' : 'Nessuna richiesta trovata.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
