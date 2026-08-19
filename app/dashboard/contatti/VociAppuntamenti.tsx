import type { VoceCalendario } from '@/components/CalendarioAgenda'
import { ContactLinks } from '@/components/ContactLinks'
import { PannelloPipeline } from '@/components/PannelloPipeline'
import { VisiteContatto } from '@/components/VisiteContatto'
import { eAppuntamento, etichettaPersona, voceDaContatto } from '@/lib/agenda'
import { formatDateOra } from '@/lib/format'
import { normalizzaStato } from '@/lib/pipeline'
import type { RigaAccesso } from '@/lib/visite'
import { TaskEntita } from '../agenda/TaskEntita'
import { AzioniAppuntamento } from './AzioniAppuntamento'
import { EliminaContattoButton } from './EliminaContattoButton'
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
// Il campo "note su questa richiesta" non c'e' piu': cosa si e' fatto e cosa
// resta da fare si scrive come voce d'agenda, che ha una data e un
// responsabile. Le note gia' scritte si leggono fra i dati della richiesta.
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
    />
  ) : null

  const bloccoAgenda = task ? (
    <div className="pipeline-agenda">
      <h4 className="pipeline-agenda-titolo">In agenda</h4>
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
    </div>
  ) : null

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
        eAmministratore={eAmministratore}
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
    hiddenKeys: CAMPI_CONTATTO_NASCOSTI,
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
