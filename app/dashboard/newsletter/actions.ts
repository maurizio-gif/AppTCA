'use server'

import { headers } from 'next/headers'
import { registraLog } from '@/lib/audit'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { caricaContenutiSito, type ContenutiSito } from '@/lib/newsletter'

type RisultatoContenuti = { ok: true; contenuti: ContenutiSito } | { ok: false; errore: string }

// Rilettura del feed del sito saltando la cache: serve quando il marketing
// pubblica una news e vuole comporla subito, senza aspettare la scadenza
// della cache (vedi FEED_TTL_MS in lib/newsletter.ts).
//
// Il controllo di sezione va rifatto qui e non solo nella pagina: una Server
// Action resta chiamabile a mano anche da chi non vede la voce nel menu.
export async function ricaricaContenutiSito(): Promise<RisultatoContenuti> {
  if (!(await utenteHaSezione('newsletter'))) {
    return { ok: false, errore: 'Non hai accesso a questa sezione.' }
  }

  try {
    const contenuti = await caricaContenutiSito({ ignoraCache: true })
    return { ok: true, contenuti }
  } catch (e) {
    // In produzione Next.js oscura i messaggi degli errori lanciati da una
    // Server Action: il motivo torna come valore, non come eccezione.
    const motivo = e instanceof Error ? e.message : 'errore sconosciuto'
    return { ok: false, errore: `Contenuti del sito non raggiungibili (${motivo}).` }
  }
}

// Traccia chi ha preparato una newsletter e con quante voci: l'email viene
// poi spedita da un'altra piattaforma, quindi questo e' l'unico punto in cui
// resta scritto nel CRM che quel template e' stato prodotto (e da chi).
export async function registraNewsletterGenerata(oggetto: string, blocchi: number): Promise<void> {
  if (!(await utenteHaSezione('newsletter'))) return

  const email = headers().get('x-tca-user-email')
  await registraLog(email, 'newsletter_generata', {
    entita: 'newsletter',
    dettagli: { oggetto: oggetto.slice(0, 200), blocchi },
  })
}
