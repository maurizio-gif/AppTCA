import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { isSegreteriaEmail } from '@/lib/auth/allowlist'
import { Sidebar } from './Sidebar'

// Il middleware ha gia' verificato che esista una sessione; qui verifichiamo
// anche che l'email sia nell'allowlist segreteria, cosi' un utente Supabase
// Auth "generico" non puo' vedere i dati anche se autenticato.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isSegreteriaEmail(user.email)) {
    redirect('/login?error=non-autorizzato')
  }

  return (
    <div className="app-shell">
      <Sidebar email={user.email ?? ''} />
      <main className="main-content">{children}</main>
    </div>
  )
}
