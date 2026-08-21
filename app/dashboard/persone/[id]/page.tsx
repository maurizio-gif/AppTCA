import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { GrigliaDettagli } from '@/components/ExpandableRow'
import { PannelloPipeline } from '@/components/PannelloPipeline'
import { PipelineBadge } from '@/components/PipelineBadge'
import { VisiteContatto } from '@/components/VisiteContatto'
import { ContactLinks } from '@/components/ContactLinks'
import { apparteneAGruppo } from '@/lib/contatti'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare, puoRiassegnare } from '@/lib/auth/permessi'
import { storicoOpportunita } from '@/lib/opportunita-server'
import { etichettaFonte, nomePersona } from '@/lib/persone'
import { ETICHETTE_STATO, normalizzaStato } from '@/lib/pipeline'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import { TaskEntita } from '../../agenda/TaskEntita'

export const dynamic = 'force-dynamic'

// I moduli da cui puo' arrivare una richiesta, con la pagina dove si lavora e
// il campo che porta la data: la timeline della persona li mescola in ordine
// di arrivo, ed e' il punto di questa scheda - vedere tutta la storia in un
// posto invece di cercarla sezione per sezione.
const MODULI = [
  { tabella: 'form_contatti', etichetta: 'Enquiry', href: '/dashboard/contatti/adulti', classe: 'richiesta-blu' },
  { tabella: 'form_invita_amico', etichetta: 'Invita un amico', href: '/dashboard/invita-amico?filtro=tutti', classe: 'richiesta-verde' },
  { tabella: 'form_scuola_tennis', etichetta: 'Scuola tennis', href: '/dashboard/scuola-tennis', classe: 'richiesta-ambra' },
  { tabella: 'form_summer_camp', etichetta: 'Summer camp', href: '/dashboard/summer-camp', classe: 'richiesta-viola' },
  { tabella: 'iscrizioni_eventi', etichetta: 'Iscrizione evento', href: '/dashboard/iscrizioni-eventi', classe: 'richiesta-ciano' },
] as const

type Richiesta = { modulo: (typeof MODULI)[number]; riga: Record<string, any>; quando: string; ruolo?: string }

// Da dove leggere le richieste della persona: intestate a lei (persona_id,
// un modulo a testa) e - per i moduli junior - anche quelle in cui e' il
// minore iscritto o il socio che ha invitato. Elenco unico cosi' le query
// partono tutte insieme (vedi sotto), invece di due giri separati.
const RICHIESTE_QUERIES = [
  ...MODULI.map((modulo) => ({ modulo, colonna: 'persona_id' as const, ruolo: undefined as string | undefined })),
  { modulo: MODULI[2], colonna: 'persona_minore_id' as const, ruolo: 'Iscritto' },
  { modulo: MODULI[3], colonna: 'persona_minore_id' as const, ruolo: 'Iscritto' },
  { modulo: MODULI[1], colonna: 'persona_socio_id' as const, ruolo: 'Ha invitato' },
]

