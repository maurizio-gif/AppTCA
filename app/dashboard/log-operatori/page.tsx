import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { VistaTabs } from '@/components/VistaTabs'
import { AttivitaLog } from './AttivitaLog'
import { TimbratureReport } from './TimbratureReport'

export const dynamic = 'force-dynamic'

export default async function LogOperatoriPage({
  searchParams,
}: {
  searchParams: { vista?: string; operatore?: string; azione?: string; periodo?: string; dal?: string; al?: string }
}) {
  if (!(await utenteHaSezione('log-operatori'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const vista = searchParams.vista === 'timbrature' ? 'timbrature' : 'attivita'

  return (
    <div>
      <div className="page-header">
        <h1>Controllo Operatori</h1>
      </div>

      <VistaTabs
        vista={vista}
        tabs={[
          { chiave: 'attivita', etichetta: 'Attività' },
          { chiave: 'timbrature', etichetta: 'Timbrature' },
        ]}
      />

      {vista === 'timbrature' ? (
        <TimbratureReport searchParams={searchParams} />
      ) : (
        <AttivitaLog searchParams={searchParams} />
      )}
    </div>
  )
}
