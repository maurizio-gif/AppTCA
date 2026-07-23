import { createBrowserClient } from '@supabase/ssr'

// Usato SOLO dalla pagina di login (client component) per chiamare
// supabase.auth.signInWithPassword. Non legge mai le tabelle dei form:
// con RLS attivo e nessuna policy, la anon key non potrebbe comunque farlo.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
