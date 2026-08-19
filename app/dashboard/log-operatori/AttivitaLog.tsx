import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { confrontaOperatori, formatDateOra } from '@/lib/format'
import { AZIONI_LOG, etichettaAzione, etichettaRecord } from '@/lib/audit'
import { FiltroSelect } from '@/components/FiltroSelect'
import { AccordionGroup, ExpandableRow, GrigliaDettagli } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'

// Un pannello di segreteria non genera migliaia di azioni al giorno: 300
// righe piu' recenti (dopo i filtri, vedi sotto) bastano abbondantemente
// senza bisogno di una paginazione vera.
const LIMITE = 300

// Tabelle a cui un log puo' riferirsi tramite entita/entita_id, con i
// campi che identificano il record: aprendo una riga si vede a chi si
// riferisce l'azione, senza dover cercare l'id in un'altra sezione. Non
// tutte le entita' sono qui: "timbrature" porta gia' nei dettagli i valori
// prima/dopo, e "notifiche" non ha un entita_id da risolvere.
type TabellaCollegata =
  | 'form_contatti'
  | 'form_invita_amico'
  | 'form_scuola_tennis'
  | 'form_summer_camp'
  | 'staff_users'
  | 'task'
  | 'persone'
  | 'opportunita'

const TABELLE_COLLEGATE: Record<TabellaCollegata, { chiaveId: string; select: string }> = {
  form_contatti: {
    chiaveId: 'id',
    select: 'id, created_at, nome, cognome, email, cellulare, tipo_richiesta, gruppo_attivita, gestito, note',
  },
  form_invita_amico: {
    chiaveId: 'id',
    select:
      'id, created_at, amico_nome, amico_cognome, amico_email, amico_cellulare, email_socio, stato, assegnato_a, motivo_perso, note',
  },
  form_scuola_tennis: {
    chiaveId: 'id',
    select:
      'id, created_at, minore_nome, minore_cognome, genitore_nome, genitore_cognome, genitore_email, genitore_cellulare, tipo_corso, caricato_pgm',
  },
  form_summer_camp: {
    chiaveId: 'id',
    select:
      'id, created_at, minore_nome, minore_cognome, genitore_nome, genitore_cognome, genitore_email, genitore_cellulare, settimane, caricato_pgm',
  },
  staff_users: {
    chiaveId: 'email',
    select: 'email, nome, cognome, puo_invitare, puo_cancellare, sezioni_consentite',
  },
  task: {
    chiaveId: 'id',
    select: 'id, created_at, titolo, tipo, data, ora, assegnato_a, creato_da, stato, esito, entita, entita_id',
  },
  persone: {
    chiaveId: 'id',
    select: 'id, nome, cognome, email, cellulare, tipo, pgm_member_id, fonte, storico',
  },
  opportunita: {
    chiaveId: 'id',
    select: 'id, persona_id, stato, assegnato_a, assegnato_il, motivo_perso, chiuso_il, note',
  },
}

function tabellaCollegata(entita: string | null | undefined): TabellaCollegata | null {
  return entita && entita in TABELLE_COLLEGATE ? (entita as TabellaCollegata) : null
}

// Campi che nel pannello sarebbero rumore: l'id e' gia' nella riga del log,
// e le colonne di servizio non aggiungono nulla a "chi era questo record".
const CAMPI_RECORD_NASCOSTI = ['id']

// I timestamp del record arrivano grezzi da Postgres (ISO in UTC): senza
// convertirli si leggerebbe "2026-08-09T14:12:00Z" in mezzo a campi
// altrimenti in italiano. I campi data "puri" (data_richiesta,
// minore_data_nascita) non passano di qui: non hanno un'ora da convertire.
function vociRecord(record: Record<string, unknown>): [string, unknown][] {
  return Object.entries(record)
    .filter(([chiave]) => !CAMPI_RECORD_NASCOSTI.includes(chiave))
    .map(([chiave, valore]) =>
      (chiave.endsWith('_at') || chiave.endsWith('_il')) && typeof valore === 'string'
        ? ([chiave, formatDateOra(valore)] as [string, unknown])
        : ([chiave, valore] as [string, unknown])
    )
}

const COLONNE_TABELLA = ['Quando', 'Operatore', 'Azione']

