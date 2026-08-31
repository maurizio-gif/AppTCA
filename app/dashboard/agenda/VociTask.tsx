import Link from 'next/link'
import type { VoceCalendario } from '@/components/CalendarioAgenda'
import { eStatoTaskValido, etichettaPersona, testoRicerca, voceDaTask, type RigaTask, type StatoTask } from '@/lib/agenda'
import { AzioniTask } from './AzioniTask'

// Campi gia' visibili in tabella o nel pannello del task: nel dettaglio
// generico della riga sarebbero solo rumore.
export const CAMPI_TASK_NASCOSTI = [
  'id',
  'titolo',
  'tipo',
  'data',
  'ora',
  'assegnato_a',
  'stato',
  'completato_il',
  'esito',
  'note',
  'entita',
  'entita_id',
]

// Dove porta il record collegato a un task, per entita'. Una entita' non
// elencata qui mostra l'etichetta senza link, non un link rotto.
const PAGINA_ENTITA: Record<string, string> = {
  form_invita_amico: '/dashboard/invita-amico?filtro=tutti',
  form_contatti: '/dashboard/contatti/adulti',
}

// Da riga della tabella task a voce del calendario condiviso, pannello di
// gestione incluso. Sta qui e non nella pagina perche' la stessa voce serve
// sia all'Agenda sia al tab Appuntamenti delle Enquiries Adulti: sono lo
// stesso calendario (vedi lib/agenda.ts).
export function voceCalendarioDaTask(
  riga: RigaTask,
  {
    nomiStaff,
    emailCorrente,
    eAmministratore,
    staff = [],
    etichetteCollegamento = {},
    nomiPersone = {},
    ricercaPersone = {},
  }: {
    nomiStaff: Record<string, string>
    emailCorrente: string | null
    eAmministratore: boolean
    // Elenco degli operatori, per la tendina "assegnato a" del form di
    // modifica (vedi ModificaTask).
    staff?: { email: string; nome: string }[]
    // Chiave "entita:id" -> nome leggibile del record collegato, cosi' in
    // agenda non compare "form_invita_amico:9f2c…".
    etichetteCollegamento?: Record<string, string>
    // id persona -> nome: in agenda conta con CHI e' l'appuntamento, prima
    // ancora di sapere da quale modulo e' arrivato.
    nomiPersone?: Record<string, string>
    // id persona -> testoRicerca gia' calcolato (nome, cognome, email,
    // cellulare): un task non ha questi campi propri, li eredita dalla
    // persona collegata, se c'e' una.
    ricercaPersone?: Record<string, string>
  }
): VoceCalendario {
  const voce = voceDaTask(riga)
  const ricercaPersona = riga.persona_id ? ricercaPersone[riga.persona_id] : null
  const stato: StatoTask = eStatoTaskValido(riga.stato) ? riga.stato : 'aperto'
  const assegnatoEtichetta = etichettaPersona(riga.assegnato_a, nomiStaff)

  const chiaveCollegamento = riga.entita && riga.entita_id ? `${riga.entita}:${riga.entita_id}` : null
  const etichettaCollegamento = chiaveCollegamento ? etichetteCollegamento[chiaveCollegamento] : null
  const paginaCollegamento = riga.entita ? PAGINA_ENTITA[riga.entita] : null

  const suo = !!emailCorrente && riga.assegnato_a?.toLowerCase() === emailCorrente
  const creatoDaMe = !!emailCorrente && riga.creato_da?.toLowerCase() === emailCorrente

  const nomePersona = riga.persona_id ? nomiPersone[riga.persona_id] : null

  return {
    ...voce,
    ricerca: ricercaPersona ? `${voce.ricerca} ${ricercaPersona}`.trim() : voce.ricerca,
    assegnatoEtichetta,
    // Con chi e' l'appuntamento viene prima di tutto: se la persona la
    // conosciamo, si mostra lei (cliccabile), altrimenti la richiesta
    // collegata, altrimenti la nota.
    sottotitolo: nomePersona ? (
      <Link href={`/dashboard/persone/${riga.persona_id}`} className="link">
        {nomePersona}
      </Link>
    ) : etichettaCollegamento ? (
      paginaCollegamento ? (
        <Link href={paginaCollegamento} className="link">
          {etichettaCollegamento}
        </Link>
      ) : (
        etichettaCollegamento
      )
    ) : (
      riga.note || null
    ),
    record: riga,
    hiddenKeys: CAMPI_TASK_NASCOSTI,
    extraTitle: 'Task',
    extra: (
      <AzioniTask
        id={String(riga.id)}
        stato={stato}
        assegnatoEtichetta={assegnatoEtichetta}
        completatoIl={riga.completato_il ?? null}
        esito={riga.esito ?? null}
        note={riga.note ?? null}
        puoEliminare={eAmministratore || suo || creatoDaMe}
        titolo={voce.titolo}
        tipo={voce.tipo}
        data={voce.data ?? ''}
        ora={voce.ora}
        durataMinuti={voce.durataMinuti}
        assegnatoA={riga.assegnato_a ?? null}
        staff={staff}
        emailCorrente={emailCorrente}
      />
    ),
  }
}
