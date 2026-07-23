import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Autorizzazione al pannello: tabella staff_users invece di una env var,
// cosi' aggiungere/rimuovere qualcuno si fa da /dashboard/utenti senza
// toccare Vercel ne' fare un redeploy.
export async function isSegreteriaEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('staff_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  return !!data
}
