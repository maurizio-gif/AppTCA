import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { FiltroSelect } from '@/components/FiltroSelect'
import { FiltroData } from '@/components/FiltroData'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { EsportaCsv } from '@/components/EsportaCsv'
import { AnteprimaReport } from '@/components/AnteprimaReport'
import { ExportPdfButton } from '@/components/ExportPdfButton'
import { formatDateOra, variantePillola } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { raggruppaAccessiPerVid } from '@/lib/visite'
import { chiaveGiorno, dataValida, formatBreve } from '@/lib/analytics'
import { ETICHETTA_TIPO, gestita, testoElenco, tipoRichiesta, type TipoRichiestaScuola } from '@/lib/scuola-tennis'
import { VisiteContatto } from '@/components/VisiteContatto'
import { CaricatoPgmToggle } from './CaricatoPgmToggle'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Bambino/a', 'Genitore', 'Corso']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'genitore_email',
  'genitore_cellulare',
  'frequenza',
  'caricato_pgm',
  'caricato_pgm_da',
  'caricato_pgm_il',
]

const FILTRI_VALIDI = ['da_caricare', 'caricato', 'tutti'] as const
type Filtro = (typeof FILTRI_VALIDI)[number]

const TIPI_VALIDI = ['tutti', 'preiscrizione', 'provino'] as const
type FiltroTipo = (typeof TIPI_VALIDI)[number]

// Singola selezione: assente (es. dal link "Scuola tennis" nel menu) o non
// valida = "da caricare", cosi' e' quello che si vede aprendo la pagina.
function parseFiltro(raw: string | undefined): Filtro {
  if (raw && (FILTRI_VALIDI as readonly string[]).includes(raw)) return raw as Filtro
  return 'da_caricare'
}

function parseTipo(raw: string | undefined): FiltroTipo {
  if (raw && (TIPI_VALIDI as readonly string[]).includes(raw)) return raw as FiltroTipo
  return 'tutti'
}

