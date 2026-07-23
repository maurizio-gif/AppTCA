import { redirect } from 'next/navigation'

// Non esisteva una pagina per "/": chi visitava la root vedeva il 404
// di Next.js. La segreteria entra sempre da qui e finisce su /login
// (o dritta in /dashboard se ha gia' una sessione valida, grazie al middleware).
export default function RootPage() {
  redirect('/dashboard')
}
