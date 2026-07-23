// Elenco email autorizzate ad usare il pannello, in aggiunta al login
// Supabase Auth. Per iniziare basta questa costante; quando la lista
// cresce conviene spostarla in una tabella `staff_users` con RLS propria.
const SEGRETERIA_EMAILS = (process.env.SEGRETERIA_ALLOWLIST ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isSegreteriaEmail(email: string | null | undefined) {
  if (!email) return false
  return SEGRETERIA_EMAILS.includes(email.toLowerCase())
}
