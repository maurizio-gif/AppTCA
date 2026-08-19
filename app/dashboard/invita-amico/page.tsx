import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { ChipPersona } from '@/components/ChipPersona'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'
import { FiltroSelect } from '@/components/FiltroSelect'
import { PannelloPipeline } from '@/components/PannelloPipeline'
import { PipelineBadge } from '@/components/PipelineBadge'
import { VisiteContatto } from '@/components/VisiteContatto'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare } from '@/lib/auth/permessi'
import { nomePersona, totaleRichieste } from '@/lib/persone'
import { conteggiRichieste } from '@/lib/persone-server'
import { normalizzaStato, type StatoPipeline } from '@/lib/pipeline'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import { TaskEntita } from '../agenda/TaskEntita'
import { CreditoToggle } from './CreditoToggle'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Socio (chi invita)', 'Amico invitato', 'Stato', 'Assegnato a']

// Campi gia' visibili in tabella, nel chip persona o nel pannello di
// gestione: nel dettaglio generico della riga sarebbero solo rumore. Le
// colonne di stato sulla richiesta sono lo specchio dell'opportunita' (vedi
// il trigger specchia_stato_opportunita), non una seconda verita'.
const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'email_socio',
  'amico_nome',
  'amico_cognome',
  'amico_email',
  'amico_prefisso',
  'amico_cellulare',
  'stato',
  'stato_da',
  'stato_il',
  'assegnato_a',
  'assegnato_il',
  'motivo_perso',
  'chiuso_il',
  'gestito',
  'gestito_da',
  'gestito_il',
  'credito_caricato',
  'credito_caricato_da',
  'credito_caricato_il',
  'persona_id',
  'persona_socio_id',
  'opportunita_id',
]

type RigaInvito = Record<string, any>

// I filtri sono di questa sezione e non della pipeline generale, perche' solo
// qui esiste il credito da riconoscere al socio: "Credito da caricare" e'
// un referral vinto col toggle ancora spento, e finche' e' li' non e' finito.
const FILTRI = ['nuovi', 'in_gestione', 'da_caricare', 'chiusi', 'tutti'] as const
type Filtro = (typeof FILTRI)[number]