export default async function SchedaPersonaPage({ params }: { params: { id: string } }) {
  if (!(await utenteHaSezione('persone'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null

  // persona.id e params.id sono lo stesso valore: tutto cio' che filtra per
  // persona puo' partire subito, senza aspettare che la riga persona sia
  // arrivata. Le uniche due dipendenze vere sono il genitore (serve
  // persona.genitore_id, si legge dopo) e gli accessi al sito (servono i vid
  // delle richieste, si leggono dopo - vedi piu' sotto): il resto e' un
  // solo giro di rete invece di quattro in fila.
  const [
    { data: persona },
    { data: figli },
    { data: opportunita },
    { data: staff },
    { data: task },
    eAmministratore,
    puoRiassegnareLead,
    { data: amiciInvitati },
    ...risultatiRichieste
  ] = await Promise.all([
    supabase.from('persone').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('persone').select('id, nome, cognome, data_nascita').eq('genitore_id', params.id),
    supabase.from('opportunita').select('*').eq('persona_id', params.id).order('creato_il', { ascending: false }),
    supabase.from('staff_users').select('email, nome, cognome').order('cognome', { ascending: true }),
    supabase.from('task').select('*').eq('persona_id', params.id).order('data', { ascending: true }),
    puoAmministrare(emailCorrente),
    puoRiassegnare(emailCorrente),
    // Amici che questa persona ha invitato: quanti sono e quanti si sono
    // iscritti. Lo stato lo leggiamo dalla riga dell'invito, che il trigger
    // specchia da quello dell'opportunita' dell'amico (vedi
    // specchia_stato_opportunita): non serve una seconda query.
    supabase
      .from('form_invita_amico')
      .select('id, created_at, amico_nome, amico_cognome, amico_email, persona_id, stato, credito_caricato')
      .eq('persona_socio_id', params.id)
      .order('created_at', { ascending: false }),
    ...RICHIESTE_QUERIES.map(({ modulo, colonna }) => supabase.from(modulo.tabella as any).select('*').eq(colonna, params.id)),
  ])

  if (!persona) notFound()

  const richieste: Richiesta[] = []
  RICHIESTE_QUERIES.forEach(({ modulo, ruolo }, i) => {
    const data = (risultatiRichieste[i] as { data: Record<string, any>[] | null }).data
    for (const riga of data ?? []) {
      richieste.push({ modulo, riga, quando: riga.created_at ?? riga.data_compilazione_form ?? '', ruolo })
    }
  })
  richieste.sort((a, b) => b.quando.localeCompare(a.quando))

  const inviti = amiciInvitati ?? []
  const amiciIscritti = inviti.filter((invito) => normalizzaStato(invito.stato) === 'vinto').length
  const creditiCaricati = inviti.filter((invito) => invito.credito_caricato).length

  // Per gli eventi in agenda: da quale richiesta e' nato ciascuno.
  const etichetteRichieste: Record<string, string> = Object.fromEntries(
    richieste.map(({ modulo, riga }) => [`${modulo.tabella}:${riga.id}`, modulo.etichetta])
  )

  // Visite al sito: i vid delle sue richieste, cosi' si vede quanto e' "calda"
  // la persona e non la singola richiesta.
  const vids = [...new Set(richieste.map((r) => r.riga.vid).filter((v): v is string => !!v))]

  // Le due query che dipendevano da un risultato arrivato solo ora - il
  // genitore da persona.genitore_id, gli accessi dai vid delle richieste -
  // nello stesso giro invece di uno a testa.
  const [{ data: genitore }, { data: accessi }] = await Promise.all([
    persona.genitore_id
      ? supabase.from('persone').select('id, nome, cognome, email').eq('id', persona.genitore_id).maybeSingle()
      : Promise.resolve({ data: null }),
    vids.length > 0 ? supabase.from('accessi').select('*').in('vid', vids) : Promise.resolve({ data: [] }),
  ])
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])
  const tuttiAccessi = vids.flatMap((vid) => accessiPerVid[vid] ?? [])

  const elencoStaff = (staff ?? []).map((membro) => ({
    email: membro.email,
    nome: `${membro.nome ?? ''} ${membro.cognome ?? ''}`.trim() || membro.email,
  }))

  const leadAperto = (opportunita ?? []).find((o) => !o.chiuso_il) ?? null
  const storicoPerOpportunita = await storicoOpportunita((opportunita ?? []).map((o) => o.id))
  const leadChiusi = (opportunita ?? []).filter((o) => o.chiuso_il)
  const nome = nomePersona(persona)

  // Junior e' rimasta al modello precedente la pipeline (gestito/nota sulla
  // singola richiesta, vedi ContattiSezione): se le uniche enquiry di questa
  // persona sono junior, l'opportunita' che nasce comunque in background non
  // e' una trattativa che qualcuno lavora, e mostrare qui il pannello con
  // "Prendi in carico" sarebbe la stessa confusione tolta dalla lista Junior.
  // Basta una sola enquiry non-junior (anche vecchia) per tornare a mostrare
  // la pipeline: da quel momento in poi e' un vero lead da seguire.
  const enquiry = richieste.filter((r) => r.modulo.tabella === 'form_contatti')
  const soloEnquiryJunior = enquiry.length > 0 && enquiry.every((r) => apparteneAGruppo(r.riga.gruppo_attivita, 'junior'))

  return (
    <div>
      <div className="page-header">
        <h1>{nome}</h1>
        <Link href="/dashboard/persone" className="link">
          ← Torna all'anagrafica
        </Link>
      </div>

      <div className="persona-intestazione">
        {persona.tipo === 'minore' && <span className="richiesta-badge richiesta-ciano">Minore</span>}
        {persona.storico && <span className="richiesta-badge richiesta-neutro">Solo storico HubSpot</span>}
        {persona.pgm_member_id && <span className="richiesta-badge richiesta-viola">PerfectGym</span>}
        <ContactLinks email={persona.email} phone={persona.cellulare} />
      </div>

      <div className="pannello-gestione">
        <div className="pannello-gestione-blocco">
          <div className="pannello-gestione-titolo">Opportunità</div>
          {soloEnquiryJunior ? (
            <p className="gestione-meta">
              Le enquiry Junior di questa persona si gestiscono una per una (gestito/nota) nella sezione{' '}
              <Link href="/dashboard/contatti/junior" className="link">
                Enquiries Junior
              </Link>
              : non c'è qui una trattativa da avanzare.
            </p>
          ) : leadAperto ? (
            <PannelloPipeline
              id={leadAperto.id}
              stato={normalizzaStato(leadAperto.stato)}
              assegnatoA={leadAperto.assegnato_a ?? null}
              assegnatoIl={leadAperto.assegnato_il ?? null}
              statoIl={leadAperto.stato_il ?? null}
              motivoPerso={leadAperto.motivo_perso ?? null}
              emailCorrente={emailCorrente}
              eAmministratore={eAmministratore}
              puoRiassegnareLead={puoRiassegnareLead}
              staff={elencoStaff}
              storico={storicoPerOpportunita[leadAperto.id] ?? []}
            />
          ) : (
            <p className="gestione-meta">
              Nessuna opportunità aperta. Ne nasce una da sola alla prossima enquiry o invito di questa persona.
            </p>
          )}

          {!soloEnquiryJunior && leadChiusi.length > 0 && (
            <ul className="persona-lead-chiusi">
              {leadChiusi.map((lead) => (
                <li key={lead.id}>
                  <PipelineBadge stato={normalizzaStato(lead.stato)} />
                  <span className="muted">
                    chiuso il {formatDateOra(lead.chiuso_il)}
                    {lead.assegnato_a && ` · ${lead.assegnato_a}`}
                    {lead.motivo_perso && ` · ${lead.motivo_perso}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tutti gli eventi della persona, anche quelli nati da una sua
            richiesta: la stessa persona puo' averne piu' di uno. */}
        <div className="pannello-gestione-blocco">
          <div className="pannello-gestione-titolo">In agenda</div>
          <TaskEntita
            persona={{ id: persona.id, nome, opportunitaId: leadAperto?.id ?? null }}
            titoloSuggerito={`Ricontattare ${nome}`}
            task={task ?? []}
            staff={elencoStaff}
            emailCorrente={emailCorrente}
            eAmministratore={eAmministratore}
            etichetteCollegamento={etichetteRichieste}
          />
        </div>
      </div>

      <div className="detail-group">
        <div className="detail-group-title">Anagrafica</div>
        <GrigliaDettagli
          voci={[
            ['nome', persona.nome],
            ['cognome', persona.cognome],
            ['email', persona.email],
            ['cellulare', persona.cellulare],
            ['codice_fiscale', persona.codice_fiscale],
            ['data_nascita', persona.data_nascita],
            ['pgm_member_id', persona.pgm_member_id],
            ['prima_fonte', etichettaFonte(persona.fonte)],
            ['in_anagrafica_da', persona.creato_il],
          ]}
        />
      </div>

      {(genitore || (figli ?? []).length > 0) && (
        <div className="detail-group">
          <div className="detail-group-title">Famiglia</div>
          <ul className="persona-relazioni">
            {genitore && (
              <li>
                Genitore:{' '}
                <Link href={`/dashboard/persone/${genitore.id}`} className="link">
                  {nomePersona(genitore)}
                </Link>
              </li>
            )}
            {(figli ?? []).map((figlio) => (
              <li key={figlio.id}>
                Figlio/a:{' '}
                <Link href={`/dashboard/persone/${figlio.id}`} className="link">
                  {nomePersona(figlio)}
                </Link>
                {figlio.data_nascita && <span className="muted"> · nato/a il {figlio.data_nascita}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="detail-group">
        <div className="detail-group-title">
          Richieste <span className="count">{richieste.length}</span>
        </div>
        {richieste.length === 0 ? (
          <p className="gestione-meta">Nessuna richiesta: è una persona che conosciamo solo dallo storico.</p>
        ) : (
          <ul className="persona-richieste">
            {richieste.map(({ modulo, riga, quando, ruolo }) => {
              // Le due Enquiries sono due sezioni: il link deve portare a
              // quella giusta, non sempre agli Adulti.
              const href =
                modulo.tabella === 'form_contatti' && apparteneAGruppo(riga.gruppo_attivita, 'junior')
                  ? '/dashboard/contatti/junior'
                  : modulo.href

              return (
                <li key={`${modulo.tabella}-${riga.id}-${ruolo ?? ''}`}>
                  <span className={`richiesta-badge ${modulo.classe}`}>{modulo.etichetta}</span>
                  <span className="persona-richiesta-quando">{quando ? formatDateOra(quando) : '—'}</span>
                  {ruolo && <span className="richiesta-badge richiesta-neutro">{ruolo}</span>}
                  <span className="muted">
                    {riga.tipo_richiesta ?? riga.tipo_corso ?? riga.nome_evento ?? riga.amico_email ?? ''}
                  </span>
                  <Link href={href} className="link">
                    apri sezione
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {inviti.length > 0 && (
        <div className="detail-group">
          <div className="detail-group-title">
            Amici invitati <span className="count">{inviti.length}</span>
          </div>
          <p className="gestione-meta">
            {amiciIscritti === 1 ? '1 iscritto' : `${amiciIscritti} iscritti`} · {creditiCaricati} con il credito
            caricato
          </p>
          <ul className="persona-richieste">
            {inviti.map((invito) => {
              const nomeAmico =
                `${invito.amico_nome ?? ''} ${invito.amico_cognome ?? ''}`.trim() || invito.amico_email || 'amico'
              const statoInvito = normalizzaStato(invito.stato)

              return (
                <li key={invito.id}>
                  <span className="persona-richiesta-quando">{formatDateOra(invito.created_at)}</span>
                  {invito.persona_id ? (
                    <Link href={`/dashboard/persone/${invito.persona_id}`} className="link">
                      {nomeAmico}
                    </Link>
                  ) : (
                    nomeAmico
                  )}
                  <PipelineBadge stato={statoInvito} />
                  {statoInvito === 'vinto' && (
                    <span className="muted">
                      credito {invito.credito_caricato ? 'caricato' : 'da caricare'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <VisiteContatto accessi={tuttiAccessi} />
    </div>
  )
}
