import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { RicercaContatti } from '@/app/dashboard/contatti/RicercaContatti'
import { VistaTabs } from '@/components/VistaTabs'
import { formatDateOra } from '@/lib/format'
import { corrispondeRicercaVisita, costruisciSessioni, type ContattoAnagrafica, type RigaAccesso, type SessioneVisita } from '@/lib/visite'
import { ORE_RITORNO, accessiDistintiPerVid, dividiInSessioni } from '@/lib/visite-analisi'
import { PanoramicaVisite, OPZIONI_PERIODO, OPZIONI_SEGMENTO } from './PanoramicaVisite'
import { VisitePagine } from './VisitePagine'
import { BadgeOrigine } from './BadgeOrigine'

export const dynamic = 'force-dynamic'

function parseDaOpzioni(raw: string | undefined, opzioni: { valore: string }[], predefinito: string): string {
  return raw && opzioni.some((o) => o.valore === raw) ? raw : predefinito
}

// Supabase tronca ogni singola richiesta a 1000 righe (db_max_rows di
// PostgREST): gli accessi sono un pageview a testa e superano quella soglia
// in fretta, quindi vanno paginati - senza, sia l'elenco dei visitatori sia
// le medie della panoramica userebbero solo una fetta dei dati senza dirlo.
async function leggiTuttiGliAccessi(
  supabase: ReturnType<typeof createSupabaseServiceClient>
): Promise<{ righe: RigaAccesso[]; errore: string | null }> {
  const DIMENSIONE_PAGINA = 1000
  const righe: RigaAccesso[] = []
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await supabase
      .from('accessi')
      .select('*')
      .order('created_at', { ascending: false })
      .range(pagina * DIMENSIONE_PAGINA, pagina * DIMENSIONE_PAGINA + DIMENSIONE_PAGINA - 1)
    if (error) return { righe, errore: error.message }
    righe.push(...(data ?? []))
    if (!data || data.length < DIMENSIONE_PAGINA) break
  }
  return { righe, errore: null }
}

const COLONNE_TABELLA = ['Ultima visita', 'Visitatore', 'Origine', 'Accessi', 'Pagine']

const FILTRI_VALIDI = ['tutti', 'riconosciuti', 'ritorno', 'anonimi'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const OPZIONI_FILTRO = [
  { valore: 'tutti', etichetta: 'Tutti' },
  { valore: 'riconosciuti', etichetta: 'Con contatto' },
  { valore: 'ritorno', etichetta: 'Con contatto con più visite' },
  { valore: 'anonimi', etichetta: 'Solo anonimi' },
]

function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'tutti'
}