const OPZIONI_FILTRO = [
  { valore: 'nuovi', etichetta: 'Nuovi' },
  { valore: 'in_gestione', etichetta: 'In gestione' },
  { valore: 'da_caricare', etichetta: 'Credito da caricare' },
  { valore: 'chiusi', etichetta: 'Chiusi (credito caricato e persi)' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

// Assente o non valido = "nuovi": e' quello che si vede aprendo la pagina dal
// menu, cioe' il lavoro non ancora preso in carico da nessuno.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI as readonly string[]).includes(raw)) return raw as Filtro
  return 'nuovi'
}

// Un referral vinto col credito ancora da caricare non e' finito: resta in
// evidenza nell'elenco e nel filtro "Credito da caricare".
function creditoDaCaricare(stato: StatoPipeline, riga: RigaInvito): boolean {
  return stato === 'vinto' && !riga.credito_caricato
}

function nelFiltro(filtro: Filtro, stato: StatoPipeline, riga: RigaInvito): boolean {
  switch (filtro) {
    case 'nuovi':
      return stato === 'nuovo'
    case 'in_gestione':
      return stato === 'in_gestione'
    case 'da_caricare':
      return creditoDaCaricare(stato, riga)
    case 'chiusi':
      return stato === 'perso' || (stato === 'vinto' && !!riga.credito_caricato)
    default:
      return true
  }
}

export default async function InvitaAmicoPage({
  searchParams,
}: {
  searchParams: { filtro?: string; mio?: string }
}) {
  if (!(await utenteHaSezione('invita-amico'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // Il blocco "In agenda" dentro la riga (vedi TaskEntita) e' parte della
  // sezione Agenda: chi non ha quel permesso vede la pipeline e basta.
  const vedeAgenda = await utenteHaSezione('agenda')

  const [{ data: righe, error }, { data: staff }, { data: task }, eAmministratore] = await Promise.all([
    supabase.from('form_invita_amico').select('*').order('created_at', { ascending: false }),
    supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
    vedeAgenda
      ? supabase.from('task').select('*').eq('entita', 'form_invita_amico').order('data', { ascending: true })
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    puoAmministrare(emailCorrente),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const inviti = righe ?? []

  // Lo stato del lead vive sull'opportunita' (che e' della persona, non della
  // singola richiesta): letta a parte e agganciata per id, senza dipendere dai
  // nomi dei vincoli di chiave esterna.
  const opportunitaIds = [...new Set(inviti.map((r) => r.opportunita_id).filter(Boolean))] as string[]
  const personaIds = [...new Set(inviti.flatMap((r) => [r.persona_id, r.persona_socio_id]).filter(Boolean))] as string[]

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
  const richiesteDi = (personaId: string) =>
    totaleRichieste(conteggi[personaId] ?? { enquiries: 0, inviti: 0, scuolaTennis: 0, summerCamp: 0, eventi: 0 })

  // Nome e cognome al posto dell'email dove c'e' spazio per leggerlo: chi
  // guarda la pipeline ragiona per persone, non per indirizzi.
  const elencoStaff = (staff ?? []).map((persona) => ({
    email: persona.email,
    nome: `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() || persona.email,
  }))
  const nomiStaff: Record<string, string> = Object.fromEntries(
    elencoStaff.map((persona) => [persona.email.toLowerCase(), persona.nome])
  )
  const etichettaOperatore = (email: string | null) => (email ? nomiStaff[email.toLowerCase()] ?? email : null)

  // Task raggruppati per invito, per il blocco "In agenda" di ogni riga.
  const taskPerInvito = new Map<string, Record<string, any>[]>()
  for (const riga of task ?? []) {
    const chiave = String(riga.entita_id)
    if (!taskPerInvito.has(chiave)) taskPerInvito.set(chiave, [])
    taskPerInvito.get(chiave)!.push(riga)
  }

  // Visite al sito di ciascun socio (per vid), per capire quanto e' "caldo"
  // l'invito - vedi VisiteContatto.
  const vids = [...new Set(inviti.map((riga) => riga.vid).filter((v): v is string => !!v))]
  const { data: accessi } = vids.length > 0 ? await supabase.from('accessi').select('*').in('vid', vids) : { data: [] }
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

  const filtro = parseFiltro(searchParams.filtro)
  const soloMiei = searchParams.mio === '1'

  // Lo stato di riferimento e' quello dell'opportunita'; la colonna sulla
  // richiesta e' il suo specchio e serve solo se l'opportunita' mancasse.
  const statoDi = (riga: RigaInvito) =>
    normalizzaStato(opportunitaPerId.get(riga.opportunita_id)?.stato ?? riga.stato)
  const assegnatoDi = (riga: RigaInvito): string | null =>
    opportunitaPerId.get(riga.opportunita_id)?.assegnato_a ?? riga.assegnato_a ?? null

  const righeFiltrate = inviti.filter((riga: RigaInvito) => {
    if (!nelFiltro(filtro, statoDi(riga), riga)) return false
    if (soloMiei) {
      // "I miei" include anche i nuovi non ancora assegnati: sono il lavoro
      // che chiunque puo' prendere, nasconderli renderebbe il filtro una
      // trappola.
      const assegnato = (assegnatoDi(riga) ?? '').toLowerCase()
      if (assegnato ? assegnato !== emailCorrente : statoDi(riga) !== 'nuovo') return false
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <h1>Inviti "Invita un amico"</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Ogni riga è un invito compilato dal sito: «Socio» è chi invita, «Amico invitato» è la persona nuova
            segnalata. Il nome cliccabile apre la <strong>scheda persona</strong>, con tutte le sue richieste.
          </li>
          <li>
            Ogni lead arriva come <strong>Nuovo</strong>. Apri la riga e premi «Prendi in gestione»: da quel
            momento è assegnato a te e solo tu (o un amministratore) puoi farlo avanzare.
          </li>
          <li>
            Da «In gestione» si esce in due modi: <strong>Vinto</strong> oppure <strong>Perso</strong> (con il
            motivo).
          </li>
          <li>
            Su un referral <strong>vinto</strong> resta il credito da riconoscere al socio: la riga resta{' '}
            <strong>in evidenza</strong> finché non alzi il toggle «Credito caricato». È l'unico modo per farla
            sparire dall'elenco, così un credito non si perde per strada.
          </li>
          <li>
            Per segnare vinto o perso serve una nota salvata: è il modo per lasciare traccia di cosa è stato
            fatto. Prendere in gestione invece è un solo click.
          </li>
          <li>
            Nel blocco <strong>«In agenda»</strong> della riga crei un task o un appuntamento già collegato a
            questo invito: compare nell'Agenda condivisa e resta agganciato qui.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Lo stato è del <strong>lead della persona</strong>, non della singola richiesta: se la stessa persona ha
          già un'opportunità aperta (per esempio da un'enquiry), l'invito si aggancia a quella invece di creare un
          secondo lead da lavorare due volte. «Perso» e «Credito caricato» sono finali: per riaprirli serve un
          amministratore, che può anche riassegnare.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
        <FiltroCheckbox attivo={soloMiei} param="mio" etichetta="Solo i miei" />
      </div>

      <div className="data-table-wrap">
        <table className="data-table data-table-invito">
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
                const daCaricare = creditoDaCaricare(stato, riga)
                const lead = opportunitaPerId.get(riga.opportunita_id)
                const amico = personePerId.get(riga.persona_id)
                const socio = personePerId.get(riga.persona_socio_id)
                const nomeAmico = amico ? nomePersona(amico) : `${riga.amico_nome ?? ''} ${riga.amico_cognome ?? ''}`.trim() || riga.amico_email || 'invito'

                return (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={COLONNE_TABELLA.length + 1}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
                    evidenziata={daCaricare}
                    evidenza={<VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />}
                    sections={
                      [
                        // Il credito riguarda solo i referral vinti: prima di
                        // allora non c'e' nulla da caricare, quindi il toggle
                        // non compare affatto.
                        ...(stato === 'vinto'
                          ? [
                              {
                                title: 'Credito referral',
                                content: (
                                  <CreditoToggle
                                    id={riga.id}
                                    caricato={!!riga.credito_caricato}
                                    caricatoDa={riga.credito_caricato_da ?? null}
                                    caricatoIl={riga.credito_caricato_il ?? null}
                                  />
                                ),
                              },
                            ]
                          : []),
                      ].concat(
                      vedeAgenda
                        ? [
                            {
                              title: 'In agenda',
                              content: (
                                <TaskEntita
                                  collegamento={{
                                    entita: 'form_invita_amico',
                                    entitaId: String(riga.id),
                                    etichetta: `Invita un amico · ${nomeAmico}`,
                                  }}
                                  titoloSuggerito={`Ricontattare ${nomeAmico}`}
                                  task={taskPerInvito.get(String(riga.id)) ?? []}
                                  staff={elencoStaff}
                                  emailCorrente={emailCorrente}
                                  eAmministratore={eAmministratore}
                                />
                              ),
                            },
                          ]
                        : []
                      )
                    }
                    extra={
                      lead ? (
                        <PannelloPipeline
                          id={lead.id}
                          stato={stato}
                          assegnatoA={lead.assegnato_a ?? null}
                          assegnatoIl={lead.assegnato_il ?? null}
                          statoIl={lead.stato_il ?? null}
                          motivoPerso={lead.motivo_perso ?? null}
                          noteIniziali={lead.note ?? null}
                          emailCorrente={emailCorrente}
                          eAmministratore={eAmministratore}
                          staff={elencoStaff}
                        />
                      ) : (
                        <p className="gestione-meta">
                          Questo invito non ha una persona in anagrafica (manca l'email dell'amico), quindi non ha
                          un lead da gestire.
                        </p>
                      )
                    }
                    cells={[
                      formatDateOra(riga.created_at),
                      <>
                        <span className="richiesta-badge richiesta-blu invito-ruolo">Socio</span>
                        <br />
                        {socio ? (
                          <ChipPersona
                            id={socio.id}
                            nome={nomePersona(socio)}
                            richieste={richiesteDi(socio.id)}
                            storico={!!socio.storico}
                          />
                        ) : (
                          riga.email_socio
                        )}
                      </>,
                      <>
                        <span className="richiesta-badge richiesta-verde invito-ruolo">Amico</span>
                        <br />
                        {amico ? (
                          <ChipPersona
                            id={amico.id}
                            nome={nomeAmico}
                            richieste={richiesteDi(amico.id)}
                            storico={!!amico.storico}
                          />
                        ) : (
                          nomeAmico
                        )}
                        <br />
                        <span className="muted">
                          {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
                        </span>
                      </>,
                      <>
                        <PipelineBadge stato={stato} />
                        {daCaricare && (
                          <>
                            <br />
                            <span className="richiesta-badge richiesta-ambra">Credito da caricare</span>
                          </>
                        )}
                      </>,
                      etichettaOperatore(assegnatoDi(riga)) ?? '—',
                    ]}
                  />
                )
              })}
            </tbody>
          </AccordionGroup>
        </table>
        {righeFiltrate.length === 0 && (
          <p className="empty-state">
            {filtro === 'tutti' && !soloMiei ? 'Nessun invito trovato.' : 'Nessun invito in questo filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}
