import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { SezioneChiave } from './sezioni'

export async function getSezioniConsentite(email: string | null | undefined): Promise<string[]> {
  if (!email) return []

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('staff_users')
    .select('sezioni_consentite')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  return data?.sezioni_consentite ?? []
}

// Per le pagine sotto /dashboard: legge l'email gia' validata dal middleware
// (stesso header usato da isSegreteriaEmail) e controlla il permesso.
export async function utenteHaSezione(chiave: SezioneChiave): Promise<boolean> {
  const email = headers().get('x-tca-user-email')
  const sezioni = await getSezioniConsentite(email)
  return sezioni.includes(chiave)
}
