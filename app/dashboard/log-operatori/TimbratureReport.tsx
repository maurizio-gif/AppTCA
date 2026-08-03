import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { FiltroSelect } from '@/components/FiltroSelect'
import { FiltroData } from '@/components/FiltroData'
import { EsportaCsv } from '@/components/EsportaCsv'
import { accoppiaTurni, formattaDurata, giornoRoma, type Turno } from '@/lib/timbratura'

function formattaOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })
}

function formattaData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
}

// Predefinito il mese in corso: un report "pronto per il consulente del
// lavoro" quasi sempre riguarda un periodo di paga mensile, non l'intera
// storia da sempre. Resta comunque possibile allargare l'intervallo con i
// due filtri data.
function intervalloMeseCorrente(): { dal: string; al: string } {
  const oggi = giornoRoma(new Date().toISOString())
  return { dal: `${oggi.slice(0, 7)}-01`, al: oggi }
}

export async function TimbratureReport({
  searchParams,
}: {
  searchParams: { dal?: string; al?: string; operatore?: string }
}) {
  const supabase = createSupabaseServiceClient()

  const predefinito = intervalloMeseCorrente()
  const dal = searchParams.dal ?? predefinito.dal
  const al = searchParams.al ?? predefinito.al
  const operatoreFiltro = searchParams.operatore ?? 'tutti'

  const [{ data: righe, error }, { data: staffAll }] = await Promise.all([
    supabase.from('timbrature').select('email, tipo, created_at').order('created_at', { ascending: true }),
    supabase.from('staff_users').select('email, nome, cognome'),
  ])

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const mappaStaff = new Map((staffAll ?? []).map((s) => [s.email, s]))
  function nomeOperatore(email: string): string {
    const s = mappaStaff.get(email)
    const nomeCompleto = s ? `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() : ''
    return nomeCompleto || email
  }

  const tuttiITurni = accoppiaTurni(righe ?? [])

  const turniFiltrati = tuttiITurni.filter((turno) => {
    const giorno = giornoRoma(turno.entrata)
    const dataOk = giorno >= dal && giorno <= al
    const operatoreOk = operatoreFiltro === 'tutti' || turno.email === operatoreFiltro
    return dataOk && operatoreOk
  })

  const emailUniche = [...new Set(tuttiITurni.map((t) => t.email))].sort()
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
    t.uscita ? formattaOra(t.uscita) : 'In corso',
    formattaDurata(t.minuti),
    t.minuti ?? '',
  ])

  return (
    <div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Turni calcolati accoppiando ogni entrata con l'uscita successiva. Filtra per periodo e operatore, poi esporta
        in CSV: pronto per essere inviato al consulente del lavoro.
      </p>

      <div className="filtri-toolbar">
        <FiltroData dal={dal} al={al} />
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
            </tr>
          </thead>
          <tbody>
            {turniFiltrati.map((turno: Turno, i) => (
              <tr key={`${turno.email}-${turno.entrata}-${i}`}>
                <td data-label="Data">{formattaData(turno.entrata)}</td>
                <td data-label="Operatore">{nomeOperatore(turno.email)}</td>
                <td data-label="Entrata">{formattaOra(turno.entrata)}</td>
                <td data-label="Uscita">{turno.uscita ? formattaOra(turno.uscita) : '—'}</td>
                <td data-label="Durata">{formattaDurata(turno.minuti)}</td>
              </tr>
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
          <EsportaCsv
            nomeFile={`timbrature_${dal}_${al}.csv`}
            intestazioni={csvIntestazioni}
            righe={csvRighe}
          />
        </div>
      )}
    </div>
  )
}
