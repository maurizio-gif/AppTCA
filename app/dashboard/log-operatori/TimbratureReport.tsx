import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { FiltroSelect } from '@/components/FiltroSelect'
import { FiltroData } from '@/components/FiltroData'
import { EsportaCsv } from '@/components/EsportaCsv'
import { AnteprimaReport } from '@/components/AnteprimaReport'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { confrontaOperatori } from '@/lib/format'
import { accoppiaTurni, formattaDurata, giornoRoma, oraRomaLocale, type Turno } from '@/lib/timbratura'
import { RigaTurno } from './RigaTurno'

const COLONNE_TABELLA = 6

function formattaOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })
}

function formattaData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
}

// Un'uscita che cade in un giorno diverso dall'entrata (turno a cavallo
// della mezzanotte, o uscita dimenticata e timbrata giorni dopo) va
// mostrata con la sua data: la colonna "Data" e' quella dell'entrata,
// quindi senza si legge "09:37 → 09:58" accanto a una durata di 144 ore e
// sembra un errore di calcolo invece di una timbratura da correggere.
function testoUscita(turno: Turno, inCorso: string): string {
  if (!turno.uscita) return inCorso
  const ora = formattaOra(turno.uscita)
  if (giornoRoma(turno.uscita) === giornoRoma(turno.entrata)) return ora
  return `${ora} del ${formattaData(turno.uscita)}`
}

