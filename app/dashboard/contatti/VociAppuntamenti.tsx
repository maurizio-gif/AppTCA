import type { VoceCalendario } from '@/components/CalendarioAgenda'
import { ContactLinks } from '@/components/ContactLinks'
import { PannelloPipeline } from '@/components/PannelloPipeline'
import { VisiteContatto } from '@/components/VisiteContatto'
import { eAppuntamento, etichettaPersona, voceDaContatto } from '@/lib/agenda'
import { apparteneAGruppo } from '@/lib/contatti'
import { formatDateOra } from '@/lib/format'
import { normalizzaStato } from '@/lib/pipeline'
import type { RigaAccesso } from '@/lib/visite'
import { TaskEntita } from '../agenda/TaskEntita'
import { AzioniAppuntamento } from './AzioniAppuntamento'
import { EliminaContattoButton } from './EliminaContattoButton'
import { GestioneGestito } from './GestioneGestito'
import { RichiestaEvidenza } from './RichiestaEvidenza'

type RigaContatto = Record<string, any>

// Campi gia' mostrati in tabella o in evidenza: nel dettaglio generico
// sarebbero solo rumore. created_at non e' perso, lo ripetiamo per esteso
// come "Richiesta arrivata il..." (vedi ArrivoRichiesta).
export const CAMPI_CONTATTO_NASCOSTI = [
  'id',
  'created_at',
  'nome',
  'cognome',
  'email',
  'cellulare',
  'tipo_richiesta',
  'attivita',
  'stato',
  'gruppo_attivita',
  'motivo',
  'data_richiesta',
  'ora_richiesta',
  'gestito',
  'gestito_da',
  'gestito_il',
  'persona_id',
  'opportunita_id',
  'appuntamento_completato_il',
  'appuntamento_completato_da',
  'appuntamento_esito',
]

// Il punto del calendario e' distinguere quando e' arrivata la richiesta da
// quando e' fissato l'appuntamento: lo rendiamo esplicito invece di
// lasciarlo dedurre.
function ArrivoRichiesta({ riga }: { riga: RigaContatto }) {
  if (!riga.created_at) return null
  return <p className="richiesta-arrivo">Richiesta arrivata il {formatDateOra(riga.created_at)}</p>
}

export type OpzioniGestione = {
  // L'opportunita' della persona: gli stati sono suoi, non della singola
  // richiesta.
  lead: Record<string, any> | null
  emailCorrente: string | null
  eAmministratore: boolean
  puoRiassegnareLead: boolean
  puoCancellare: boolean
  staff: { email: string; nome: string }[]
  // Passaggi di stato dell'opportunita' (vedi lib/opportunita-server.ts).
  storico?: { stato: string; statoPrecedente: string | null; cambiatoDa: string | null; cambiatoIl: string }[]
  // Eventi in agenda collegati a questa richiesta: una stessa enquiry ne puo'
  // avere piu' di uno (una chiamata, poi la visita in sede). Assente = chi
  // costruisce la riga non ha accesso all'agenda.
  task?: Record<string, any>[]
}

