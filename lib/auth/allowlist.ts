import { rigaStaffCorrente } from './staff-server'

// Autorizzazione al pannello: tabella staff_users invece di una env var,
// cosi' aggiungere/rimuovere qualcuno si fa da /dashboard/utenti senza
// toccare Vercel ne' fare un redeploy.
export async function isSegreteriaEmail(email: string | null | undefined): Promise<boolean> {
  return !!(await rigaStaffCorrente(email))
}