function aggiungiGiorni(chiave: string, giorni: number): string {
  const d = new Date(`${chiave}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

// Predefinito il mese in corso: un report "pronto per il consulente del
// lavoro" quasi sempre riguarda un periodo di paga mensile, non l'intera
// storia da sempre. Resta comunque possibile scegliere un mese precedente
// o un intervallo personalizzato con i filtri qui sotto.
function intervalloMeseCorrente(): { dal: string; al: string } {
  const oggi = giornoRoma(new Date().toISOString())
  return { dal: `${oggi.slice(0, 7)}-01`, al: oggi }
}

// "YYYY-MM" -> "YYYY-MM" spostato di "delta" mesi (positivo o negativo).
function spostaMese(chiaveMese: string, delta: number): string {
  const [anno, mese] = chiaveMese.split('-').map(Number)
  const totale = anno * 12 + (mese - 1) + delta
  const nuovoAnno = Math.floor(totale / 12)
  const nuovoMese = (totale % 12) + 1
  return `${nuovoAnno}-${String(nuovoMese).padStart(2, '0')}`
}

function etichettaMese(chiaveMese: string): string {
  const testo = new Date(`${chiaveMese}-01T00:00:00`).toLocaleDateString('it-IT', {
    timeZone: 'Europe/Rome',
    month: 'long',
    year: 'numeric',
  })
  return testo.charAt(0).toUpperCase() + testo.slice(1)
}

// Ultimo giorno del mese, salvo per il mese in corso: li' ci si ferma ad
// oggi, non ha senso mostrare un intervallo che finisce nel futuro.
function fineMese(chiaveMese: string, oggi: string): string {
  if (chiaveMese === oggi.slice(0, 7)) return oggi
  return aggiungiGiorni(`${spostaMese(chiaveMese, 1)}-01`, -1)
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
function dataValida(v: string | undefined): v is string {
  return !!v && RE_DATA.test(v)
}

export async function TimbratureReport({
  searchParams,
}: {
  searchParams: { periodo?: string; dal?: string; al?: string; operatore?: string }
}) {
  const supabase = createSupabaseServiceClient()

  const predefinito = intervalloMeseCorrente()
  const oggi = giornoRoma(new Date().toISOString())
  const meseCorrente = oggi.slice(0, 7)
  const operatoreFiltro = searchParams.operatore ?? 'tutti'

  const emailCorrente = headers().get('x-tca-user-email')

  const [{ data: righe, error }, { data: staffAll }, { data: chiGuarda }] = await Promise.all([
    supabase.from('timbrature').select('id, email, tipo, created_at').order('created_at', { ascending: true }),
    supabase.from('staff_users').select('email, nome, cognome'),
    supabase.from('staff_users').select('puo_cancellare').eq('email', emailCorrente ?? '').maybeSingle(),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const puoCancellare = !!chiGuarda?.puo_cancellare
  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  function nomeOperatore(email: string): string {
    const s = mappaStaff.get(email)
    const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
    return nomeCompleto || email
  }

  const tuttiITurni = accoppiaTurni(righe ?? [])

  // Un mese per ogni voce della tendina, dal mese in corso indietro fino al
  // primo turno mai registrato (se non c'e' storico, resta solo il mese
  // corrente) - cosi' si sceglie un mese di paga con un tap, senza dover
  // impostare a mano le due date ogni volta.
  const primoMese = tuttiITurni.length > 0 ? giornoRoma(tuttiITurni[tuttiITurni.length - 1].entrata).slice(0, 7) : meseCorrente
  const opzioniMesi: string[] = []
  for (let cursore = meseCorrente; ; cursore = spostaMese(cursore, -1)) {
    opzioniMesi.push(cursore)
    if (cursore === primoMese || opzioniMesi.length > 240) break
  }

  const OPZIONI_PERIODO = [
    ...opzioniMesi.map((m) => ({ valore: m, etichetta: etichettaMese(m) })),
    { valore: 'custom', etichetta: 'Personalizzato' },
  ]

  const valoriPeriodoValidi = new Set<string>([...opzioniMesi, 'custom'])
  const periodo =
    searchParams.periodo && valoriPeriodoValidi.has(searchParams.periodo) ? searchParams.periodo : meseCorrente

  // Come per il range della Dashboard: basta una delle due date
  // personalizzate per applicare il filtro, l'altro estremo ricade sul
  // default invece di scartare tutta la selezione.
  let dal: string
  let al: string
  if (periodo === 'custom') {
    dal = dataValida(searchParams.dal) ? searchParams.dal : predefinito.dal
    al = dataValida(searchParams.al) ? searchParams.al : predefinito.al
    if (dal > al) {
      dal = predefinito.dal
      al = predefinito.al
    }
  } else {
    dal = `${periodo}-01`
    al = fineMese(periodo, oggi)
  }

  const turniFiltrati = tuttiITurni.filter((turno) => {
    const giorno = giornoRoma(turno.entrata)
    const dataOk = giorno >= dal && giorno <= al
    const operatoreOk = operatoreFiltro === 'tutti' || turno.email === operatoreFiltro
    return dataOk && operatoreOk
  })

  // Sempre in ordine alfabetico di cognome, come ogni altro elenco di operatori.
  const emailUniche = [...new Set(tuttiITurni.map((t) => t.email))]
    .map((email) => ({ email, ...mappaStaff.get(email) }))
    .sort(confrontaOperatori)
    .map((s) => s.email)
  const opzioniOperatori = [
    { valore: 'tutti', etichetta: 'Tutti gli operatori' },
    ...emailUniche.map((email) => ({ valore: email, etichetta: nomeOperatore(email) })),
  ]

  const minutiTotali = turniFiltrati.reduce((somma, t) => somma + (t.minuti ?? 0), 0)
  const turniInCorso = turniFiltrati.filter((t) => t.minuti === null).length

  const csvIntestazioni = ['Data', 'Operatore', 'Entrata', 'Uscita', 'Durata', 'Minuti']
  const csvRighe = turniFiltrati.map((t) => [
    formattaData(t.entrata),
    nomeOperatore(t.email),
    formattaOra(t.entrata),
    testoUscita(t, 'In corso'),
    formattaDurata(t.minuti),
    t.minuti ?? '',
  ])

  return (
    <div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Turni calcolati accoppiando ogni entrata con l'uscita successiva. Filtra per periodo e operatore, poi esporta
        in CSV: pronto per essere inviato al consulente del lavoro.
      </p>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Per dare a un dipendente accesso alla timbratura: <strong>Gestione utenti</strong> → apri la sua scheda →
            attiva «Timbra cartellino» tra le sezioni visibili.
          </li>
          <li>
            Filtra qui sotto per mese (di default quello in corso) o scegli «Personalizzato» per un intervallo di
            date a piacere, oltre che per operatore.
          </li>
          <li>
            La tabella mostra ogni turno con entrata, uscita e durata calcolata automaticamente; sotto, il totale ore
            del periodo filtrato.
          </li>
          <li>
            Se un turno è sbagliato (tipico: un'uscita dimenticata e timbrata giorni dopo, che fa risultare decine di
            ore), premi «Modifica» sulla riga e correggi data e ora di entrata e uscita, oppure cancella il turno.
            Ogni correzione resta tracciata nel registro attività, con il valore prima e dopo.
          </li>
          <li>
            Premi «Vedi anteprima report» per controllare le righe prima di scaricare, poi «Esporta CSV» per
            ottenere esattamente quei dati in un file che si apre correttamente in Excel, pronto da inviare al
            consulente del lavoro.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Un turno ancora senza uscita registrata appare come «In corso» ed è escluso dal totale ore, finché la
          persona non timbra l'uscita. Per vedere questa pagina serve lo stesso permesso di «Controllo Operatori»: di
          norma va lasciato solo a chi si occupa di amministrazione/paghe.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <div className="report-range-toolbar">
          <FiltroSelect valore={periodo} opzioni={OPZIONI_PERIODO} paramName="periodo" ariaLabel="Periodo report" />
          {periodo === 'custom' && <FiltroData dal={dal} al={al} />}
        </div>
        <FiltroSelect
          valore={operatoreFiltro}
          opzioni={opzioniOperatori}
          paramName="operatore"
          ariaLabel="Filtra per operatore"
        />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Operatore</th>
              <th>Entrata</th>
              <th>Uscita</th>
              <th>Durata</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {turniFiltrati.map((turno: Turno) => (
              <RigaTurno
                key={turno.idEntrata}
                idEntrata={turno.idEntrata}
                idUscita={turno.idUscita}
                dataTesto={formattaData(turno.entrata)}
                operatoreTesto={nomeOperatore(turno.email)}
                entrataTesto={formattaOra(turno.entrata)}
                uscitaTesto={testoUscita(turno, '—')}
                durataTesto={formattaDurata(turno.minuti)}
                entrataLocale={oraRomaLocale(turno.entrata)}
                uscitaLocale={turno.uscita ? oraRomaLocale(turno.uscita) : null}
                puoCancellare={puoCancellare}
                colonne={COLONNE_TABELLA}
              />
            ))}
          </tbody>
        </table>

        {turniFiltrati.length === 0 && <p className="empty-state">Nessun turno in questo periodo.</p>}
      </div>

      {turniFiltrati.length > 0 && (
        <div className="timbrature-riepilogo">
          <p className="muted">
            Totale nel periodo: <strong>{formattaDurata(minutiTotali)}</strong> su {turniFiltrati.length}{' '}
            {turniFiltrati.length === 1 ? 'turno' : 'turni'}
            {turniInCorso > 0 &&
              ` (${turniInCorso} ancora in corso, escluso dal totale finché non viene timbrata l'uscita)`}
            .
          </p>
          <div className="timbrature-riepilogo-azioni">
            <AnteprimaReport
              nomeFile={`timbrature_${dal}_${al}.csv`}
              titolo="Anteprima report timbrature"
              sottotitolo={`${periodo === 'custom' ? `Dal ${formattaData(dal)} al ${formattaData(al)}` : etichettaMese(periodo)} · ${operatoreFiltro === 'tutti' ? 'Tutti gli operatori' : nomeOperatore(operatoreFiltro)}`}
              intestazioni={csvIntestazioni}
              righe={csvRighe}
              riepilogo={`Totale nel periodo: ${formattaDurata(minutiTotali)} su ${turniFiltrati.length} ${turniFiltrati.length === 1 ? 'turno' : 'turni'}${turniInCorso > 0 ? ` (${turniInCorso} ancora in corso, escluso dal totale finché non viene timbrata l'uscita)` : ''}.`}
            />
            <EsportaCsv
              nomeFile={`timbrature_${dal}_${al}.csv`}
              intestazioni={csvIntestazioni}
              righe={csvRighe}
            />
          </div>
        </div>
      )}
    </div>
  )
}
