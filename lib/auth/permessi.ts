import { rigaStaffCorrente } from './staff-server'

// "Amministratore" nel CRM e' chi ha puo_invitare: e' il permesso che in
// Gestione utenti da' anche il diritto di cambiare i permessi altrui,
// quindi e' lo stesso profilo che deve poter riassegnare o riaprire un lead
// preso in carico da qualcun altro. Se un giorno i due ruoli andranno
// distinti basta aggiungere una colonna a staff_users e cambiare qui: le
// chiamate sono tutte dietro questa funzione.
//
// Server-only (usa il client service role): importare solo da Server
// Action/Server Component, mai da un file "use client".
export async function puoAmministrare(email: string | null | undefined): Promise<boolean> {
  return !!(await rigaStaffCorrente(email))?.puo_invitare
}

// Diritto di passare a un altro operatore un'opportunita' che non e' la propria
// (colonna puo_riassegnare, assegnabile da Gestione utenti). Chi ce l'ha in mano
// puo' sempre passarla: il controllo serve per tutte le altre.
export async function puoRiassegnare(email: string | null | undefined): Promise<boolean> {
  return !!(await rigaStaffCorrente(email))?.puo_riassegnare
}

// Diritto di cancellare definitivamente un record (colonna puo_cancellare).
export async function puoCancellare(email: string | null | undefined): Promise<boolean> {
  return !!(await rigaStaffCorrente(email))?.puo_cancellare
}
