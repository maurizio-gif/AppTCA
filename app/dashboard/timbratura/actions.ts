'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { dentroZona, ZONA_TIMBRATURA } from '@/lib/timbratura'

type RisultatoTimbratura = { ok: true; quando: string; distanza: number } | { ok: false; errore: string }

// La validazione della zona avviene SOLO qui, mai lato client: le
// coordinate arrivano dal browser dell'operatore e non ci si può fidare
// che siano genuine, ma il controllo serve comunque a scoraggiare timbri
// da fuori sede, non a garantirlo in modo assoluto (vedi lib/timbratura.ts).
// L'ora del timbro e' sempre quella del server (default now() in tabella),
// mai quella riportata dal client.
//
// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action
// (non distingue un messaggio "sicuro" da uno sensibile), quindi l'unico
// modo per far arrivare un messaggio leggibile al client e' restituirlo
// come dato normale.
export async function registraTimbratura(
  tipo: 'entrata' | 'uscita',
  lat: number,
  lng: number
): Promise<RisultatoTimbratura> {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    return { ok: false, errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  }

  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, errore: 'Coordinate non valide.' }
  }

  const supabase = createSupabaseServiceClient()

  // La sequenza entrata -> uscita -> entrata -> ... si verifica sempre
  // lato server, mai fidandosi dello stato mostrato dal client (potrebbe
  // essere desincronizzato, es. due dispositivi aperti insieme): un'uscita
  // richiede che l'ultima timbratura registrata sia un'entrata ancora
  // "aperta", e un'entrata richiede che non ce ne sia gia' una aperta.
  const { data: ultima, error: ultimaError } = await supabase
    .from('timbrature')
    .select('tipo')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultimaError) {
    return { ok: false, errore: ultimaError.message }
  }

  const inServizio = ultima?.tipo === 'entrata'

  if (tipo === 'entrata' && inServizio) {
    return { ok: false, errore: "Hai già timbrato l'entrata: timbra l'uscita prima di una nuova entrata." }
  }
  if (tipo === 'uscita' && !inServizio) {
    return { ok: false, errore: "Devi prima timbrare l'entrata." }
  }

  const { dentro, distanza } = dentroZona(lat, lng)
  const distanzaArrotondata = Math.round(distanza)

  if (!dentro) {
    await registraLog(email, 'timbratura_rifiutata', {
      dettagli: { tipo, lat, lng, distanza_metri: distanzaArrotondata },
    })
    return {
      ok: false,
      errore: `Sei a circa ${distanzaArrotondata}m dal circolo (il limite è ${ZONA_TIMBRATURA.raggioMetri}m): il timbro non è stato registrato.`,
    }
  }

  const { data: riga, error } = await supabase
    .from('timbrature')
    .insert({ email, tipo, lat, lng, distanza_metri: distanzaArrotondata })
    .select('created_at')
    .single()

  if (error || !riga) {
    return { ok: false, errore: error?.message ?? 'Errore durante il salvataggio.' }
  }

  await registraLog(email, tipo === 'entrata' ? 'timbratura_entrata' : 'timbratura_uscita', {
    entita: 'timbrature',
    dettagli: { lat, lng, distanza_metri: distanzaArrotondata },
  })

  revalidatePath('/dashboard/timbratura')

  return { ok: true, quando: riga.created_at, distanza: distanzaArrotondata }
}
