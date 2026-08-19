import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'
import { FiltroSelect } from '@/components/FiltroSelect'
import { VistaTabs } from '@/components/VistaTabs'
import { CalendarioAgenda, TabellaAgenda, type VoceCalendario } from '@/components/CalendarioAgenda'
import { formatDataConGiorno } from '@/lib/format'
import { getSezioniConsentite, utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare, puoRiassegnare } from '@/lib/auth/permessi'
import { storicoOpportunita } from '@/lib/opportunita-server'
import { chiaveGiornoDa, confrontaVoci, eAppuntamento } from '@/lib/agenda'
import { apparteneAGruppo } from '@/lib/contatti'
import { nomePersona } from '@/lib/persone'
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
  searchParams: { filtro?: string; mio?: string; vista?: string }
}) {
  if (!(await utenteHaSezione('agenda'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  const sezioni = await getSezioniConsentite(emailCorrente)
  // Gli appuntamenti dal sito si vedono in agenda solo se si vedono anche
  // nella loro sezione: l'agenda non e' una scorciatoia per aggirare i
  // permessi delle Enquiries.
  const vedeAdulti = sezioni.includes('contatti-adulti')
  const vedeJunior = sezioni.includes('contatti-junior')
  const vedeContatti = vedeAdulti || vedeJunior

  const [
    { data: task, error },
    { data: contatti },
    { data: staff },
    { data: inviti },
    { data: viewer },
    eAmministratore,
    puoRiassegnareLead,
  ] = await Promise.all([
      supabase.from('task').select('*'),
      vedeContatti
        ? supabase.from('form_contatti').select('*')
        : Promise.resolve({ data: [] as Record<string, any>[] }),
      supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
      supabase.from('form_invita_amico').select('id, amico_nome, amico_cognome, amico_email'),
      supabase.from('staff_users').select('puo_cancellare').eq('email', emailCorrente ?? '').maybeSingle(),
      puoAmministrare(emailCorrente),
      puoRiassegnare(emailCorrente),
    ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const puoCancellare = !!viewer?.puo_cancellare

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
  const { data: persone } = personaIds.length
    ? await supabase.from('persone').select('id, nome, cognome, email').in('id', personaIds)
    : { data: [] as Record<string, any>[] }
  const nomiPersone: Record<string, string> = Object.fromEntries(
    (persone ?? []).map((persona) => [persona.id, nomePersona(persona)])
  )

  const vociTask: VoceCalendario[] = (task ?? []).map((riga) =>
    voceCalendarioDaTask(riga, { nomiStaff, emailCorrente, eAmministratore, etichetteCollegamento, nomiPersone })
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

  // Le opportunita' delle enquiries mostrate: il pannello gestisce quelle.
  const opportunitaIds = [...new Set((contatti ?? []).map((r) => r.opportunita_id).filter(Boolean))] as string[]
  const { data: opportunita } = opportunitaIds.length
    ? await supabase.from('opportunita').select('*').in('id', opportunitaIds)
    : { data: [] as Record<string, any>[] }
  const opportunitaPerId = new Map((opportunita ?? []).map((o) => [o.id, o]))
  const storicoPerOpportunita = await storicoOpportunita(opportunitaIds)

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
          storico: storicoPerOpportunita[riga.opportunita_id] ?? [],
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
    if (filtro === 'task' && voce.tipo !== 'task') return false
    if (filtro === 'appuntamenti' && voce.tipo === 'task') return false
    if (soloMiei) {
      // "I miei" tiene dentro anche gli appuntamenti dal sito ancora da
      // gestire: non hanno un titolare, ma sono lavoro di tutti.
      const assegnato = voce.assegnatoA?.toLowerCase() ?? null
      if (assegnato ? assegnato !== emailCorrente : !voce.daFare) return false
    }
    return true
  })

  const oggi = chiaveGiornoDa(new Date())
  // Vista lista: gli arretrati ancora aperti e tutto quello che viene da
  // oggi in avanti. Cio' che e' passato ed e' stato gestito qui non serve
  // piu', resta nel calendario.
  const vociLista = voci
    .filter((voce) => !voce.data || voce.data >= oggi || voce.daFare)
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
            telefonici) e gli <strong>appuntamenti e task</strong> che vi fissate voi.
          </li>
          <li>
            Clicca un giorno per vedere cosa c'è, poi «+ Aggiungi in agenda» per metterci qualcosa di nuovo: il
            giorno selezionato è già proposto.
          </li>
          <li>
            Un task può essere assegnato a una collega: l'agenda è condivisa in lettura, ma completarlo o
            cancellarlo può farlo chi ce l'ha in mano, chi l'ha creato o un amministratore.
          </li>
          <li>
            Gli appuntamenti arrivati dal sito si gestiscono anche da qui, esattamente come nelle Enquiries: nota,
            «Gestito», cancellazione se hai il permesso.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Vedi in agenda solo gli appuntamenti delle sezioni Enquiries a cui hai accesso. Pallino rosso su un
          giorno = lì c'è ancora qualcosa da fare.
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
