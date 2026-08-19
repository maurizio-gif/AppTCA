import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// "Amministratore" nel CRM e' chi ha puo_invitare: e' il permesso che in
// Gestione utenti da' anche il diritto di cambiare i permessi altrui,
// quindi e' lo stesso profilo che deve poter riassegnare o riaprire un lead
// preso in carico da qualcun altro. Se un giorno i due ruoli andranno
// distinti basta aggiungere una colonna a staff_users e cambiare qui: le
// chiamate sono tutte dietro questa funzione.
//
// Server-only (usa il client service role): importare solo da Server
// Action/Server Component, mai da un file "use client".
export async function puoAmministrare(email: string | null | undefined): Promise<boolean> {
  if (!email) return false

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('staff_users')
    .select('puo_invitare')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  return !!data?.puo_invitare
}
