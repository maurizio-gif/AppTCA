import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { confrontaOperatori, formatDateOra } from '@/lib/format'
import { BUCKET_ALLEGATI_NOTIFICHE, formatDimensioneFile } from '@/lib/allegati'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { VistaTabs } from '@/components/VistaTabs'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { ComponiNotifica } from './ComponiNotifica'
import { ConfermaLetturaButton } from './ConfermaLetturaButton'

// Vita breve: basta il tempo di caricare la pagina e cliccare l'allegato,
// non serve un link valido a lungo (la pagina e' comunque "force-dynamic",
// ne genera uno nuovo a ogni caricamento).
const DURATA_URL_ALLEGATO_SECONDI = 300

export const dynamic = 'force-dynamic'

type RigaNotifica = Record<string, any>

export default async function NotifichePage({
  searchParams,
}: {
  searchParams: { vista?: string }
}) {
  if (!(await utenteHaSezione('notifiche'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const [{ data: staffAll }, { data: ricevuti, error: erroreRicevuti }, { data: inviati, error: erroreInviati }] =
    await Promise.all([
      supabase.from('staff_users').select('email, nome, cognome, sezioni_consentite').order('email'),
      supabase.from('notifiche').select('*').eq('a_email', email ?? '').order('created_at', { ascending: false }),
      supabase.from('notifiche').select('*').eq('da_email', email ?? '').order('created_at', { ascending: false }),
    ])

  if (erroreRicevuti || erroreInviati) {
    return <p className="error-banner">Errore nel caricamento: {(erroreRicevuti ?? erroreInviati)!.message}</p>
  }

  const percorsiAllegati = [...(ricevuti ?? []), ...(inviati ?? [])]
    .map((n) => n.allegato_path)
    .filter((p): p is string => Boolean(p))

  const urlAllegati = new Map<string, string>()
  if (percorsiAllegati.length > 0) {
    const { data: urlFirmati } = await supabase.storage
      .from(BUCKET_ALLEGATI_NOTIFICHE)
      .createSignedUrls(percorsiAllegati, DURATA_URL_ALLEGATO_SECONDI)

    for (const u of urlFirmati ?? []) {
      if (u.signedUrl) urlAllegati.set(u.path ?? '', u.signedUrl)
    }
  }

  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  function nomeOperatore(indirizzo: string): string {
    const s = mappaStaff.get(indirizzo)
    const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
    return nomeCompleto || indirizzo
  }

  // Solo chi ha anche il permesso "Notifiche" puo' essere scelto come
  // destinatario: scrivere a chi non ha la sezione non servirebbe a nulla,
  // non la vedrebbe mai (vedi NotificheProvider/layout.tsx). Sempre in
  // ordine alfabetico di cognome, come ogni altro elenco di operatori.
  const destinatariDisponibili = (staffAll ?? [])
    .filter((s) => s.email !== email && (s.sezioni_consentite ?? []).includes('notifiche'))
    .sort(confrontaOperatori)
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
          <li>Puoi allegare un file (JPG, PNG, PDF, Word o Excel, massimo 5 MB) a ogni messaggio.</li>
          <li>
            «Attiva push» nel menu a sinistra avvisa anche a pannello chiuso, con una notifica del telefono/computer:
            va attivata separatamente su ogni dispositivo con cui vuoi riceverle.
          </li>
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
        <ElencoInviati righe={inviati ?? []} nomeOperatore={nomeOperatore} urlAllegati={urlAllegati} />
      ) : (
        <ElencoRicevuti righe={ricevuti ?? []} nomeOperatore={nomeOperatore} urlAllegati={urlAllegati} />
      )}
    </div>
  )
}

const CHIAVI_ALLEGATO = ['allegato_path', 'allegato_nome', 'allegato_tipo', 'allegato_dimensione']

function AllegatoNotifica({ riga, urlAllegati }: { riga: RigaNotifica; urlAllegati: Map<string, string> }) {
  if (!riga.allegato_path) return null
  const url = urlAllegati.get(riga.allegato_path)

  return (
    <p className="notifica-allegato">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" download={riga.allegato_nome}>
          {riga.allegato_nome}
        </a>
      ) : (
        riga.allegato_nome
      )}{' '}
      <span className="muted">({formatDimensioneFile(riga.allegato_dimensione ?? 0)})</span>
    </p>
  )
}

function ElencoRicevuti({
  righe,
  nomeOperatore,
  urlAllegati,
}: {
  righe: RigaNotifica[]
  nomeOperatore: (email: string) => string
  urlAllegati: Map<string, string>
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
                hiddenKeys={['id', 'created_at', 'da_email', 'a_email', 'messaggio', 'letta_il', ...CHIAVI_ALLEGATO]}
                evidenza={
                  <>
                    <p className="notifica-messaggio">{riga.messaggio}</p>
                    <AllegatoNotifica riga={riga} urlAllegati={urlAllegati} />
                  </>
                }
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
  urlAllegati,
}: {
  righe: RigaNotifica[]
  nomeOperatore: (email: string) => string
  urlAllegati: Map<string, string>
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
                hiddenKeys={['id', 'created_at', 'da_email', 'a_email', 'messaggio', 'letta_il', ...CHIAVI_ALLEGATO]}
                evidenza={
                  <>
                    <p className="notifica-messaggio">{riga.messaggio}</p>
                    <AllegatoNotifica riga={riga} urlAllegati={urlAllegati} />
                  </>
                }
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
