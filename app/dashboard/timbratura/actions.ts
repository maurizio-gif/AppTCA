'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { dentroZona, ZONA_TIMBRATURA } from '@/lib/timbratura'

// La validazione della zona avviene SOLO qui, mai lato client: le
// coordinate arrivano dal browser dell'operatore e non ci si può fidare
// che siano genuine, ma il controllo serve comunque a scoraggiare timbri
// da fuori sede, non a garantirlo in modo assoluto (vedi lib/timbratura.ts).
// L'ora del timbro e' sempre quella del server (default now() in tabella),
// mai quella riportata dal client.
export async function registraTimbratura(tipo: 'entrata' | 'uscita', lat: number, lng: number) {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    throw new Error('Sessione non valida: ricarica la pagina e riprova.')
  }

  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('Coordinate non valide.')
  }

  const { dentro, distanza } = dentroZona(lat, lng)
  const distanzaArrotondata = Math.round(distanza)

  if (!dentro) {
    await registraLog(email, 'timbratura_rifiutata', {
      dettagli: { tipo, lat, lng, distanza_metri: distanzaArrotondata },
    })
    throw new Error(
      `Sei a circa ${distanzaArrotondata}m dal circolo (il limite è ${ZONA_TIMBRATURA.raggioMetri}m): il timbro non è stato registrato.`
    )
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.from('timbrature').insert({
    email,
    tipo,
    lat,
    lng,
    distanza_metri: distanzaArrotondata,
  })

  if (error) {
    throw new Error(error.message)
  }

  await registraLog(email, tipo === 'entrata' ? 'timbratura_entrata' : 'timbratura_uscita', {
    entita: 'timbrature',
    dettagli: { lat, lng, distanza_metri: distanzaArrotondata },
  })

  revalidatePath('/dashboard/timbratura')
}
