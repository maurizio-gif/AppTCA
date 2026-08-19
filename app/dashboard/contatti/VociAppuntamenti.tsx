import type { VoceCalendario } from '@/components/CalendarioAgenda'
import { ContactLinks } from '@/components/ContactLinks'
import { VisiteContatto } from '@/components/VisiteContatto'
import { etichettaPersona, voceDaContatto } from '@/lib/agenda'
import { formatDateOra } from '@/lib/format'
import type { RigaAccesso } from '@/lib/visite'
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
  }: {
    nomiStaff: Record<string, string>
    puoCancellare: boolean
    accessi?: RigaAccesso[]
  }
): VoceCalendario {
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
        <VisiteContatto accessi={accessi} />
      </>
    ),
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
