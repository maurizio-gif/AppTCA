import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="login-shell">
      <div className="login-card">
        <h1 className="login-brand">
          <img src="/logo-tca.png" alt="TCA" className="brand-logo brand-logo-lg" />
          <span className="brand-suffix">CRM</span>
        </h1>

        {searchParams.error === 'credenziali' && (
          <p className="error-banner">Email o password errate.</p>
        )}
        {searchParams.error === 'non-autorizzato' && (
          <p className="error-banner">Questo account non è abilitato al pannello.</p>
        )}

        <form action={login}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-block">
            Accedi
          </button>
        </form>
      </div>
    </main>
  )
}
