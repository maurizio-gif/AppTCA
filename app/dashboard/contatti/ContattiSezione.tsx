import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, classificaContatto, type GruppoContatto } from '@/lib/contatti'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import type { SezioneChiave } from '@/lib/auth/sezioni'
import { VisiteContatto } from '@/components/VisiteContatto'
import { GestioneSezione } from './GestioneSezione'
import { RicercaContatti } from './RicercaContatti'
import { RichiestaEvidenza } from './RichiestaEvidenza'
import { VistaTabs } from '@/components/VistaTabs'
import { CalendarioAgenda, type VoceCalendario } from '@/components/CalendarioAgenda'
import { puoAmministrare } from '@/lib/auth/permessi'
import { voceCalendarioDaContatto } from './VociAppuntamenti'
import { voceCalendarioDaTask } from '../agenda/VociTask'
import { NuovoTask } from '../agenda/NuovoTask'
import { FiltroSelect } from '@/components/FiltroSelect'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'

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
// (nel calendario dell'agenda condivisa, in base al giorno fissato e non a
// quando e' arrivata la richiesta - vedi components/CalendarioAgenda.tsx).
// Su Junior non c'e' questa distinzione, resta l'unica lista di sempre.
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
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // Solo la vista Adulti ha il calendario, ed e' la stessa agenda condivisa
  // di /dashboard/agenda: qui arrivano quindi anche i task delle consulenti
  // (tabella task), non solo gli appuntamenti prenotati dal sito. I task
  // pero' li vede (e li crea) solo chi ha il permesso della sezione Agenda:
  // il calendario condiviso non e' una scorciatoia per aggirarlo.
  const conDivisioneViste = gruppo === 'adulti'
  const vedeAgenda = conDivisioneViste && (await utenteHaSezione('agenda'))

  const [{ data: righe, error }, { data: viewer }, { data: task }, { data: staff }, eAmministratore] =
    await Promise.all([
      supabase.from('form_contatti').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_users').select('puo_cancellare').eq('email', emailCorrente ?? '').maybeSingle(),
      vedeAgenda ? supabase.from('task').select('*') : Promise.resolve({ data: [] as Record<string, any>[] }),
      supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
      puoAmministrare(emailCorrente),
    ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const puoCancellare = !!viewer?.puo_cancellare

  // Visite al sito di ciascun contatto (per vid), per capire quanto e'
  // "caldo" il lead prima di richiamarlo - vedi VisiteContatto. Interrogata
  // dopo i contatti perche' serve l'elenco dei vid da cercare.
  const vids = [...new Set((righe ?? []).map((riga) => riga.vid).filter((v): v is string => !!v))]
  const { data: accessi } = vids.length > 0 ? await supabase.from('accessi').select('*').in('vid', vids) : { data: [] }
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

  const righeSezione = (righe ?? []).filter((riga) => apparteneAGruppo(riga.gruppo_attivita, gruppo))

  const elencoStaff = (staff ?? []).map((persona) => ({
    email: persona.email,
    nome: `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() || persona.email,
  }))
  const nomiStaff: Record<string, string> = Object.fromEntries(
    elencoStaff.map((persona) => [persona.email.toLowerCase(), persona.nome])
  )

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
  // Stessa ricerca del tab Messaggi, applicata anche agli appuntamenti: un
  // contatto si trova a prescindere da dove sia finito, senza dover
  // indovinare in quale dei due tab guardare.
  const appuntamentiFiltrati = query
    ? appuntamentiSezione.filter((riga) => corrispondeRicerca(riga, query))
    : appuntamentiSezione

  // Appuntamenti dal sito e task nello stesso calendario (vedi lib/agenda.ts).
  // Durante una ricerca i task restano fuori: si sta cercando un contatto,
  // e un elenco di task non c'entrerebbe niente col risultato.
  const vociCalendario: VoceCalendario[] = conDivisioneViste
    ? [
        ...appuntamentiFiltrati.map((riga) =>
          voceCalendarioDaContatto(riga, {
            nomiStaff,
            puoCancellare,
            accessi: riga.vid ? accessiPerVid[riga.vid] ?? [] : [],
          })
        ),
        ...(query
          ? []
          : (task ?? []).map((riga) =>
              voceCalendarioDaTask(riga, { nomiStaff, emailCorrente, eAmministratore })
            )),
      ]
    : []

  return (
    <div>
      <div className="page-header">
        <h1>{titolo}</h1>
      </div>

      {conDivisioneViste && (
        <>
          <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
          {query && (
            <p className="search-note">
              Ricerca su Messaggi e Appuntamenti —{' '}
              <a href={basePath} className="link">
                annulla ricerca
              </a>
            </p>
          )}
          <VistaTabs
            vista={vista}
            tabs={[
              {
                chiave: 'messaggi',
                etichetta: 'Messaggi',
                // Durante una ricerca il numero e' quanti risultati ci sono
                // in quel tab (cosi' si vede subito dove guardare se il
                // contatto compare in entrambi), altrimenti e' il carico di
                // lavoro (da gestire) di sempre.
                contatore: query ? righeFiltrate.length : messaggiSezione.filter((r) => !r.gestito).length,
              },
              {
                chiave: 'appuntamenti',
                etichetta: 'Appuntamenti',
                contatore: query ? appuntamentiFiltrati.length : appuntamentiSezione.filter((r) => !r.gestito).length,
              },
            ]}
          />
        </>
      )}

      {vista === 'appuntamenti' ? (
        <>
          <BoxIstruzioni titolo="Come funziona">
            <ol>
              <li>
                Questo è il calendario dell'<strong>agenda condivisa</strong> (la stessa che trovi alla voce
                Agenda): ci sono sia gli appuntamenti prenotati dal sito sia i task e gli appuntamenti che vi
                fissate voi.
              </li>
              <li>
                Ogni appuntamento compare nel giorno <strong>fissato</strong>, non nel giorno in cui è arrivata la
                richiesta. Pallino rosso: quel giorno c'è ancora qualcosa da fare; pallino verde: tutto gestito.
              </li>
              <li>Clicca un giorno per aprire sotto l'elenco, e «+ Aggiungi in agenda» per metterci qualcosa.</li>
              <li>
                Apri una riga per aggiungere una nota, segnarla come gestita o cancellarla (se hai il permesso).
              </li>
            </ol>
            <p className="box-istruzioni-nota">
              Un appuntamento senza una data registrata finisce nella sezione «Senza data» in fondo alla pagina,
              così non resta invisibile. Durante una ricerca il calendario mostra solo gli appuntamenti trovati,
              senza i task.
            </p>
          </BoxIstruzioni>
          <CalendarioAgenda
            voci={vociCalendario}
            nuovoTask={
              vedeAgenda ? (
                <NuovoTask staff={elencoStaff} emailCorrente={emailCorrente} collegabili={[]} />
              ) : undefined
            }
          />
          {query && appuntamentiFiltrati.length === 0 && (
            <p className="empty-state">Nessun risultato per la ricerca negli appuntamenti.</p>
          )}
        </>
      ) : (
        <>
          <BoxIstruzioni titolo="Come funziona">
            <ol>
              <li>
                Cerca per nome, cognome, email o cellulare{conDivisioneViste ? ' (trova sia Messaggi che Appuntamenti)' : ''},
                oppure filtra tra Da gestire/Gestiti/Tutti.
              </li>
              <li>Apri una riga per vedere tutti i dettagli e aggiungere una nota interna.</li>
              <li>
                Per segnare un contatto come «Gestito» devi prima scrivere e salvare una nota: è il modo per
                lasciare traccia di cosa è stato fatto.
              </li>
              {conDivisioneViste && (
                <li>
                  Solo qui trovi i messaggi (richiamami, domande generiche): gli appuntamenti fissati sono
                  nell'altro tab, nel calendario.
                </li>
              )}
            </ol>
            <p className="box-istruzioni-nota">
              «Cancella record» è visibile solo a chi ha il permesso di cancellare, ed è irreversibile: chiede
              sempre una conferma.
            </p>
          </BoxIstruzioni>

          {(!conDivisioneViste || !query) && (
            <div className="filtri-toolbar">
              {!conDivisioneViste && <RicercaContatti valoreIniziale={searchParams.q ?? ''} />}
              {query ? (
                !conDivisioneViste && (
                  <p className="search-note">
                    Ricerca su tutti i contatti, gestiti e da gestire —{' '}
                    <a href={basePath} className="link">
                      annulla ricerca
                    </a>
                  </p>
                )
              ) : (
                <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
              )}
            </div>
          )}

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
                      evidenza={
                        <>
                          <RichiestaEvidenza riga={riga} />
                          <VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />
                        </>
                      }
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
