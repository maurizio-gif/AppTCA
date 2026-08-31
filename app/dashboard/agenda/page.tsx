import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'
import { FiltroData } from '@/components/FiltroData'
import { FiltroSelect } from '@/components/FiltroSelect'
import { VistaTabs } from '@/components/VistaTabs'
import { CalendarioAgenda, TabellaAgenda, type VoceCalendario } from '@/components/CalendarioAgenda'
import { formatDataConGiorno } from '@/lib/format'
import { getSezioniConsentite, utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare, puoCancellare as puoCancellareRecord, puoRiassegnare } from '@/lib/auth/permessi'
import { storicoOpportunita } from '@/lib/opportunita-server'
import { chiaveGiornoDa, confrontaVoci, eAppuntamento, eAppuntamentoVero, testoRicerca } from '@/lib/agenda'
import { apparteneAGruppo } from '@/lib/contatti'
import { nomePersona } from '@/lib/persone'
import { RicercaContatti } from '../contatti/RicercaContatti'
import { voceCalendarioDaContatto } from '../contatti/VociAppuntamenti'
import { voceCalendarioDaTask } from './VociTask'
import { NuovoTask } from './NuovoTask'

export const dynamic = 'force-dynamic'

const OPZIONI_FILTRO = [
  { valore: 'tutto', etichetta: 'Tutto' },
  { valore: 'da_fare', etichetta: 'Solo da fare' },
  { valore: 'appuntamenti', etichetta: 'Solo appuntamenti' },
  { valore: 'task', etichetta: 'Solo task' },
]

