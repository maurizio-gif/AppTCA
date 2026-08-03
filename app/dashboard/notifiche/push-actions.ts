'use server'

import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

type Risultato = { ok: true } | { ok: false; errore: string }

type SottoscrizioneClient = { endpoint: string; keys: { p256dh: string; auth: string } }

// Una riga per dispositivo (endpoint univoco per browser/device), non per
// utente: la stessa persona puo' attivare le notifiche sia sul telefono sia
// sul PC e riceverle su entrambi.
export async function salvaSottoscrizionePush(sottoscrizione: SottoscrizioneClient): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    return { ok: false, errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  }

  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      email,
      endpoint: sottoscrizione.endpoint,
      p256dh: sottoscrizione.keys.p256dh,
      auth: sottoscrizione.keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    return { ok: false, errore: error.message }
  }

  return { ok: true }
}

export async function rimuoviSottoscrizionePush(endpoint: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    return { ok: false, errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  }

  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('email', email)

  if (error) {
    return { ok: false, errore: error.message }
  }

  return { ok: true }
}