// "ritorno" e' il filtro operativo della sezione: chi ha lasciato un
// recapito ED e' tornato sul sito almeno una seconda volta a 24 ore di
// distanza (vedi ORE_RITORNO). Ordinato per numero di accessi invece che
// per data, perche' qui la domanda non e' "chi e' passato per ultimo" ma
// "chi ci sta pensando di piu'".
function applicaFiltro(
  sessioni: SessioneVisita[],
  filtro: Filtro,
  accessiPerVid: Map<string, number>
): SessioneVisita[] {
  if (filtro === 'riconosciuti') return sessioni.filter((s) => s.contatto)
  if (filtro === 'anonimi') return sessioni.filter((s) => !s.contatto)
  if (filtro === 'ritorno') {
    return sessioni
      .filter((s) => s.contatto && (accessiPerVid.get(s.vid) ?? 1) >= 2)
      .sort(
        (a, b) =>
          (accessiPerVid.get(b.vid) ?? 0) - (accessiPerVid.get(a.vid) ?? 0) ||
          b.ultimaVisita.localeCompare(a.ultimaVisita)
      )
  }
  return sessioni
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
  searchParams: { q?: string; filtro?: string; vista?: string; periodo?: string; segmento?: string }
}) {
  if (!(await utenteHaSezione('visite-sito'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const [accessiRes, contattiRes, scuolaRes, summerRes, amicoRes] = await Promise.all([
    leggiTuttiGliAccessi(supabase),
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

  const errore = contattiRes.error || scuolaRes.error || summerRes.error || amicoRes.error
  if (accessiRes.errore || errore) {
    return <p className="error-banner">Errore nel caricamento: {accessiRes.errore ?? errore!.message}</p>
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

  const accessi = accessiRes.righe
  const sessioni = costruisciSessioni(accessi, contatti)

  const vista = searchParams.vista === 'visitatori' ? 'visitatori' : 'panoramica'

  if (vista === 'panoramica') {
    const periodo = parseDaOpzioni(searchParams.periodo, OPZIONI_PERIODO, '30')
    const segmento = parseDaOpzioni(searchParams.segmento, OPZIONI_SEGMENTO, 'tutti')

    const daISO =
      periodo === 'tutto'
        ? null
        : new Date(Date.now() - Number(periodo) * 24 * 60 * 60 * 1000).toISOString()
    const accessiPeriodo = daISO ? accessi.filter((a) => a.created_at >= daISO) : accessi

    // Il segmento si applica ai vid, non alle singole visite: chi ha
    // compilato un modulo lo ha fatto una volta sola, ma tutte le sue
    // navigazioni - anche quelle prima della richiesta - fanno parte del
    // percorso che ha portato alla conversione.
    const vidRiconosciuti = new Set(contatti.map((c) => c.vid))
    const tutteLeSessioni = dividiInSessioni(accessiPeriodo, vidRiconosciuti)
    const sessioniSegmento =
      segmento === 'riconosciuti'
        ? tutteLeSessioni.filter((s) => s.riconosciuto)
        : segmento === 'anonimi'
          ? tutteLeSessioni.filter((s) => !s.riconosciuto)
          : tutteLeSessioni

    return (
      <div>
        <div className="page-header">
          <h1>Visite al sito</h1>
        </div>
        <VistaTabs
          vista={vista}
          tabs={[
            { chiave: 'panoramica', etichetta: 'Panoramica' },
            { chiave: 'visitatori', etichetta: 'Visitatori', contatore: sessioni.length },
          ]}
        />
        <PanoramicaVisite sessioni={sessioniSegmento} periodo={periodo} segmento={segmento} />
      </div>
    )
  }

  const accessiPerVid = accessiDistintiPerVid(
    dividiInSessioni(accessi, new Set(contatti.map((c) => c.vid)))
  )

  const query = (searchParams.q ?? '').trim().toLowerCase()
  const filtro = parseFiltro(searchParams.filtro)
  const sessioniFiltrate = query
    ? sessioni.filter((s) => corrispondeRicercaVisita(s, query))
    : applicaFiltro(sessioni, filtro, accessiPerVid)

  return (
    <div>
      <div className="page-header">
        <h1>Visite al sito</h1>
      </div>

      <VistaTabs
        vista={vista}
        tabs={[
          { chiave: 'panoramica', etichetta: 'Panoramica' },
          { chiave: 'visitatori', etichetta: 'Visitatori', contatore: sessioni.length },
        ]}
      />

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
          <li>
            La colonna <strong>Accessi</strong> conta le volte in cui quel visitatore e' tornato sul sito a
            distanza di almeno {ORE_RITORNO} ore: piu' visite ravvicinate nello stesso giorno contano come un
            accesso solo.
          </li>
          <li>
            Cerca per nome, cognome, email o vid, oppure filtra. «Con contatto con piu' visite» e' l'elenco da
            guardare per primo: sono le persone di cui hai un recapito e che sono tornate a rivedere il sito in
            giorni diversi, ordinate da chi e' tornato piu' volte.
          </li>
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
              <th>Accessi</th>
              <th>Pagine</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {sessioniFiltrate.map((sessione) => (
                <ExpandableRow
                  key={sessione.vid}
                  id={sessione.vid}
                  columnCount={6}
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
                    <>
                      {accessiPerVid.get(sessione.vid) ?? 1}
                      <span className="etichetta-mobile"> accessi</span>
                    </>,
                    <>
                      {sessione.pagine.length}
                      <span className="etichetta-mobile"> pagine</span>
                    </>,
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