// Agenda condivisa: un solo calendario per gli appuntamenti che i clienti
// prenotano dal sito (form_contatti) e per gli appuntamenti/task che le
// consulenti si fissano da sole (tabella task). Vedi lib/agenda.ts per il
// modello comune e components/CalendarioAgenda.tsx per il calendario, che e'
// lo stesso usato dal tab Appuntamenti delle Enquiries Adulti.
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { filtro?: string; mio?: string; vista?: string; q?: string; dal?: string; al?: string }
}) {
  if (!(await utenteHaSezione('agenda'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // Tutto cio' che non dipende dal risultato di un'altra query, in un colpo
  // solo: sette query sequenziali diventavano un giro di rete a testa, e
  // qui - a differenza delle altre pagine - il permesso non decide COSA
  // arriva dal database (form_contatti si legge comunque, e' piccola), solo
  // cosa finisce in vociContatti qualche riga piu' sotto. getSezioniConsentite
  // e le puo*() leggono la stessa riga di staff_users gia' in cache (vedi
  // lib/auth/staff-server.ts), quindi entrano qui senza costare una query in
  // piu'.
  const [
    { data: task, error },
    { data: contatti },
    { data: staff },
    { data: inviti },
    sezioni,
    eAmministratore,
    puoRiassegnareLead,
    puoCancellare,
  ] = await Promise.all([
      supabase.from('task').select('*'),
      supabase.from('form_contatti').select('*'),
      supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
      supabase.from('form_invita_amico').select('id, amico_nome, amico_cognome, amico_email'),
      getSezioniConsentite(emailCorrente),
      puoAmministrare(emailCorrente),
      puoRiassegnare(emailCorrente),
      puoCancellareRecord(emailCorrente),
    ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  // Gli appuntamenti dal sito si vedono in agenda solo se si vedono anche
  // nella loro sezione: l'agenda non e' una scorciatoia per aggirare i
  // permessi delle Enquiries. Il filtro e' su vociContatti piu' sotto, non
  // su questa query: i dati arrivano comunque (la tabella e' piccola), cosi'
  // non serve sapere i permessi prima di partire con le query.
  const vedeAdulti = sezioni.includes('contatti-adulti')
  const vedeJunior = sezioni.includes('contatti-junior')

  const elencoStaff = (staff ?? []).map((persona) => ({
    email: persona.email,
    nome: `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() || persona.email,
  }))
  const nomiStaff: Record<string, string> = Object.fromEntries(
    elencoStaff.map((persona) => [persona.email.toLowerCase(), persona.nome])
  )

  // Etichette dei record collegati ai task, per non mostrare
  // "form_invita_amico:9f2c…" in calendario.
  const etichetteCollegamento: Record<string, string> = Object.fromEntries(
    (inviti ?? []).map((invito) => [
      `form_invita_amico:${invito.id}`,
      `Invita un amico · ${
        `${invito.amico_nome ?? ''} ${invito.amico_cognome ?? ''}`.trim() || invito.amico_email || 'invito'
      }`,
    ])
  )

  // Nome delle persone dei task: in agenda conta con chi e' l'appuntamento.
  const personaIds = [...new Set((task ?? []).map((riga) => riga.persona_id).filter(Boolean))] as string[]
  // Le opportunita' delle enquiries mostrate: il pannello gestisce quelle.
  const opportunitaIds = [...new Set((contatti ?? []).map((r) => r.opportunita_id).filter(Boolean))] as string[]

  // Tre query che dipendono solo da task/contatti (gia' arrivati), non l'una
  // dall'altra: nello stesso giro invece di uno a testa.
  const [{ data: persone }, { data: opportunita }, storicoPerOpportunita] = await Promise.all([
    personaIds.length
      ? supabase.from('persone').select('id, nome, cognome, email, cellulare').in('id', personaIds)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    opportunitaIds.length
      ? supabase.from('opportunita').select('*').in('id', opportunitaIds)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    storicoOpportunita(opportunitaIds),
  ])
  const opportunitaPerId = new Map((opportunita ?? []).map((o) => [o.id, o]))

  const nomiPersone: Record<string, string> = Object.fromEntries(
    (persone ?? []).map((persona) => [persona.id, nomePersona(persona)])
  )
  // Un task non ha nome/email/cellulare propri: li eredita dalla persona
  // collegata, se c'e' una (vedi voceCalendarioDaTask).
  const ricercaPersone: Record<string, string> = Object.fromEntries(
    (persone ?? []).map((persona) => [
      persona.id,
      testoRicerca({ nome: persona.nome, cognome: persona.cognome, email: persona.email, cellulare: persona.cellulare }),
    ])
  )

  const vociTask: VoceCalendario[] = (task ?? []).map((riga) =>
    voceCalendarioDaTask(riga, {
      nomiStaff,
      emailCorrente,
      eAmministratore,
      staff: elencoStaff,
      etichetteCollegamento,
      nomiPersone,
      ricercaPersone,
    })
  )

  // Eventi collegati a ciascuna enquiry, per l'elenco dentro la riga: sono gli
  // stessi task gia' caricati per il calendario, raggruppati per richiesta.
  const taskPerEnquiry = new Map<string, Record<string, any>[]>()
  for (const riga of task ?? []) {
    if (riga.entita !== 'form_contatti' || !riga.entita_id) continue
    const chiave = String(riga.entita_id)
    if (!taskPerEnquiry.has(chiave)) taskPerEnquiry.set(chiave, [])
    taskPerEnquiry.get(chiave)!.push(riga)
  }

  const vociContatti: VoceCalendario[] = (contatti ?? [])
    .filter((riga) => eAppuntamento(riga))
    .filter(
      (riga) =>
        (vedeAdulti && apparteneAGruppo(riga.gruppo_attivita, 'adulti')) ||
        (vedeJunior && apparteneAGruppo(riga.gruppo_attivita, 'junior'))
    )
    .map((riga) =>
      voceCalendarioDaContatto(riga, {
        nomiStaff,
        gestione: {
          lead: opportunitaPerId.get(riga.opportunita_id) ?? null,
          emailCorrente,
          eAmministratore,
          puoRiassegnareLead,
          puoCancellare,
          staff: elencoStaff,
          storico: (riga.opportunita_id && storicoPerOpportunita[riga.opportunita_id]) || [],
          task: taskPerEnquiry.get(String(riga.id)) ?? [],
        },
      })
    )

  const filtro = OPZIONI_FILTRO.some((o) => o.valore === searchParams.filtro)
    ? (searchParams.filtro as string)
    : 'tutto'
  const soloMiei = searchParams.mio === '1'
  const vista = searchParams.vista === 'lista' ? 'lista' : 'calendario'

  const voci = [...vociTask, ...vociContatti].filter((voce) => {
    if (filtro === 'da_fare' && !voce.daFare) return false
    // "Solo task" tiene dentro anche email e whatsapp: sono lavoro che la
    // consulente si segna da sola, non un appuntamento prenotato con la
    // persona. "Solo appuntamenti" invece resta ai due che prenotano
    // davvero uno slot: senza questo email e whatsapp ci finivano dentro
    // solo perche' non sono un task.
    if (filtro === 'task' && eAppuntamentoVero(voce.tipo)) return false
    if (filtro === 'appuntamenti' && !eAppuntamentoVero(voce.tipo)) return false
    if (soloMiei) {
      // "I miei" tiene dentro anche gli appuntamenti dal sito ancora da
      // gestire: non hanno un titolare, ma sono lavoro di tutti.
      const assegnato = voce.assegnatoA?.toLowerCase() ?? null
      if (assegnato ? assegnato !== emailCorrente : !voce.daFare) return false
    }
    return true
  })

  const oggi = chiaveGiornoDa(new Date())
  const query = (searchParams.q ?? '').trim().toLowerCase()
  const dal = searchParams.dal ?? ''
  const al = searchParams.al ?? ''
  // Una ricerca o un intervallo di date e' una richiesta esplicita di
  // guardare oltre il "da fare": in quel caso non si limita piu' agli
  // arretrati ancora aperti e al futuro, altrimenti cercare un nome non
  // troverebbe una visita del mese scorso gia' segnata come fatta (stessa
  // logica di ContattiSezione: la ricerca sostituisce lo scope predefinito,
  // non si aggiunge sopra).
  const ricercaAttiva = !!query || !!dal || !!al
  const vociListaBase = ricercaAttiva ? voci : voci.filter((voce) => !voce.data || voce.data >= oggi || voce.daFare)
  const vociLista = vociListaBase
    .filter((voce) => !query || voce.ricerca.includes(query))
    .filter((voce) => !dal || (voce.data ?? '') >= dal)
    .filter((voce) => !al || (voce.data ?? '9999-99-99') <= al)
    .sort((a, b) => (a.data ?? '9999-99-99').localeCompare(b.data ?? '9999-99-99') || confrontaVoci(a, b))
  const giorniLista = [...new Set(vociLista.map((voce) => voce.data ?? 'senza-data'))]

  const daFare = voci.filter((voce) => voce.daFare).length

  return (
    <div>
      <div className="page-header">
        <h1>Agenda</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Un solo calendario per tutto: gli <strong>appuntamenti prenotati dal sito</strong> (in sede o
            telefonata) e quello che vi fissate voi — appuntamento, telefonata, <strong>email</strong>,{' '}
            <strong>WhatsApp</strong> o task generico.
          </li>
          <li>
            Registri qualcosa per un momento già passato, o nei prossimi 30 minuti? Nasce già{' '}
            <strong>completata</strong>: è chiaramente qualcosa già fatto, non lavoro ancora da fare.
          </li>
          <li>
            Clicca un giorno per vedere cosa c'è, poi «+ Aggiungi in agenda» per metterci qualcosa di nuovo: il
            giorno selezionato è già proposto.
          </li>
          <li>
            Un task può essere assegnato a una collega, e <strong>chiunque</strong> può chiuderlo scrivendo com'è
            andata: chi risponde al telefono al posto di un'altra deve poterlo fare subito. Nel registro operatori
            resta chi ha chiuso cosa. Solo <em>eliminare</em> una voce resta di chi ce l'ha in mano, di chi l'ha
            creata o di un amministratore, perché è irreversibile.
          </li>
          <li>
            Quando una cosa è fatta, aprila e chiudila scrivendo <strong>com'è andata</strong>: un task si
            «Completa», un appuntamento dal sito si segna come fatto. Da quel momento è verde e non conta più fra
            le cose da fare — è l'unico modo per non trovarsi in agenda impegni già passati.
          </li>
          <li>
            Gli appuntamenti arrivati dal sito portano con sé la loro opportunità: la si gestisce da qui
            esattamente come nelle Enquiries.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Vedi in agenda solo gli appuntamenti delle sezioni Enquiries a cui hai accesso. Pallino rosso su un
          giorno = lì c'è ancora qualcosa da fare; verde = tutto chiuso.
        </p>
      </BoxIstruzioni>

      <VistaTabs
        vista={vista}
        tabs={[
          { chiave: 'calendario', etichetta: 'Calendario' },
          { chiave: 'lista', etichetta: 'Lista', contatore: daFare },
        ]}
      />

      <div className="filtri-toolbar">
        <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
        <FiltroCheckbox attivo={soloMiei} param="mio" etichetta="Solo i miei" />
      </div>

      {vista === 'calendario' ? (
        <CalendarioAgenda
          voci={voci}
          nuovoTask={
            <NuovoTask staff={elencoStaff} emailCorrente={emailCorrente} />
          }
        />
      ) : (
        <div>
          <div className="filtri-toolbar">
            <RicercaContatti
              valoreIniziale={searchParams.q ?? ''}
              placeholder="Cerca per nome, cognome, email o cellulare"
            />
            <FiltroData dal={dal} al={al} />
          </div>
          {ricercaAttiva && (
            <p className="search-note">
              Ricerca su tutta l'agenda, passato incluso —{' '}
              <a href="/dashboard/agenda?vista=lista" className="link">
                annulla ricerca
              </a>
            </p>
          )}
          {giorniLista.map((giorno) => {
            const vociGiorno = vociLista.filter((voce) => (voce.data ?? 'senza-data') === giorno)
            return (
              <div className="giorno-dettaglio agenda-giorno" key={giorno}>
                <h3>
                  {giorno === 'senza-data' ? 'Senza data' : formatDataConGiorno(giorno)}
                  {giorno !== 'senza-data' && giorno < oggi && <span className="agenda-arretrato">arretrato</span>}
                  <span className="count">{vociGiorno.length}</span>
                </h3>
                <TabellaAgenda voci={vociGiorno} />
              </div>
            )
          })}
          {vociLista.length === 0 && <p className="empty-state">Niente in agenda con questi filtri.</p>}
        </div>
      )}
    </div>
  )
}
