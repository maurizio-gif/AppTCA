import { cache } from 'react'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export type RigaStaff = {
  email: string
  nome: string | null
  cognome: string | null
  sezioni_consentite: string[]
  puo_invitare: boolean
  puo_riassegnare: boolean
  puo_cancellare: boolean
} | null

// La riga di staff_users dell'operatore corrente: chi puo' vedere cosa,
// amministrare, riassegnare, cancellare, il nome per l'intestazione. Prima
// ognuno di questi (allowlist, sezioni consentite, nome utente, i tre
// permessi booleani) la interrogava per conto suo - la stessa riga, la
// stessa email, fino a 5-6 round trip identici ad ogni pagina e ad ogni
// click sui pulsanti che controllano un permesso in una Server Action.
//
// cache() di React deduplica le chiamate con lo stesso argomento per la
// durata di una richiesta (o dell'esecuzione di una Server Action): con
// questa, tutte quelle letture diventano una sola query.
export const rigaStaffCorrente = cache(async (email: string | null | undefined): Promise<RigaStaff> => {
  const pulita = email?.trim().toLowerCase()
  if (!pulita) return null

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('staff_users')
    .select('email, nome, cognome, sezioni_consentite, puo_invitare, puo_riassegnare, puo_cancellare')
    .eq('email', pulita)
    .maybeSingle()

  return data as RigaStaff
})
