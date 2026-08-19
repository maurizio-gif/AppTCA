import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare } from '@/lib/auth/permessi'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import { VisiteContatto } from '@/components/VisiteContatto'
import { normalizzaStato, OPZIONI_FILTRO, parseFiltro, statiDelFiltro } from '@/lib/pipeline'
import { PipelineBadge } from '@/components/PipelineBadge'
import { TaskEntita } from '../agenda/TaskEntita'
import { PipelineInvito } from './PipelineInvito'
import { FiltroCheckbox } from '@/components/FiltroCheckbox'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Socio (chi invita)', 'Amico invitato', 'Stato', 'Assegnato a']

// Campi gia' visibili in tabella o nel pannello di gestione: nel dettaglio
// generico della riga sarebbero solo rumore.
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
  'note',
  // Derivate dallo stato, tenute in pari solo per compatibilita' (vedi
  // campiCompatibilita in actions.ts): mostrarle confonderebbe.
  'gestito',
  'gestito_da',
  'gestito_il',
]

type RigaInvito = Record<string, any>

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

  // Nome e cognome al posto dell'email dove c'e' spazio per leggerlo: chi
  // guarda la pipeline ragiona per persone, non per indirizzi.
  const elencoStaff = (staff ?? []).map((persona) => ({
    email: persona.email,
    nome: `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() || persona.email,
  }))
  const nomiStaff: Record<string, string> = Object.fromEntries(
    elencoStaff.map((persona) => [persona.email.toLowerCase(), persona.nome])
  )
  const etichettaOperatore = (email: string | null) =>
    email ? nomiStaff[email.toLowerCase()] ?? email : null

  // Task raggruppati per invito, per il blocco "In agenda" di ogni riga.
  const taskPerInvito = new Map<string, Record<string, any>[]>()
  for (const riga of task ?? []) {
    const chiave = String(riga.entita_id)
    if (!taskPerInvito.has(chiave)) taskPerInvito.set(chiave, [])
    taskPerInvito.get(chiave)!.push(riga)
  }

  // Visite al sito di ciascun socio (per vid), per capire quanto e' "caldo"
  // l'invito - vedi VisiteContatto.
  const vids = [...new Set((righe ?? []).map((riga) => riga.vid).filter((v): v is string => !!v))]
  const { data: accessi } = vids.length > 0 ? await supabase.from('accessi').select('*').in('vid', vids) : { data: [] }
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

  const filtro = parseFiltro(searchParams.filtro)
  const soloMiei = searchParams.mio === '1'
  const stati = statiDelFiltro(filtro)

  const righeFiltrate = (righe ?? []).filter((riga: RigaInvito) => {
    if (stati && !stati.includes(normalizzaStato(riga.stato))) return false
    if (soloMiei) {
      // "I miei" include anche i nuovi non ancora assegnati: sono il lavoro
      // che chiunque puo' prendere, nasconderli renderebbe il filtro una
      // trappola.
      const assegnato = (riga.assegnato_a ?? '').toLowerCase()
      if (assegnato ? assegnato !== emailCorrente : normalizzaStato(riga.stato) !== 'nuovo') return false
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
            Ogni riga è un invito compilato dal sito: «Socio» è chi invita (un contatto già esistente, solo
            l'email), «Amico invitato» è la persona nuova segnalata, con tutti i suoi contatti.
          </li>
          <li>
            Ogni invito arriva come <strong>Nuovo</strong>. Apri la riga e premi «Prendi in gestione»: da quel
            momento l'invito è assegnato a te e solo tu (o un amministratore) puoi farlo avanzare.
          </li>
          <li>
            Da «In gestione» si esce in due modi: <strong>Vinto</strong> oppure <strong>Perso</strong> (con il
            motivo). Un invito vinto si chiude davvero solo con <strong>Credito caricato</strong>.
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
          «Perso» e «Credito caricato» sono stati finali: per riaprirli serve un amministratore, che può anche
          riassegnare un invito a un'altra persona.
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
                const stato = normalizzaStato(riga.stato)
                const nomeAmico =
                  `${riga.amico_nome ?? ''} ${riga.amico_cognome ?? ''}`.trim() || riga.amico_email || 'invito'
                return (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={COLONNE_TABELLA.length + 1}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
                    evidenza={<VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />}
                    sections={
                      vedeAgenda
                        ? [
                            {
                              title: 'In agenda',
                              content: (
                                <TaskEntita
                                  entita="form_invita_amico"
                                  entitaId={String(riga.id)}
                                  etichetta={`Invita un amico · ${nomeAmico}`}
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
                    }
                    extra={
                      <PipelineInvito
                        id={riga.id}
                        stato={stato}
                        assegnatoA={riga.assegnato_a ?? null}
                        assegnatoIl={riga.assegnato_il ?? null}
                        statoIl={riga.stato_il ?? null}
                        motivoPerso={riga.motivo_perso ?? null}
                        noteIniziali={riga.note ?? null}
                        emailCorrente={emailCorrente}
                        eAmministratore={eAmministratore}
                        staff={elencoStaff}
                      />
                    }
                    cells={[
                      formatDateOra(riga.created_at),
                      <>
                        <span className="richiesta-badge richiesta-blu invito-ruolo">Socio</span>
                        <br />
                        {riga.email_socio}
                      </>,
                      <>
                        <span className="richiesta-badge richiesta-verde invito-ruolo">Amico</span>
                        <br />
                        {riga.amico_nome} {riga.amico_cognome}
                        <br />
                        <span className="muted">
                          {riga.amico_email} · {riga.amico_prefisso} {riga.amico_cellulare}
                        </span>
                      </>,
                      <PipelineBadge stato={stato} />,
                      etichettaOperatore(riga.assegnato_a ?? null) ?? '—',
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
