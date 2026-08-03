import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { formatDateOra } from '@/lib/format'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { VistaTabs } from '@/components/VistaTabs'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { ComponiNotifica } from './ComponiNotifica'
import { ConfermaLetturaButton } from './ConfermaLetturaButton'

export const dynamic = 'force-dynamic'

type RigaNotifica = Record<string, any>

// Nessun permesso da controllare: e' la posta personale di chiunque sia
// autenticato, stessa filosofia di Riepilogo (vedi lib/auth/sezioni.ts).
export default async function NotifichePage({
  searchParams,
}: {
  searchParams: { vista?: string }
}) {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const [{ data: staffAll }, { data: ricevuti, error: erroreRicevuti }, { data: inviati, error: erroreInviati }] =
    await Promise.all([
      supabase.from('staff_users').select('email, nome, cognome').order('email'),
      supabase.from('notifiche').select('*').eq('a_email', email ?? '').order('created_at', { ascending: false }),
      supabase.from('notifiche').select('*').eq('da_email', email ?? '').order('created_at', { ascending: false }),
    ])

  if (erroreRicevuti || erroreInviati) {
    return <p className="error-banner">Errore nel caricamento: {(erroreRicevuti ?? erroreInviati)!.message}</p>
  }

  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  function nomeOperatore(indirizzo: string): string {
    const s = mappaStaff.get(indirizzo)
    const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
    return nomeCompleto || indirizzo
  }

  const destinatariDisponibili = (staffAll ?? [])
    .filter((s) => s.email !== email)
    .map((s) => ({ email: s.email, nome: nomeOperatore(s.email) }))

  const vista = searchParams.vista === 'inviati' ? 'inviati' : 'ricevuti'
  const nonLette = (ricevuti ?? []).filter((n) => !n.letta_il).length

  return (
    <div>
      <div className="page-header">
        <h1>Notifiche</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Scrivi un messaggio e scegli uno o più destinatari: ognuno lo vede in evidenza appena apre una pagina
            qualsiasi del pannello, anche se era già collegato.
          </li>
          <li>In «Ricevuti» apri un messaggio e premi «Confermo di aver letto»: registra data e ora di lettura.</li>
          <li>In «Inviati» controlli se e quando è stato letto ogni messaggio che hai inviato.</li>
        </ol>
      </BoxIstruzioni>

      <ComponiNotifica destinatari={destinatariDisponibili} />

      <VistaTabs
        vista={vista}
        tabs={[
          { chiave: 'ricevuti', etichetta: 'Ricevuti', contatore: nonLette },
          { chiave: 'inviati', etichetta: 'Inviati' },
        ]}
      />

      {vista === 'inviati' ? (
        <ElencoInviati righe={inviati ?? []} nomeOperatore={nomeOperatore} />
      ) : (
        <ElencoRicevuti righe={ricevuti ?? []} nomeOperatore={nomeOperatore} />
      )}
    </div>
  )
}

function ElencoRicevuti({
  righe,
  nomeOperatore,
}: {
  righe: RigaNotifica[]
  nomeOperatore: (email: string) => string
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Quando</th>
            <th>Da</th>
            <th>Stato</th>
          </tr>
        </thead>
        <AccordionGroup>
          <tbody>
            {righe.map((riga) => (
              <ExpandableRow
                key={riga.id}
                id={String(riga.id)}
                columnCount={4}
                columns={['Quando', 'Da', 'Stato']}
                record={riga}
                hiddenKeys={['id', 'created_at', 'da_email', 'a_email', 'messaggio', 'letta_il']}
                evidenza={<p className="notifica-messaggio">{riga.messaggio}</p>}
                extra={
                  riga.letta_il ? (
                    <p className="muted">Letta il {formatDateOra(riga.letta_il)}</p>
                  ) : (
                    <ConfermaLetturaButton id={riga.id} />
                  )
                }
                cells={[formatDateOra(riga.created_at), nomeOperatore(riga.da_email), riga.letta_il ? 'Letta' : 'Da leggere']}
              />
            ))}
          </tbody>
        </AccordionGroup>
      </table>
      {righe.length === 0 && <p className="empty-state">Nessun messaggio ricevuto.</p>}
    </div>
  )
}

function ElencoInviati({
  righe,
  nomeOperatore,
}: {
  righe: RigaNotifica[]
  nomeOperatore: (email: string) => string
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Quando</th>
            <th>A</th>
            <th>Stato</th>
          </tr>
        </thead>
        <AccordionGroup>
          <tbody>
            {righe.map((riga) => (
              <ExpandableRow
                key={riga.id}
                id={String(riga.id)}
                columnCount={4}
                columns={['Quando', 'A', 'Stato']}
                record={riga}
                hiddenKeys={['id', 'created_at', 'da_email', 'a_email', 'messaggio', 'letta_il']}
                evidenza={<p className="notifica-messaggio">{riga.messaggio}</p>}
                cells={[
                  formatDateOra(riga.created_at),
                  nomeOperatore(riga.a_email),
                  riga.letta_il ? `Letta il ${formatDateOra(riga.letta_il)}` : 'Non ancora letta',
                ]}
              />
            ))}
          </tbody>
        </AccordionGroup>
      </table>
      {righe.length === 0 && <p className="empty-state">Nessun messaggio inviato.</p>}
    </div>
  )
}
