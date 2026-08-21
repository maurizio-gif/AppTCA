import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { formatDateOra, variantePillola } from '@/lib/format'
import { ChipPersona } from '@/components/ChipPersona'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'
import { PipelineBadge } from '@/components/PipelineBadge'
import { normalizzaStato, type StatoPipeline } from '@/lib/pipeline'
import { nomePersona, testoRicerca, totaleRichieste } from '@/lib/persone'
import { conteggiRichieste } from '@/lib/persone-server'
import { storicoOpportunita } from '@/lib/opportunita-server'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { apparteneAGruppo, type GruppoContatto } from '@/lib/contatti'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import type { SezioneChiave } from '@/lib/auth/sezioni'
import { VisiteContatto } from '@/components/VisiteContatto'
import { NuovoContattoManuale } from './NuovoContattoManuale'
import { RicercaContatti } from './RicercaContatti'
import { RichiestaEvidenza } from './RichiestaEvidenza'
import { puoAmministrare, puoCancellare as puoCancellareLo, puoRiassegnare } from '@/lib/auth/permessi'
import { bloccoGestioneContatto } from './VociAppuntamenti'
import { FiltroSelect } from '@/components/FiltroSelect'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'

// Solo i campi essenziali per la lettura al volo (senza espandere la riga):
// data, nome, stato, attivita' e richiesta - data per prima perche' su
// mobile diventa la riga principale della lista (vedi CSS .row-clickable).
// Contatti e stato di gestione restano un tap di distanza nel pannello espanso.
// "Stato contatto" e' il dato verificato su PerfectGym (NUOVO, NUOVO ADULTO,
// MAI AVUTO CONTRATTO, CURRENT…) e non ha niente a che vedere con lo stato
// dell'opportunita': sono due colonne diverse di proposito.
//
// Junior non ha la pipeline dell'opportunita' (vedi piu' sotto): quella
// colonna diventa "Gestito", il modello che aveva prima e che qui resta.
const COLONNA_STATO_GESTIONE: Record<GruppoContatto, string> = { adulti: 'Opportunità', junior: 'Gestito' }

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
  'gruppo_attivita',
  // Mostrati in evidenza appena si apre la riga (vedi RichiestaEvidenza),
  // non nella griglia generica dei dettagli.
  'motivo',
  'data_richiesta',
  'ora_richiesta',
]

// Gli stati dell'opportunita' (vedi lib/pipeline.ts). "Credito caricato" non
// c'e': riguarda solo i referral. Solo Adulti: Junior e' rimasta al modello
// precedente la pipeline (vedi FILTRI_VALIDI_JUNIOR).
const FILTRI_VALIDI_ADULTI = ['da_prendere', 'in_gestione', 'vinte', 'perse', 'tutte'] as const
type FiltroAdulti = (typeof FILTRI_VALIDI_ADULTI)[number]

const OPZIONI_FILTRO_ADULTI = [
  { valore: 'da_prendere', etichetta: 'Da prendere in carico' },
  { valore: 'in_gestione', etichetta: 'In gestione' },
  { valore: 'vinte', etichetta: 'Vinte' },
  { valore: 'perse', etichetta: 'Perse' },
  { valore: 'tutte', etichetta: 'Tutte' },
]

// Junior: qui la trattativa non esiste, solo un contatto seguito o non
// ancora - gestito si'/no piu' una nota, punto (vedi GestioneGestito). E'
// il modello di sempre, non toccato quando alle Enquiries Adulti e' stata
// aggiunta l'opportunita' con la pipeline.
const FILTRI_VALIDI_JUNIOR = ['da_gestire', 'gestiti', 'tutti'] as const
type FiltroJunior = (typeof FILTRI_VALIDI_JUNIOR)[number]

