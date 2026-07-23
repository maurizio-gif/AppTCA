import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client "sessione utente" (anon key + cookie), usato SOLO per sapere
// CHI e' loggato (getUser/getSession) in Server Component e middleware.
// Non usarlo per leggere form_contatti/form_scuola_tennis/form_invita_amico:
// quelle tabelle non hanno policy per authenticated, restituirebbero righe vuote.
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // chiamato da un Server Component: il middleware si occupa
            // comunque di rinfrescare i cookie sulla request successiva.
          }
        },
      },
    }
  )
}
