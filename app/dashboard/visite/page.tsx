import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { RicercaContatti } from '@/app/dashboard/contatti/RicercaContatti'
import { formatDateOra, variantePillola } from '@/lib/format'
import {
  ETICHETTA_ORIGINE,
  corrispondeRicercaVisita,
  costruisciSessioni,
  hrefContatto,
  type ContattoAnagrafica,
  type SessioneVisita,
} from '@/lib/visite'
import { VisitePagine } from './VisitePagine'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Ultima visita', 'Visitatore', 'Origine', 'Pagine']

const FILTRI_VALIDI = ['tutti', 'riconosciuti', 'anonimi'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'tutti', etichetta: 'Tutti' },
  { valore: 'riconosciuti', etichetta: 'Con contatto' },
  { valore: 'anonimi', etichetta: 'Solo anonimi' },
]

function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'tutti'
}

function applicaFiltro(sessioni: SessioneVisita[], filtro: Filtro): SessioneVisita[] {
  if (filtro === 'riconosciuti') return sessioni.filter((s) => s.contatto)
  if (filtro === 'anonimi') return sessioni.filter((s) => !s.contatto)
  return sessioni
}

// Badge Origine: cliccabile solo quando esiste una sezione con una ricerca
// da riusare per ritrovare il contatto (per ora solo Enquiry - vedi
// lib/visite.ts hrefContatto). stopPropagation perche' il badge sta dentro
// la riga cliccabile della tabella (accordion ExpandableRow).
function BadgeOrigine({ contatto }: { contatto: ContattoAnagrafica }) {
  const badge = (
    <span className={`richiesta-badge richiesta-${variantePillola(contatto.origine)}`}>
      {ETICHETTA_ORIGINE[contatto.origine]}
    </span>
  )
  const href = hrefContatto(contatto)
  if (!href) return badge

  return (
    <Link href={href} className="link" onClick={(e) => e.stopPropagation()}>
      {badge}
    </Link>
  )
}