const OPZIONI_FILTRO_JUNIOR = [
  { valore: 'da_gestire', etichetta: 'Da gestire' },
  { valore: 'gestiti', etichetta: 'Gestiti' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

type RigaContatto = Record<string, any>

// Assente (es. dal link nel menu) o non valida = "da prendere in carico": e'
// cio' che si vede aprendo la pagina, cioe' il lavoro che nessuno ha ancora
// preso.
function parseFiltroAdulti(raw: string | undefined): FiltroAdulti {
  if (raw && (FILTRI_VALIDI_ADULTI as readonly string[]).includes(raw)) return raw as FiltroAdulti
  return 'da_prendere'
}

function nelFiltroAdulti(filtro: FiltroAdulti, stato: StatoPipeline): boolean {
  switch (filtro) {
    case 'da_prendere':
      return stato === 'nuovo'
    case 'in_gestione':
      return stato === 'in_gestione'
    case 'vinte':
      return stato === 'vinto'
    case 'perse':
      return stato === 'perso'
    default:
      return true
  }
}

// Stesso criterio di sempre: assente o non valido = "da gestire".
function parseFiltroJunior(raw: string | undefined): FiltroJunior {
  if (raw && (FILTRI_VALIDI_JUNIOR as readonly string[]).includes(raw)) return raw as FiltroJunior
  return 'da_gestire'
}

function nelFiltroJunior(filtro: FiltroJunior, gestito: boolean): boolean {
  switch (filtro) {
    case 'da_gestire':
      return !gestito
    case 'gestiti':
      return gestito
    default:
      return true
  }
}

// attivita' e' una colonna jsonb: puo' arrivare come array (il caso normale)
// o come testo, quindi si normalizza qui invece di ripetere il controllo nella
// cella.
function etichettaAttivita(valore: unknown): string {
  if (Array.isArray(valore)) return valore.join(', ') || '—'
  return typeof valore === 'string' && valore ? valore : '—'
}

// La ricerca ignora il filtro Da gestire/Gestiti: cerca su tutti i contatti
// della sezione, gestiti o meno, dentro nome, cognome, "nome cognome"
// insieme, email e cellulare (vedi testoRicerca in lib/persone.ts).
function corrispondeRicerca(riga: RigaContatto, query: string): boolean {
  return testoRicerca({ nome: riga.nome, cognome: riga.cognome, email: riga.email, cellulare: riga.cellulare }).includes(
    query
  )
}

// Pagina condivisa da /dashboard/contatti/adulti e /dashboard/contatti/junior:
// stessa UI, filtrata sul gruppo assegnato a questa sezione (vedi
// lib/contatti.ts) e gestita separatamente cosi' da poter dare il permesso
// di accesso a operatori diversi per Adulti e per Junior.
//
// Una lista sola, in ordine di arrivo: un appuntamento prenotato dal sito e'
// una richiesta come le altre e va preso in carico come le altre, non messo
// in un calendario a parte. Il calendario e' uno solo, /dashboard/agenda:
// avere anche qui un calendario "da gestire" significava vedere in mezzo al
// lavoro da fare appuntamenti gia' fatti.
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
  searchParams: { filtro?: string; q?: string; mio?: string }
}) {
  if (!(await utenteHaSezione(permesso))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // Solo la vista Adulti si divide in due tab. Il calendario qui mostra SOLO
  // gli appuntamenti che i clienti hanno prenotato dal sito per questa
  // sezione: e' una vista dei dati della sezione, come la lista dei messaggi.
  // Il diario condiviso - quegli stessi appuntamenti piu' i task e gli
  // appuntamenti interni, di tutte le sezioni - e' /dashboard/agenda. Due
  // viste, due mestieri: il componente calendario e' lo stesso, il contenuto
  // no, altrimenti sarebbero due porte sulla stessa stanza.
  const vedeAgenda = await utenteHaSezione('agenda')

  const [
    { data: righe, error },
    { data: taskEnquiries },
    { data: staff },
    eAmministratore,
    puoRiassegnareLead,
    eCancellare,
  ] = await Promise.all([
      supabase.from('form_contatti').select('*').order('created_at', { ascending: false }),
      vedeAgenda
        ? supabase.from('task').select('*').eq('entita', 'form_contatti').order('data', { ascending: true })
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
      puoAmministrare(emailCorrente),
      puoRiassegnare(emailCorrente),
      puoCancellareLo(emailCorrente),
    ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const puoCancellare = eCancellare

  const righeSezione = (righe ?? []).filter((riga) => apparteneAGruppo(riga.gruppo_attivita, gruppo))

  // Visite al sito (per vid), opportunita'/persone/conteggi/storico: quattro
  // query che dipendono solo da righe/righeSezione, gia' arrivate, non l'una
  // dall'altra - nello stesso giro di rete invece di due in fila.
  const vids = [...new Set((righe ?? []).map((riga) => riga.vid).filter((v): v is string => !!v))]
  // Il lead e la persona di ciascuna richiesta: la pipeline e' della persona,
  // non della singola enquiry (vedi la tabella opportunita). Letti a parte e
  // agganciati per id, senza dipendere dai nomi dei vincoli di chiave esterna.
  const opportunitaIds = [...new Set(righeSezione.map((r) => r.opportunita_id).filter(Boolean))] as string[]
  const personaIds = [...new Set(righeSezione.map((r) => r.persona_id).filter(Boolean))] as string[]

  const [{ data: accessi }, { data: opportunita }, { data: persone }, conteggi, storicoPerOpportunita] =
    await Promise.all([
      vids.length > 0 ? supabase.from('accessi').select('*').in('vid', vids) : Promise.resolve({ data: [] }),
      opportunitaIds.length > 0
        ? supabase.from('opportunita').select('*').in('id', opportunitaIds)
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      personaIds.length > 0
        ? supabase.from('persone').select('*').in('id', personaIds)
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      conteggiRichieste(personaIds),
      storicoOpportunita(opportunitaIds),
    ])
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

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
    storico: storicoPerOpportunita[riga.opportunita_id] ?? [],
    task: vedeAgenda ? taskPerEnquiry.get(String(riga.id)) ?? [] : undefined,
  })

  const eJunior = gruppo === 'junior'

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtroAdulti = parseFiltroAdulti(searchParams.filtro)
  const filtroJunior = parseFiltroJunior(searchParams.filtro)
  const soloMiei = searchParams.mio === '1'

  // "I miei" tiene dentro anche i lead nuovi non ancora assegnati: sono il
  // lavoro che chiunque puo' prendere, nasconderli renderebbe il filtro una
  // trappola. Non esiste per Junior: non c'e' un assegnatario, solo gestito
  // si'/no.
  const eMio = (riga: RigaContatto) => {
    if (!soloMiei) return true
    const assegnato = (opportunitaPerId.get(riga.opportunita_id)?.assegnato_a ?? '').toLowerCase()
    return assegnato ? assegnato === emailCorrente : statoDi(riga) === 'nuovo'
  }
  const righeFiltrate = query
    ? righeSezione.filter((riga) => corrispondeRicerca(riga, query))
    : eJunior
      ? righeSezione.filter((riga) => nelFiltroJunior(filtroJunior, !!riga.gestito))
      : righeSezione.filter((riga) => nelFiltroAdulti(filtroAdulti, statoDi(riga)) && eMio(riga))

  const colonneTabella = [
    'Data e ora',
    'Nome e cognome',
    'Stato contatto',
    COLONNA_STATO_GESTIONE[gruppo],
    'Attività',
    'Richiesta',
  ]

  return (
    <div>
      <div className="page-header">
        <h1>{titolo}</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        {eJunior ? (
          <ol>
            <li>
              Cerca per nome, cognome, email o cellulare, oppure filtra tra Da gestire/Gestiti/Tutti. Si parte da
              «Da gestire»: il lavoro che nessuno ha ancora seguito.
            </li>
            <li>Apri una riga per vedere tutti i dettagli e aggiungere una nota interna.</li>
            <li>
              Per segnare un contatto come «Gestito» devi prima scrivere e salvare una <strong>nota</strong>: è il
              modo per lasciare traccia di cosa è stato fatto.
            </li>
            <li>
              In <strong>«In agenda»</strong> fissi una chiamata o un appuntamento collegato a questa richiesta, e
              vedi l'elenco di quelli già fissati; se la richiesta è un appuntamento prenotato dal sito, qui sopra
              lo segni anche come avvenuto.
            </li>
          </ol>
        ) : (
          <ol>
            <li>
              Cerca per nome, cognome, email o cellulare, oppure filtra per stato dell'opportunità. Si parte da «Da
              prendere in carico»: il lavoro che nessuno ha ancora preso.
            </li>
            <li>
              Apri una riga: in evidenza trovi l'<strong>opportunità</strong> (Da prendere in carico → In gestione →
              Vinta/Persa). Chi preme «Prendi in carico» ne diventa l'assegnatario, e da lì solo lui — o un
              amministratore — la fa avanzare.
            </li>
            <li>
              L'opportunità è della <strong>persona</strong>, non del singolo messaggio: se ha già una trattativa
              aperta (magari da un altro modulo) la richiesta si aggancia a quella. Il nome cliccabile apre la sua
              scheda.
            </li>
            <li>
              Subito sotto i pulsanti dell'opportunità c'è <strong>«In agenda»</strong>: da lì fissi la prossima
              mossa — una chiamata, un appuntamento — e vedi l'elenco di quelle già fissate su questa richiesta.
            </li>
            <li>
              Qui ci sono <strong>tutte</strong> le richieste della sezione, messaggi e appuntamenti prenotati dal
              sito: un appuntamento è una richiesta da prendere in carico come le altre. Il calendario è uno solo,
              l'
              <Link href="/dashboard/agenda" className="link">
                <strong>Agenda</strong>
              </Link>
              , dove un appuntamento si segna come fatto con la nota di com'è andata.
            </li>
          </ol>
        )}
        <p className="box-istruzioni-nota">
          «Stato contatto» in tabella è il dato verificato su PerfectGym (NUOVO, MAI AVUTO CONTRATTO,
          CURRENT…), non ha niente a che vedere con {eJunior ? '«Gestito»' : "l'opportunità"}: sono due colonne
          diverse. «Cancella record» è visibile solo a chi ha il permesso di cancellare, ed è irreversibile: chiede
          sempre conferma.
        </p>
      </BoxIstruzioni>

      <NuovoContattoManuale />

      <div className="filtri-toolbar">
        <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
        {query ? (
          <p className="search-note">
            Ricerca su tutte le richieste della sezione, in qualunque stato —{' '}
            <a href={basePath} className="link">
              annulla ricerca
            </a>
          </p>
        ) : eJunior ? (
          <FiltroSelect valore={filtroJunior} opzioni={OPZIONI_FILTRO_JUNIOR} />
        ) : (
          <>
            <FiltroSelect valore={filtroAdulti} opzioni={OPZIONI_FILTRO_ADULTI} />
            <FiltroCheckbox attivo={soloMiei} param="mio" etichetta="Solo i miei" />
          </>
        )}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              {colonneTabella.map((colonna) => (
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
                    columnCount={7}
                    columns={colonneTabella}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
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
                      riga.stato || '—',
                      eJunior ? (
                        <span className={`richiesta-badge ${riga.gestito ? 'richiesta-verde' : 'richiesta-neutro'}`}>
                          {riga.gestito ? 'Gestito' : 'Da gestire'}
                        </span>
                      ) : (
                        <PipelineBadge stato={stato} />
                      ),
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
    </div>
  )
}
