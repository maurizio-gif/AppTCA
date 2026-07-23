import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Segreteria TCA</h1>

      {searchParams.error === 'credenziali' && (
        <p style={{ color: '#8B1A1A' }}>Email o password errate.</p>
      )}
      {searchParams.error === 'non-autorizzato' && (
        <p style={{ color: '#8B1A1A' }}>Questo account non è abilitato al pannello.</p>
      )}

      <form action={login} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email
          <input name="email" type="email" required style={{ width: '100%' }} />
        </label>
        <label>
          Password
          <input name="password" type="password" required style={{ width: '100%' }} />
        </label>
        <button type="submit">Accedi</button>
      </form>
    </main>
  )
}
