import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { formatDateOra } from '@/lib/format'
import { AZIONI_LOG, etichettaAzione } from '@/lib/audit'
import { FiltroSelect } from '@/components/FiltroSelect'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'

// Un pannello di segreteria non genera migliaia di azioni al giorno: 300
// righe piu' recenti (dopo i filtri, vedi sotto) bastano abbondantemente
// senza bisogno di una paginazione vera.
const LIMITE = 300

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
  const emailUniche = [...new Set((emailLog ?? []).map((r) => r.email).filter((e): e is string => !!e))].sort()

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
            Apri una riga per vedere tutti i dettagli grezzi (email, entità coinvolta, id del record, dettagli
            specifici dell'azione).
          </li>
          <li>Le righe sono ordinate dalla più recente, fino a un massimo di 300 per filtro applicato.</li>
        </ol>
        <p className="box-istruzioni-nota">
          Un tentativo di accesso con un'email non autorizzata compare qui come «Accesso rifiutato», anche se
          quella persona non è (o non è più) tra gli operatori.
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
              {(righe ?? []).map((riga) => (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={COLONNE_TABELLA.length + 1}
                  columns={COLONNE_TABELLA}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
                  cells={[formatDateOra(riga.created_at), nomeOperatore(riga.email), etichettaAzione(riga.azione)]}
                />
              ))}
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
