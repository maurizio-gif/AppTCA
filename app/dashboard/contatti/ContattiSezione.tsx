import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDateOra, variantePillola } from '@/lib/format'
import { ChipPersona } from '@/components/ChipPersona'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'
import { PipelineBadge } from '@/components/PipelineBadge'
import { normalizzaStato, type StatoPipeline } from '@/lib/pipeline'
import { nomePersona, totaleRichieste } from '@/lib/persone'
import { conteggiRichieste } from '@/lib/persone-server'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, classificaContatto, type GruppoContatto } from '@/lib/contatti'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import type { SezioneChiave } from '@/lib/auth/sezioni'
import { VisiteContatto } from '@/components/VisiteContatto'
import { RicercaContatti } from './RicercaContatti'
import { RichiestaEvidenza } from './RichiestaEvidenza'
import { VistaTabs } from '@/components/VistaTabs'
import { CalendarioAgenda, type VoceCalendario } from '@/components/CalendarioAgenda'
import { puoAmministrare, puoRiassegnare } from '@/lib/auth/permessi'
import { bloccoGestioneContatto, voceCalendarioDaContatto } from './VociAppuntamenti'
import { voceCalendarioDaTask } from '../agenda/VociTask'
import { NuovoTask } from '../agenda/NuovoTask'
import { FiltroSelect } from '@/components/FiltroSelect'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'

// Solo i campi essenziali per la lettura al volo (senza espandere la riga):
// data, nome, stato, attivita' e richiesta - data per prima perche' su
// mobile diventa la riga principale della lista (vedi CSS .row-clickable).
// Contatti e stato di gestione restano un tap di distanza nel pannello espanso.
const COLONNE_TABELLA = ['Data e ora', 'Nome e cognome', 'Lead', 'Attività', 'Richiesta']

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

// La pipeline (vedi lib/pipeline.ts) piu' "Da rispondere", che e' il lavoro
// quotidiano di questa sezione: "gestito" su un'enquiry vuol dire "a questo
// messaggio ho risposto", e non e' lo stato del lead - la stessa persona puo'
// avere una trattativa aperta e un messaggio nuovo ancora senza risposta.
// "Credito caricato" non c'e': riguarda solo i referral.
const FILTRI_VALIDI = ['da_rispondere', 'nuovi', 'in_gestione', 'vinti', 'persi', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'da_rispondere', etichetta: 'Da rispondere' },
  { valore: 'nuovi', etichetta: 'Lead nuovi' },
  { valore: 'in_gestione', etichetta: 'Lead in gestione' },
  { valore: 'vinti', etichetta: 'Lead vinti' },
  { valore: 'persi', etichetta: 'Lead persi' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

type RigaContatto = Record<string, any>

// Assente (es. dal link nel menu) o non valida = "da rispondere": e' cio' che
// si vede aprendo la pagina, cioe' i messaggi ancora senza risposta.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'da_rispondere'
}

function nelFiltro(filtro: Filtro, riga: RigaContatto, stato: StatoPipeline): boolean {
  switch (filtro) {
    case 'da_rispondere':
      return !riga.gestito
    case 'nuovi':
      return stato === 'nuovo'
    case 'in_gestione':
      return stato === 'in_gestione'
    case 'vinti':
      return stato === 'vinto'
    case 'persi':
      return stato === 'perso'
    default:
      return true
  }
}

// La ricerca ignora il filtro Da gestire/Gestiti: cerca su tutti i
// contatti della sezione, gestiti o meno, dentro nome, cognome, email e
// cellulare.
const CAMPI_RICERCA = ['nome', 'cognome', 'email', 'cellulare'] as const