// "Operatore" e "Azione" (etichetta) sono calcolati e mostrati come cella,
// non fanno parte del dettaglio generico: azione grezza e id restano
// comunque visibili nel pannello espanso, entita/entita_id/dettagli non
// sono mai nascosti - e' proprio quello che si apre la riga per vedere.
const COLONNE_VISIBILI = ['id', 'created_at', 'azione']

export async function AttivitaLog({
  searchParams,
}: {
  searchParams: { operatore?: string; azione?: string }
}) {
  const supabase = createSupabaseServiceClient()

  const operatoreFiltro = searchParams.operatore ?? 'tutti'
  const azioneFiltro = searchParams.azione ?? 'tutte'

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LIMITE)

  if (operatoreFiltro !== 'tutti') query = query.eq('email', operatoreFiltro)
  if (azioneFiltro !== 'tutte') query = query.eq('azione', azioneFiltro)

  const [{ data: righe, error }, { data: staffAll }, { data: emailLog }] = await Promise.all([
    query,
    supabase.from('staff_users').select('email, nome, cognome'),
    supabase.from('audit_log').select('email'),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  // Chi ha fatto almeno un'azione, non solo lo staff attuale: cosi' resta
  // filtrabile/riconoscibile anche un operatore rimosso in seguito, o un
  // tentativo di accesso con un'email non autorizzata (mostra l'email
  // grezza in quel caso, non c'e' un nome da cercare).
  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  // Sempre in ordine alfabetico di cognome, come ogni altro elenco di operatori.
  const emailUniche = [...new Set((emailLog ?? []).map((r) => r.email).filter((e): e is string => !!e))]
    .map((email) => ({ email, ...mappaStaff.get(email) }))
    .sort(confrontaOperatori)
    .map((s) => s.email)

  function nomeOperatore(email: string | null): string {
    if (!email) return '—'
    const s = mappaStaff.get(email)
    const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
    return nomeCompleto || email
  }

  const opzioniOperatori = [
    { valore: 'tutti', etichetta: 'Tutti gli operatori' },
    ...emailUniche.map((email) => ({ valore: email, etichetta: nomeOperatore(email) })),
  ]

  const opzioniAzioni = [
    { valore: 'tutte', etichetta: 'Tutte le azioni' },
    ...Object.entries(AZIONI_LOG).map(([chiave, etichetta]) => ({ valore: chiave, etichetta })),
  ]

  // Un'unica query per tabella con tutti gli id che compaiono nelle righe
  // mostrate, invece di una query per riga: le 300 righe del log possono
  // riferirsi allo stesso contatto decine di volte.
  const idPerTabella = new Map<TabellaCollegata, Set<string>>()
  for (const riga of righe ?? []) {
    const tabella = tabellaCollegata(riga.entita)
    if (!tabella || !riga.entita_id) continue
    if (!idPerTabella.has(tabella)) idPerTabella.set(tabella, new Set())
    idPerTabella.get(tabella)!.add(riga.entita_id)
  }

  const collegati = new Map<string, Record<string, unknown>>()
  await Promise.all(
    [...idPerTabella].map(async ([tabella, ids]) => {
      const { chiaveId, select } = TABELLE_COLLEGATE[tabella]
      const { data } = await supabase.from(tabella).select(select).in(chiaveId, [...ids])
      for (const record of (data ?? []) as unknown as Record<string, unknown>[]) {
        collegati.set(`${tabella}:${String(record[chiaveId])}`, record)
      }
    })
  )

  return (
    <div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Le azioni piu' significative fatte dagli operatori nel pannello: accessi, permessi modificati, contatti
        gestiti o cancellati, iscrizioni segnate su PerfectGym. Non e' un log di ogni singolo click, solo delle
        azioni con un effetto reale. Apri una riga per vedere tutti i dettagli.
      </p>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>Filtra per operatore e/o per tipo di azione con le due tendine qui sotto.</li>
          <li>
            Apri una riga per vedere tutto: il testo della nota salvata, i dati del contatto o dell'iscrizione a cui
            l'azione si riferisce, e i dettagli grezzi (email, entità, id del record).
          </li>
          <li>
            Se un contatto è stato cancellato, la riga contiene la copia completa dei suoi dati al momento della
            cancellazione: è l'unico posto in cui restano.
          </li>
          <li>Le righe sono ordinate dalla più recente, fino a un massimo di 300 per filtro applicato.</li>
        </ol>
        <p className="box-istruzioni-nota">
          Un tentativo di accesso con un'email non autorizzata compare qui come «Accesso rifiutato», anche se
          quella persona non è (o non è più) tra gli operatori. Il testo delle note e la copia dei record cancellati
          vengono registrati dalle azioni fatte da qui in avanti: per le azioni precedenti resta il collegamento al
          record, se esiste ancora.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <FiltroSelect
          valore={operatoreFiltro}
          opzioni={opzioniOperatori}
          paramName="operatore"
          ariaLabel="Filtra per operatore"
        />
        <FiltroSelect valore={azioneFiltro} opzioni={opzioniAzioni} paramName="azione" ariaLabel="Filtra per azione" />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Quando</th>
              <th>Operatore</th>
              <th>Azione</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {(righe ?? []).map((riga) => {
                // "dettagli" e' un jsonb: mostrato cosi' com'e' finirebbe come
                // un unico blob JSON grezzo (array con virgolette e parentesi
                // comprese). Spacchettato nella riga, ogni campo passa dalla
                // formattazione normale (array -> elenco leggibile, vedi
                // formatValue) invece che da JSON.stringify.
                //
                // messaggio/nota/record_cancellato escono dallo spacchettamento
                // e hanno una resa dedicata: il testo di una nota va letto per
                // esteso, e un record intero e' una griglia di campi, non un
                // valore da stampare in una cella.
                const {
                  messaggio,
                  nota,
                  record_cancellato: recordCancellato,
                  ...altriDettagli
                } = (riga.dettagli ?? {}) as Record<string, unknown>

                const collegato =
                  riga.entita && riga.entita_id ? collegati.get(`${riga.entita}:${riga.entita_id}`) : undefined

                // Il nome nella cella "Azione": in elenco si capisce subito su
                // chi si e' intervenuti. Prima dal log (vale anche per un
                // record cancellato), poi dal record collegato per le azioni
                // registrate prima che il nome finisse nei dettagli.
                const soggetto =
                  (typeof altriDettagli.contatto === 'string' && altriDettagli.contatto) ||
                  (typeof altriDettagli.email_target === 'string' && altriDettagli.email_target) ||
                  etichettaRecord(collegato) ||
                  null

                const sezioni: { title: string; content: React.ReactNode }[] = []

                if (recordCancellato && typeof recordCancellato === 'object') {
                  sezioni.push({
                    title: 'Dati del record cancellato',
                    content: <GrigliaDettagli voci={vociRecord(recordCancellato as Record<string, unknown>)} />,
                  })
                } else if (collegato) {
                  sezioni.push({
                    title: 'Record collegato (com’è adesso)',
                    content: <GrigliaDettagli voci={vociRecord(collegato)} />,
                  })
                } else if (riga.entita_id && tabellaCollegata(riga.entita)) {
                  sezioni.push({
                    title: 'Record collegato',
                    content: (
                      <p className="muted" style={{ margin: 0 }}>
                        Non è più presente in {riga.entita}: cancellato dopo questa azione, oppure id non più valido.
                      </p>
                    ),
                  })
                }

                return (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={COLONNE_TABELLA.length + 1}
                    columns={COLONNE_TABELLA}
                    record={{ ...riga, ...altriDettagli }}
                    hiddenKeys={[...COLONNE_VISIBILI, 'dettagli']}
                    sections={sezioni}
                    evidenza={
                      <>
                        {typeof messaggio === 'string' && messaggio && (
                          <p className="notifica-messaggio">{messaggio}</p>
                        )}
                        {typeof nota === 'string' && (
                          <div className="detail-group">
                            <div className="detail-group-title">Nota salvata</div>
                            {nota.trim() ? (
                              <p className="notifica-messaggio">{nota}</p>
                            ) : (
                              <p className="muted" style={{ margin: 0 }}>
                                Nota svuotata (testo cancellato).
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    }
                    cells={[
                      formatDateOra(riga.created_at),
                      nomeOperatore(riga.email),
                      <>
                        {etichettaAzione(riga.azione)}
                        {soggetto && <span className="log-soggetto">{soggetto}</span>}
                      </>,
                    ]}
                  />
                )
              })}
            </tbody>
          </AccordionGroup>
        </table>

        {(righe ?? []).length === 0 && <p className="empty-state">Nessuna azione registrata.</p>}
        {(righe ?? []).length === LIMITE && (
          <p className="muted" style={{ marginTop: 12 }}>
            Mostrate le {LIMITE} azioni più recenti per questo filtro: restringi la ricerca per vederne altre.
          </p>
        )}
      </div>
    </div>
  )
}
