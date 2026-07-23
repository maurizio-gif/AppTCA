import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { isSegreteriaEmail } from '@/lib/auth/allowlist'

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
    <div style={{ fontFamily: 'sans-serif' }}>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 24px',
          borderBottom: '1px solid #EBEBEB',
        }}
      >
        <Link href="/dashboard">Riepilogo</Link>
        <Link href="/dashboard/contatti">Form contatti</Link>
        <Link href="/dashboard/scuola-tennis">Scuola tennis</Link>
        <Link href="/dashboard/invita-amico">Invita un amico</Link>
        <Link href="/dashboard/iscrizioni-eventi">Iscrizioni eventi</Link>
        <span style={{ marginLeft: 'auto', color: '#555' }}>{user.email}</span>
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