// Il pannello di gestione di un'enquiry, in un posto solo: lo usano sia la
// lista dei Messaggi sia il calendario degli Appuntamenti, che sono due viste
// della stessa cosa e non devono divergere.
//
// Tutto cio' su cui si agisce sta in un blocco solo: l'opportunita' della
// persona e, subito sotto i suoi pulsanti, l'agenda - fissare la prossima
// mossa e' la naturale continuazione del prendere in carico, non una sezione
// a parte piu' in basso. Resta fuori la sola cancellazione del record.
//
// Il campo "note su questa richiesta" non c'e' piu' per gli Adulti: cosa si
// e' fatto e cosa resta da fare si scrive come voce d'agenda, che ha una data
// e un responsabile. Le note gia' scritte si leggono fra i dati della
// richiesta.
//
// Junior e' rimasta al modello precedente la pipeline (vedi GestioneGestito):
// gestito si'/no piu' una nota, punto - niente opportunita' da far avanzare.
// L'opportunita' viene comunque creata in background dal trigger sul
// database (come per ogni form_contatti), ma qui non la si mostra ne' la si
// usa: sarebbe la pipeline che si voleva evitare proprio per Junior.
export function bloccoGestioneContatto(
  riga: RigaContatto,
  { lead, emailCorrente, eAmministratore, puoRiassegnareLead, puoCancellare, staff, storico, task }: OpzioniGestione
): { extra: React.ReactNode; extraTitle: string; sections: { title: string; content: React.ReactNode }[] } {
  const nome = `${riga.nome ?? ''} ${riga.cognome ?? ''}`.trim() || riga.email || 'contatto'

  // Un'enquiry puo' avere piu' voci in agenda (una chiamata, poi la visita in
  // sede): sono l'elenco, non un campo. Assente = chi costruisce la riga non
  // ha accesso all'agenda.
  // Chiudere l'appuntamento lo puo' fare chiunque veda la sezione, anche se
  // l'opportunita' e' di una collega: vedi AzioniAppuntamento.
  const bloccoAppuntamento = eAppuntamento(riga) ? (
    <AzioniAppuntamento
      id={String(riga.id)}
      completatoIl={riga.appuntamento_completato_il ?? null}
      completatoDa={riga.appuntamento_completato_da ?? null}
      esito={riga.appuntamento_esito ?? null}
      data={riga.data_richiesta ? String(riga.data_richiesta).slice(0, 10) : null}
      ora={riga.ora_richiesta ? String(riga.ora_richiesta).slice(0, 5) : null}
    />
  ) : null

  const agendaGrezza = task ? (
    <TaskEntita
      collegamento={{
        entita: 'form_contatti',
        entitaId: String(riga.id),
        etichetta: `Enquiry · ${nome}`,
      }}
      titoloSuggerito={`Ricontattare ${nome}`}
      task={task}
      staff={staff}
      emailCorrente={emailCorrente}
      eAmministratore={eAmministratore}
      azioneInCima
    />
  ) : null

  // Per gli Adulti l'agenda sta dentro il pannello dell'opportunita' (col suo
  // titolo, vedi dopoAzioni piu' sotto); Junior non ha un pannello che la
  // ospiti, quindi diventa una sezione a se' - il titolo lo mette
  // ExpandableRow, qui basta il contenuto.
  const bloccoAgenda = agendaGrezza ? (
    <div className="pipeline-agenda">
      <h4 className="pipeline-agenda-titolo">In agenda</h4>
      {agendaGrezza}
    </div>
  ) : null

  if (apparteneAGruppo(riga.gruppo_attivita, 'junior')) {
    return {
      extraTitle: 'Gestione',
      extra: (
        <>
          {bloccoAppuntamento}
          <GestioneGestito
            id={String(riga.id)}
            gestito={!!riga.gestito}
            gestitoDa={riga.gestito_da ?? null}
            gestitoIl={riga.gestito_il ?? null}
            noteIniziali={riga.note ?? null}
            puoCancellare={puoCancellare}
          />
        </>
      ),
      sections: agendaGrezza ? [{ title: 'In agenda', content: agendaGrezza }] : [],
    }
  }

  return {
    extraTitle: 'Opportunità',
    extra: lead ? (
      <PannelloPipeline
        id={lead.id}
        stato={normalizzaStato(lead.stato)}
        assegnatoA={lead.assegnato_a ?? null}
        assegnatoIl={lead.assegnato_il ?? null}
        statoIl={lead.stato_il ?? null}
        motivoPerso={lead.motivo_perso ?? null}
        emailCorrente={emailCorrente}
        puoRiassegnareLead={puoRiassegnareLead}
        staff={staff}
        storico={storico}
        dopoAzioni={
          <>
            {bloccoAppuntamento}
            {bloccoAgenda}
          </>
        }
      />
    ) : (
      // Senza email non c'e' una persona in anagrafica, quindi non c'e'
      // un'opportunita': l'agenda serve comunque, la richiesta esiste e
      // qualcuno la deve richiamare.
      <div className="gestione-box">
        <p className="gestione-meta">
          Questa richiesta non è collegata a una persona in anagrafica (manca l'email), quindi non ha un'opportunità
          da gestire.
        </p>
        {bloccoAppuntamento}
        {bloccoAgenda}
      </div>
    ),
    sections: puoCancellare
      ? [{ title: 'Questa richiesta', content: <EliminaContattoButton id={riga.id} /> }]
      : [],
  }
}

// Da riga di form_contatti a voce del calendario condiviso: l'appuntamento
// prenotato dal cliente sul sito, con lo stesso pannello di gestione che ha
// nella lista delle Enquiries.
export function voceCalendarioDaContatto(
  riga: RigaContatto,
  {
    nomiStaff,
    accessi = [],
    gestione,
  }: {
    nomiStaff: Record<string, string>
    accessi?: RigaAccesso[]
    gestione: OpzioniGestione
  }
): VoceCalendario {
  const { extra, extraTitle, sections } = bloccoGestioneContatto(riga, gestione)

  return {
    ...voceDaContatto(riga, gestione.lead),
    assegnatoEtichetta: etichettaPersona(gestione.lead?.assegnato_a, nomiStaff),
    sottotitolo: <ContactLinks email={riga.email} phone={riga.cellulare} />,
    record: riga,
    // Junior mostra la nota nel proprio box di gestione (vedi
    // GestioneGestito): nel dump generico sarebbe ripetuta.
    hiddenKeys: apparteneAGruppo(riga.gruppo_attivita, 'junior')
      ? [...CAMPI_CONTATTO_NASCOSTI, 'note']
      : CAMPI_CONTATTO_NASCOSTI,
    evidenza: (
      <>
        <RichiestaEvidenza riga={riga} />
        <ArrivoRichiesta riga={riga} />
      </>
    ),
    consultazione: <VisiteContatto accessi={accessi} />,
    extra,
    extraTitle,
    sections,
  }
}
