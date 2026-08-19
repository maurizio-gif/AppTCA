import type { VoceCalendario } from '@/components/CalendarioAgenda'
import { ContactLinks } from '@/components/ContactLinks'
import { VisiteContatto } from '@/components/VisiteContatto'
import { etichettaPersona, voceDaContatto } from '@/lib/agenda'
import { formatDateOra } from '@/lib/format'
import type { RigaAccesso } from '@/lib/visite'
import { TaskEntita } from '../agenda/TaskEntita'
import { GestioneSezione } from './GestioneSezione'
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
  'note',
]

// Il punto del calendario e' distinguere quando e' arrivata la richiesta da
// quando e' fissato l'appuntamento: lo rendiamo esplicito invece di
// lasciarlo dedurre.
function ArrivoRichiesta({ riga }: { riga: RigaContatto }) {
  if (!riga.created_at) return null
  return <p className="richiesta-arrivo">Richiesta arrivata il {formatDateOra(riga.created_at)}</p>
}

// Da riga di form_contatti a voce del calendario condiviso: l'appuntamento
// prenotato dal cliente sul sito, con lo stesso pannello di gestione
// (nota/Gestito/cancellazione) che ha nella lista delle Enquiries.
export function voceCalendarioDaContatto(
  riga: RigaContatto,
  {
    nomiStaff,
    puoCancellare,
    accessi = [],
    agenda,
  }: {
    nomiStaff: Record<string, string>
    puoCancellare: boolean
    accessi?: RigaAccesso[]
    // Eventi in agenda collegati a questa richiesta: la stessa enquiry puo'
    // averne piu' di uno (una chiamata, poi la visita in sede), quindi qui va
    // l'elenco e non un singolo appuntamento. Assente = chi costruisce la voce
    // non ha (o non puo' vedere) l'agenda.
    agenda?: {
      task: Record<string, any>[]
      staff: { email: string; nome: string }[]
      emailCorrente: string | null
      eAmministratore: boolean
    }
  }
): VoceCalendario {
  const nome = `${riga.nome ?? ''} ${riga.cognome ?? ''}`.trim() || riga.email || 'contatto'

  return {
    ...voceDaContatto(riga),
    assegnatoEtichetta: riga.gestito ? etichettaPersona(riga.gestito_da, nomiStaff) : null,
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
    sections: agenda
      ? [
          {
            title: 'In agenda',
            content: (
              <TaskEntita
                collegamento={{
                  entita: 'form_contatti',
                  entitaId: String(riga.id),
                  etichetta: `Enquiry · ${nome}`,
                }}
                titoloSuggerito={`Ricontattare ${nome}`}
                task={agenda.task}
                staff={agenda.staff}
                emailCorrente={agenda.emailCorrente}
                eAmministratore={agenda.eAmministratore}
              />
            ),
          },
        ]
      : undefined,
    extra: (
      <GestioneSezione
        id={riga.id}
        gestito={!!riga.gestito}
        gestitoDa={riga.gestito_da ?? null}
        gestitoIl={riga.gestito_il ?? null}
        noteIniziali={riga.note ?? null}
        puoCancellare={puoCancellare}
      />
    ),
  }
}
