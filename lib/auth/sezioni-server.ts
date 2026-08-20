import { headers } from 'next/headers'
import type { SezioneChiave } from './sezioni'
import { rigaStaffCorrente } from './staff-server'

export async function getSezioniConsentite(email: string | null | undefined): Promise<string[]> {
  const riga = await rigaStaffCorrente(email)
  return riga?.sezioni_consentite ?? []
}

// Per le pagine sotto /dashboard: legge l'email gia' validata dal middleware
// (stesso header usato da isSegreteriaEmail) e controlla il permesso.
export async function utenteHaSezione(chiave: SezioneChiave): Promise<boolean> {
  const email = headers().get('x-tca-user-email')
  const sezioni = await getSezioniConsentite(email)
  return sezioni.includes(chiave)
}

// Nome e cognome impostati all'invito/primo accesso (vedi utenti/actions.ts
// e /imposta-password): usato per il badge utente nell'header, al posto
// della sola email.
export async function getNomeUtente(email: string | null | undefined): Promise<string | null> {
  const riga = await rigaStaffCorrente(email)
  const nomeCompleto = `${riga?.nome ?? ''} ${riga?.cognome ?? ''}`.trim()
  return nomeCompleto || null
}