// Sezione di sola lettura: incrocia gli accessi al sito (tabella "accessi",
// alimentata dal webhook n8n ping-tca) con l'anagrafica dei form gia'
// compilati, abbinandoli tramite "vid" (l'id del visitatore lato browser,
// lo stesso propagato nei form - vedi lib/visite.ts). Un vid senza nessun
// form compilato resta "anonimo": e' comunque una visita reale, solo senza
// un nominativo da mostrare.
export default async function VisiteSitoPage({
  searchParams,
}: {
  searchParams: { q?: string; filtro?: string }
}) {
  if (!(await utenteHaSezione('visite-sito'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const [accessiRes, contattiRes, scuolaRes, summerRes, amicoRes] = await Promise.all([
    supabase.from('accessi').select('*').order('created_at', { ascending: false }),
    supabase
      .from('form_contatti')
      .select('vid, created_at, nome, cognome, email, gruppo_attivita')
      .not('vid', 'is', null),
    supabase
      .from('form_scuola_tennis')
      .select('vid, created_at, genitore_nome, genitore_cognome, genitore_email')
      .not('vid', 'is', null),
    supabase
      .from('form_summer_camp')
      .select('vid, created_at, genitore_nome, genitore_cognome, genitore_email')
      .not('vid', 'is', null),
    supabase
      .from('form_invita_amico')
      .select('vid, created_at, amico_nome, amico_cognome, amico_email')
      .not('vid', 'is', null),
  ])

  const errore =
    accessiRes.error || contattiRes.error || scuolaRes.error || summerRes.error || amicoRes.error
  if (errore) {
    return <p className="error-banner">Errore nel caricamento: {errore.message}</p>
  }

  const contatti: ContattoAnagrafica[] = [
    ...(contattiRes.data ?? []).map((r) => ({
      origine: 'form_contatti' as const,
      vid: r.vid!,
      created_at: r.created_at,
      nome: r.nome,
      cognome: r.cognome,
      email: r.email,
      gruppo: r.gruppo_attivita,
    })),
    ...(scuolaRes.data ?? []).map((r) => ({
      origine: 'form_scuola_tennis' as const,
      vid: r.vid!,
      created_at: r.created_at,
      nome: r.genitore_nome,
      cognome: r.genitore_cognome,
      email: r.genitore_email,
    })),
    ...(summerRes.data ?? []).map((r) => ({
      origine: 'form_summer_camp' as const,
      vid: r.vid!,
      created_at: r.created_at,
      nome: r.genitore_nome,
      cognome: r.genitore_cognome,
      email: r.genitore_email,
    })),
    ...(amicoRes.data ?? []).map((r) => ({
      origine: 'form_invita_amico' as const,
      vid: r.vid!,
      created_at: r.created_at,
      nome: r.amico_nome,
      cognome: r.amico_cognome,
      email: r.amico_email,
    })),
  ]

  const sessioni = costruisciSessioni(accessiRes.data ?? [], contatti)

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtro = parseFiltro(searchParams.filtro)
  const sessioniFiltrate = query
    ? sessioni.filter((s) => corrispondeRicercaVisita(s, query))
    : applicaFiltro(sessioni, filtro)

  return (
    <div>
      <div className="page-header">
        <h1>Visite al sito</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Ogni riga e' un visitatore (identificato dal suo "vid" di navigazione). Aprila per vedere il
            percorso di navigazione in ordine cronologico, dalla prima pagina vista all'ultima.
          </li>
          <li>
            Se lo stesso vid compare anche in un modulo compilato (Enquiry, Scuola tennis, Summer Camp, Invita
            un amico), qui vedi subito nome e contatti di chi ha lasciato quella richiesta.
          </li>
          <li>Cerca per nome, cognome, email o vid, oppure filtra tra Tutti/Con contatto/Solo anonimi.</li>
        </ol>
        <p className="box-istruzioni-nota">
          I visitatori "anonimi" hanno navigato il sito senza (ancora) compilare nessun modulo: restano utili
          per capire quali pagine attirano piu' traffico.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <RicercaContatti valoreIniziale={searchParams.q ?? ''} placeholder="Cerca per nome, cognome, email o vid" />
        {!query && <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} ariaLabel="Filtra per contatto" />}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Ultima visita</th>
              <th>Visitatore</th>
              <th>Origine</th>
              <th>Pagine</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {sessioniFiltrate.map((sessione) => (
                <ExpandableRow
                  key={sessione.vid}
                  id={sessione.vid}
                  columnCount={5}
                  columns={COLONNE_TABELLA}
                  record={sessione}
                  hiddenKeys={['vid', 'primaVisita', 'ultimaVisita', 'pagine', 'contatto']}
                  evidenza={<VisitePagine pagine={sessione.pagine} />}
                  cells={[
                    formatDateOra(sessione.ultimaVisita),
                    sessione.contatto ? (
                      <>
                        {`${sessione.contatto.nome ?? ''} ${sessione.contatto.cognome ?? ''}`.trim() ||
                          sessione.contatto.email ||
                          'Senza nome'}
                        <br />
                        <ContactLinks email={sessione.contatto.email} />
                      </>
                    ) : (
                      <>
                        <span className="muted">Visitatore anonimo</span>
                        <br />
                        <span className="muted">{sessione.vid.slice(0, 8)}…</span>
                      </>
                    ),
                    sessione.contatto ? <BadgeOrigine contatto={sessione.contatto} /> : '—',
                    sessione.pagine.length,
                  ]}
                />
              ))}
            </tbody>
          </AccordionGroup>
        </table>

        {sessioniFiltrate.length === 0 && (
          <p className="empty-state">{query ? 'Nessun risultato per la ricerca.' : 'Nessuna visita registrata.'}</p>
        )}
      </div>
    </div>
  )
}
