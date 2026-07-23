import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isSegreteriaEmail } from '@/lib/auth/allowlist'
import { Sidebar } from './Sidebar'

// Il middleware ha gia' verificato la sessione con getUser() (chiamata di
// rete a Supabase Auth) e ci passa l'email gia' validata via header: non la
// richiediamo di nuovo qui, altrimenti ogni pagina del dashboard pagherebbe
// due volte lo stesso round-trip di rete. Qui controlliamo solo l'allowlist
// segreteria, cosi' un utente Supabase Auth "generico" non vede i dati anche
// se autenticato.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const email = headers().get('x-tca-user-email')

  if (!email || !(await isSegreteriaEmail(email))) {
    redirect('/login?error=non-autorizzato')
  }

  return (
    <div className="app-shell">
      <Sidebar email={email} />
      <main className="main-content">{children}</main>
    </div>
  )
}