// attivita' e' una colonna jsonb: puo' arrivare come array (il caso normale)
// o come testo, quindi si normalizza qui invece di ripetere il controllo nella
// cella.
function etichettaAttivita(valore: unknown): string {
  if (Array.isArray(valore)) return valore.join(', ') || '—'
  return typeof valore === 'string' && valore ? valore : '—'
}

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
  searchParams: { filtro?: string; q?: string; vista?: string; mio?: string }
}) {
  if (!(await utenteHaSezione(permesso))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // Solo la vista Adulti ha il calendario, ed e' la stessa agenda condivisa
  // di /dashboard/agenda: qui arrivano quindi anche i task delle consulenti
  // (tabella task), non solo gli appuntamenti prenotati dal sito. L'agenda
  // pero' la vede (e la scrive) solo chi ha il permesso della sezione Agenda:
  // il calendario condiviso non e' una scorciatoia per aggirarlo.
  const conDivisioneViste = gruppo === 'adulti'
  const vedeAgenda = await utenteHaSezione('agenda')

  const [
    { data: righe, error },
    { data: viewer },
    { data: task },
    { data: taskEnquiries },
    { data: staff },
    eAmministratore,
    puoRiassegnareLead,
  ] = await Promise.all([
      supabase.from('form_contatti').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_users').select('puo_cancellare').eq('email', emailCorrente ?? '').maybeSingle(),
      conDivisioneViste && vedeAgenda
        ? supabase.from('task').select('*')
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      vedeAgenda
        ? supabase.from('task').select('*').eq('entita', 'form_contatti').order('data', { ascending: true })
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
      puoAmministrare(emailCorrente),
      puoRiassegnare(emailCorrente),
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

  // Il lead e la persona di ciascuna richiesta: la pipeline e' della persona,
  // non della singola enquiry (vedi la tabella opportunita). Letti a parte e
  // agganciati per id, senza dipendere dai nomi dei vincoli di chiave esterna.
  const opportunitaIds = [...new Set(righeSezione.map((r) => r.opportunita_id).filter(Boolean))] as string[]
  const personaIds = [...new Set(righeSezione.map((r) => r.persona_id).filter(Boolean))] as string[]

  const [{ data: opportunita }, { data: persone }, conteggi] = await Promise.all([
    opportunitaIds.length > 0
      ? supabase.from('opportunita').select('*').in('id', opportunitaIds)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    personaIds.length > 0
      ? supabase.from('persone').select('*').in('id', personaIds)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    conteggiRichieste(personaIds),
  ])

  const opportunitaPerId = new Map((opportunita ?? []).map((o) => [o.id, o]))
  const personePerId = new Map((persone ?? []).map((p) => [p.id, p]))
  const statoDi = (riga: RigaContatto): StatoPipeline =>
    normalizzaStato(opportunitaPerId.get(riga.opportunita_id)?.stato)
  const richiesteDi = (personaId: string) =>
    totaleRichieste(conteggi[personaId] ?? { enquiries: 0, inviti: 0, scuolaTennis: 0, summerCamp: 0, eventi: 0 })

  const elencoStaff = (staff ?? []).map((persona) => ({
    email: persona.email,
    nome: `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() || persona.email,
  }))
  const nomiStaff: Record<string, string> = Object.fromEntries(
    elencoStaff.map((persona) => [persona.email.toLowerCase(), persona.nome])
  )

  // Eventi in agenda collegati a ciascuna enquiry: la stessa richiesta puo'
  // averne piu' di uno (una chiamata e poi la visita in sede), quindi nella
  // riga va l'elenco. Gli stessi eventi si ritrovano nella scheda della
  // persona, che li ha tutti (vedi /dashboard/persone/[id]).
  const taskPerEnquiry = new Map<string, Record<string, any>[]>()
  for (const riga of taskEnquiries ?? []) {
    const chiave = String(riga.entita_id)
    if (!taskPerEnquiry.has(chiave)) taskPerEnquiry.set(chiave, [])
    taskPerEnquiry.get(chiave)!.push(riga)
  }

  const gestioneDi = (riga: RigaContatto) => ({
    lead: opportunitaPerId.get(riga.opportunita_id) ?? null,
    emailCorrente,
    eAmministratore,
    puoRiassegnareLead,
    puoCancellare,
    staff: elencoStaff,
    task: vedeAgenda ? taskPerEnquiry.get(String(riga.id)) ?? [] : undefined,
  })

  const messaggiSezione = conDivisioneViste
    ? righeSezione.filter((riga) => classificaContatto(riga) === 'messaggio')
    : righeSezione
  const appuntamentiSezione = conDivisioneViste
    ? righeSezione.filter((riga) => classificaContatto(riga) !== 'messaggio')
    : []

  const vista = conDivisioneViste && searchParams.vista === 'appuntamenti' ? 'appuntamenti' : 'messaggi'

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtro = parseFiltro(searchParams.filtro)
  const soloMiei = searchParams.mio === '1'
  // Nel filtro "Da rispondere" sono tutte senza risposta: evidenziarle tutte
  // non direbbe niente. Negli altri filtri invece un messaggio non risposto in
  // mezzo a lead lavorati deve saltare all'occhio.
  const evidenziaSenzaRisposta = filtro !== 'da_rispondere'

  // "I miei" tiene dentro anche i lead nuovi non ancora assegnati: sono il
  // lavoro che chiunque puo' prendere, nasconderli renderebbe il filtro una
  // trappola.
  const eMio = (riga: RigaContatto) => {
    if (!soloMiei) return true
    const assegnato = (opportunitaPerId.get(riga.opportunita_id)?.assegnato_a ?? '').toLowerCase()
    return assegnato ? assegnato === emailCorrente : statoDi(riga) === 'nuovo'
  }
  const righeFiltrate = query
    ? messaggiSezione.filter((riga) => corrispondeRicerca(riga, query))
    : messaggiSezione.filter((riga) => nelFiltro(filtro, riga, statoDi(riga)) && eMio(riga))
  // Stessa ricerca del tab Messaggi, applicata anche agli appuntamenti: un
  // contatto si trova a prescindere da dove sia finito, senza dover
  // indovinare in quale dei due tab guardare.
  const appuntamentiFiltrati = query
    ? appuntamentiSezione.filter((riga) => corrispondeRicerca(riga, query))
    : appuntamentiSezione.filter((riga) => eMio(riga))

  // Appuntamenti dal sito e task nello stesso calendario (vedi lib/agenda.ts).
  // Durante una ricerca i task restano fuori: si sta cercando un contatto,
  // e un elenco di task non c'entrerebbe niente col risultato.
  const vociCalendario: VoceCalendario[] = conDivisioneViste
    ? [
        ...appuntamentiFiltrati.map((riga) =>
          voceCalendarioDaContatto(riga, {
            nomiStaff,
            accessi: riga.vid ? accessiPerVid[riga.vid] ?? [] : [],
            gestione: gestioneDi(riga),
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
                <NuovoTask staff={elencoStaff} emailCorrente={emailCorrente} />
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
                oppure filtra per stato del lead. «Da rispondere» è il filtro di partenza: i messaggi a cui nessuno
                ha ancora risposto.
              </li>
              <li>
                Apri una riga: in evidenza trovi il <strong>lead</strong> con la pipeline (Nuovo → In gestione →
                Vinto/Perso). Chi preme «Prendi in gestione» ne diventa l'assegnatario.
              </li>
              <li>
                Il lead è della <strong>persona</strong>, non del singolo messaggio: se ha già una trattativa aperta
                (magari da un altro modulo) la richiesta si aggancia a quella. Il nome cliccabile apre la sua scheda.
              </li>
              <li>
                Nel blocco «Questa richiesta» segni che a <em>questo</em> messaggio hai risposto, con la nota di cosa
                hai fatto; in «In agenda» fissi una chiamata o un appuntamento collegato.
              </li>
              {conDivisioneViste && (
                <li>
                  Solo qui trovi i messaggi (richiamami, domande generiche): gli appuntamenti fissati sono
                  nell'altro tab, nel calendario.
                </li>
              )}
            </ol>
            <p className="box-istruzioni-nota">
              «Da rispondere» e stato del lead sono due cose diverse: una persona può avere la trattativa in
              gestione e un messaggio nuovo ancora senza risposta — per questo la riga resta evidenziata finché non
              la segni. «Cancella record» è visibile solo a chi ha il permesso di cancellare, ed è irreversibile.
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
                <>
                  <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
                  <FiltroCheckbox attivo={soloMiei} param="mio" etichetta="Solo i miei" />
                </>
              )}
            </div>
          )}

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  {COLONNE_TABELLA.map((colonna) => (
                    <th key={colonna}>{colonna}</th>
                  ))}
                </tr>
              </thead>
              <AccordionGroup>
                <tbody>
                  {righeFiltrate.map((riga) => {
                    const stato = statoDi(riga)
                    const persona = personePerId.get(riga.persona_id)
                    const { extra, extraTitle, sections } = bloccoGestioneContatto(riga, gestioneDi(riga))

                    return (
                      <ExpandableRow
                        key={riga.id}
                        id={String(riga.id)}
                        columnCount={6}
                        columns={COLONNE_TABELLA}
                        record={riga}
                        hiddenKeys={COLONNE_VISIBILI}
                        evidenziata={evidenziaSenzaRisposta && !riga.gestito}
                        evidenza={<RichiestaEvidenza riga={riga} />}
                        consultazione={<VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />}
                        extra={extra}
                        extraTitle={extraTitle}
                        sections={sections}
                        cells={[
                          formatDateOra(riga.created_at),
                          persona ? (
                            <ChipPersona
                              id={persona.id}
                              nome={nomePersona(persona)}
                              richieste={richiesteDi(persona.id)}
                              storico={!!persona.storico}
                            />
                          ) : (
                            <>
                              {riga.nome} {riga.cognome}
                            </>
                          ),
                          <>
                            <PipelineBadge stato={stato} />
                            {!riga.gestito && (
                              <>
                                <br />
                                <span className="richiesta-badge richiesta-ambra">Da rispondere</span>
                              </>
                            )}
                          </>,
                          etichettaAttivita(riga.attivita),
                          riga.tipo_richiesta ? (
                            <span className={`richiesta-badge richiesta-${variantePillola(riga.tipo_richiesta)}`}>
                              {riga.tipo_richiesta}
                            </span>
                          ) : (
                            '—'
                          ),
                        ]}
                      />
                    )
                  })}
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
