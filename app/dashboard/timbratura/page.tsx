import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { formatDateOra } from '@/lib/format'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { TimbraCartellino } from './TimbraCartellino'

export const dynamic = 'force-dynamic'

const STORICO_LIMITE = 20

export default async function TimbraturaPage() {
  if (!(await utenteHaSezione('timbratura'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: storico, error } = await supabase
    .from('timbrature')
    .select('*')
    .eq('email', email ?? '')
    .order('created_at', { ascending: false })
    .limit(STORICO_LIMITE)

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Timbra cartellino</h1>
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        Il timbro viene registrato solo se ti trovi nella zona del circolo (via Feltre, Milano): il browser chiede il
        permesso di leggere la posizione, che viene verificata prima di salvare l'entrata o l'uscita.
      </p>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>All'arrivo al circolo, premi «Timbra entrata».</li>
          <li>
            Il browser chiede il permesso di leggere la posizione: concedilo (solo la prima volta). Senza questo
            permesso il timbro non può essere verificato.
          </li>
          <li>
            Se sei entro il raggio consentito, l'entrata viene registrata e resta in evidenza («In servizio — entrato
            alle...») finché non timbri l'uscita.
          </li>
          <li>A fine turno, premi «Timbra uscita»: arriva la conferma e sei pronto per un nuovo turno.</li>
        </ol>
        <p className="box-istruzioni-nota">
          Se sei troppo lontano dal circolo, il timbro non viene salvato: il messaggio ti dice a che distanza sei.
          Inoltre non puoi timbrare due entrate di fila, né un'uscita senza aver prima timbrato l'entrata: il
          pulsante non valido in quel momento è disattivato.
        </p>
      </BoxIstruzioni>

      <TimbraCartellino
        storico={(storico ?? []).map((r) => ({
          id: r.id,
          quando: formatDateOra(r.created_at),
          tipo: r.tipo,
          distanza: r.distanza_metri,
        }))}
      />
    </div>
  )
}
