import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { formatDateOra } from '@/lib/format'
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

  // Se l'ultimo timbro e' un'entrata senza uscita, il prossimo passo
  // naturale e' l'uscita, e viceversa: solo un suggerimento visivo (il
  // pulsante piu' in evidenza), non un vincolo - resta possibile timbrare
  // in qualsiasi ordine se ci si e' scordati di farlo.
  const ultimoTipo = storico?.[0]?.tipo ?? null
  const suggerita = ultimoTipo === 'entrata' ? 'uscita' : 'entrata'

  return (
    <div>
      <div className="page-header">
        <h1>Timbra cartellino</h1>
      </div>

      <p className="muted" style={{ marginBottom: 20 }}>
        Il timbro viene registrato solo se ti trovi nella zona del circolo (via Feltre, Milano): il browser chiede il
        permesso di leggere la posizione, che viene verificata prima di salvare l'entrata o l'uscita.
      </p>

      <TimbraCartellino
        suggerita={suggerita}
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
