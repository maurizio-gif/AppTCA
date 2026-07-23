import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { impostaPassword } from './actions'

export default async function ImpostaPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <h1>Imposta la password</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Ciao {user.email}, scegli una password per accedere al pannello.
        </p>

        {searchParams.error && <p className="error-banner">{searchParams.error}</p>}

        <form action={impostaPassword}>
          <div className="field">
            <label htmlFor="password">Nuova password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label htmlFor="conferma">Conferma password</label>
            <input
              id="conferma"
              name="conferma"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-block">
            Salva e accedi
          </button>
        </form>
      </div>
    </main>
  )
}