// Pagina di sola lettura per i dati del form, con in aggiunta il toggle
// Caricato su Perfect Gym: stessa logica/formattazione di /dashboard/contatti
// (Server Component + service role client).
export default async function ScuolaTennisPage({
  searchParams,
}: {
  searchParams: { filtro?: string; tipo?: string; dal?: string; al?: string }
}) {
  if (!(await utenteHaSezione('scuola-tennis'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('form_scuola_tennis')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  // Visite al sito di ciascun genitore (per vid), per capire quanto e'
  // "caldo" il lead - vedi VisiteContatto.
  const vids = [...new Set((righe ?? []).map((riga) => riga.vid).filter((v): v is string => !!v))]
  const { data: accessi } = vids.length > 0 ? await supabase.from('accessi').select('*').in('vid', vids) : { data: [] }
  const accessiPerVid = raggruppaAccessiPerVid(accessi ?? [])

  const filtro = parseFiltro(searchParams.filtro)
  const tipo = parseTipo(searchParams.tipo)
  const dal = dataValida(searchParams.dal) ? searchParams.dal : ''
  const al = dataValida(searchParams.al) ? searchParams.al : ''

  // Il periodo si applica per primo: i contatori delle altre due tendine
  // devono riferirsi all'intervallo scelto, altrimenti direbbero quante
  // richieste esistono in totale mentre in tabella se ne vedono altre.
  const nelPeriodo = (righe ?? []).filter((riga) => {
    const giorno = chiaveGiorno(riga.created_at)
    if (dal && giorno < dal) return false
    if (al && giorno > al) return false
    return true
  })

  const perTipo = tipo === 'tutti' ? nelPeriodo : nelPeriodo.filter((riga) => tipoRichiesta(riga) === tipo)
  const righeFiltrate =
    filtro === 'tutti' ? perTipo : perTipo.filter((riga) => (filtro === 'caricato' ? gestita(riga) : !gestita(riga)))

  const conta = (righe: Record<string, any>[]) => righe.length
  const OPZIONI_TIPO = [
    { valore: 'tutti', etichetta: `Tutti i tipi (${conta(nelPeriodo)})` },
    {
      valore: 'preiscrizione',
      etichetta: `Preiscrizioni (${conta(nelPeriodo.filter((r) => tipoRichiesta(r) === 'preiscrizione'))})`,
    },
    {
      valore: 'provino',
      etichetta: `Prenotazioni provino (${conta(nelPeriodo.filter((r) => tipoRichiesta(r) === 'provino'))})`,
    },
  ]
  // Il conteggio nell'etichetta serve soprattutto qui: dal 15 settembre le
  // prenotazioni provino nascono gia' gestite, quindi "Da caricare" puo'
  // essere vuoto anche con decine di richieste arrivate - senza i numeri
  // sembrerebbe che la pagina non carichi.
  const OPZIONI_FILTRO = [
    { valore: 'da_caricare', etichetta: `Da caricare (${conta(perTipo.filter((r) => !gestita(r)))})` },
    { valore: 'caricato', etichetta: `Gestite (${conta(perTipo.filter(gestita))})` },
    { valore: 'tutti', etichetta: `Tutte (${conta(perTipo)})` },
  ]

  const etichettaPeriodo =
    dal && al
      ? `dal ${formatBreve(dal)} al ${formatBreve(al)}`
      : dal
        ? `dal ${formatBreve(dal)}`
        : al
          ? `fino al ${formatBreve(al)}`
          : 'tutte le date'
  const etichettaTipo = OPZIONI_TIPO.find((o) => o.valore === tipo)?.etichetta ?? 'Tutti i tipi'

  const csvIntestazioni = [
    'Data',
    'Tipo',
    'Bambino/a',
    'Data di nascita',
    'Genitore',
    'Email',
    'Cellulare',
    'Corso',
    'Frequenza',
    'Giorni',
    'Orari preferiti',
    'Stato',
  ]
  const csvRighe = righeFiltrate.map((riga) => [
    formatDateOra(riga.created_at),
    ETICHETTA_TIPO[tipoRichiesta(riga)],
    `${riga.minore_nome ?? ''} ${riga.minore_cognome ?? ''}`.trim(),
    riga.minore_data_nascita ?? '',
    `${riga.genitore_nome ?? ''} ${riga.genitore_cognome ?? ''}`.trim(),
    riga.genitore_email ?? '',
    riga.genitore_cellulare ?? '',
    riga.tipo_corso ?? '',
    riga.frequenza ?? '',
    testoElenco(riga.giorni),
    testoElenco(riga.orari_preferiti),
    tipoRichiesta(riga) === 'provino' ? 'Provino (nessun caricamento)' : riga.caricato_pgm ? 'Caricato su PGM' : 'Da caricare',
  ])

  const nomeFile = `scuola_tennis_${tipo}_${dal || 'inizio'}_${al || 'oggi'}.csv`

  return (
    <div>
      <div className="page-header">
        <h1>Scuola Tennis</h1>
        <ExportPdfButton />
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Dal 15 settembre 2026 il modulo non raccoglie piu' preiscrizioni ma{' '}
            <strong>prenotazioni di un provino</strong>. Le due cose restano nello stesso elenco, distinte dal
            badge sulla riga e dalla tendina «Tutti i tipi».
          </li>
          <li>
            Le <strong>prenotazioni provino nascono gia' gestite</strong>: sono appuntamenti, non iscrizioni, e
            non c'e' niente da caricare su PerfectGym. Restano quindi fuori dall'elenco «Da caricare».
          </li>
          <li>
            Filtra per tipo, per stato e per intervallo di date; i numeri nelle tendine si riferiscono sempre al
            periodo scelto.
          </li>
          <li>
            «Esporta CSV» scarica esattamente le righe filtrate (si apre in Excel), «Esporta PDF» stampa la
            stessa selezione impaginata. «Vedi anteprima report» mostra prima cosa conterra' il file.
          </li>
        </ol>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <FiltroSelect valore={tipo} opzioni={OPZIONI_TIPO} paramName="tipo" ariaLabel="Filtra per tipo di richiesta" />
        <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} ariaLabel="Filtra per stato" />
        <FiltroData dal={dal} al={al} />
      </div>

      {/* Intestazione che compare solo sul PDF: senza, il foglio stampato
          non direbbe quale selezione sta mostrando. */}
      <div className="solo-stampa intestazione-stampa">
        <h2>Scuola Tennis — {etichettaTipo}</h2>
        <p>
          Periodo: {etichettaPeriodo} · {righeFiltrate.length}{' '}
          {righeFiltrate.length === 1 ? 'richiesta' : 'richieste'} · stampato il {formatDateOra(new Date().toISOString())}
        </p>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Bambino/a</th>
              <th>Genitore</th>
              <th>Corso</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {righeFiltrate.map((riga) => {
                const tipoRiga: TipoRichiestaScuola = tipoRichiesta(riga)
                return (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={5}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
                    evidenza={<VisiteContatto accessi={riga.vid ? accessiPerVid[riga.vid] ?? [] : []} />}
                    extraTitle={tipoRiga === 'provino' ? 'Prenotazione provino' : 'Caricato su Perfect Gym'}
                    extra={
                      tipoRiga === 'provino' ? (
                        <p className="muted" style={{ margin: 0 }}>
                          È un appuntamento per un provino: non va caricato su PerfectGym, quindi risulta già
                          gestito.
                        </p>
                      ) : (
                        <CaricatoPgmToggle
                          id={riga.id}
                          caricato={!!riga.caricato_pgm}
                          caricatoDa={riga.caricato_pgm_da ?? null}
                          caricatoIl={riga.caricato_pgm_il ?? null}
                        />
                      )
                    }
                    cells={[
                      <>
                        {formatDateOra(riga.created_at)}
                        <br />
                        <span className={`richiesta-badge richiesta-${tipoRiga === 'provino' ? 'verde' : 'blu'}`}>
                          {ETICHETTA_TIPO[tipoRiga]}
                        </span>
                      </>,
                      <>
                        {riga.minore_nome} {riga.minore_cognome}
                      </>,
                      <>
                        {riga.genitore_nome} {riga.genitore_cognome}
                        <br />
                        <ContactLinks email={riga.genitore_email} phone={riga.genitore_cellulare} />
                      </>,
                      <>
                        {riga.tipo_corso || '—'}
                        <br />
                        {riga.frequenza ? (
                          <span className={`richiesta-badge richiesta-${variantePillola(riga.frequenza)}`}>
                            {riga.frequenza}
                          </span>
                        ) : (
                          '—'
                        )}
                      </>,
                    ]}
                  />
                )
              })}
            </tbody>
          </AccordionGroup>
        </table>
        {righeFiltrate.length === 0 && (
          <p className="empty-state">Nessuna richiesta con questi filtri: controlla i numeri nelle tendine.</p>
        )}
      </div>

      {righeFiltrate.length > 0 && (
        <div className="timbrature-riepilogo no-print">
          <p className="muted">
            {righeFiltrate.length} {righeFiltrate.length === 1 ? 'richiesta' : 'richieste'} · {etichettaTipo} ·{' '}
            {etichettaPeriodo}
          </p>
          <div className="timbrature-riepilogo-azioni">
            <AnteprimaReport
              nomeFile={nomeFile}
              titolo="Anteprima export Scuola Tennis"
              sottotitolo={`${etichettaTipo} · ${etichettaPeriodo}`}
              intestazioni={csvIntestazioni}
              righe={csvRighe}
              riepilogo={`${righeFiltrate.length} ${righeFiltrate.length === 1 ? 'richiesta' : 'richieste'} nella selezione.`}
            />
            <EsportaCsv nomeFile={nomeFile} intestazioni={csvIntestazioni} righe={csvRighe} />
          </div>
        </div>
      )}
    </div>
  )
}
