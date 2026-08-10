'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { registraLog } from '@/lib/audit'

// Unica "sezione" gestita per ora: la tabella report_share_links e' gia'
// pensata per ospitare in futuro link condivisi anche per altri report,
// senza bisogno di una tabella per ognuno.
const SEZIONE = 'analytics'

type RisultatoLink = { ok: true; token: string } | { ok: false; errore: string }

// Legge il link attivo (non revocato) senza crearne uno nuovo: usata dalla
// pagina per mostrare subito lo stato corrente senza un giro client-side.
export async function getLinkCondiviso(): Promise<string | null> {
  if (!(await utenteHaSezione('analytics'))) return null

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('report_share_links')
    .select('token')
    .eq('sezione', SEZIONE)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.token ?? null
}

// Idempotente: se esiste gia' un link attivo lo restituisce invece di
// crearne un altro, cosi' cliccare piu' volte non invalida un link gia'
// condiviso col proprietario.
export async function generaLinkCondiviso(): Promise<RisultatoLink> {
  if (!(await utenteHaSezione('analytics'))) {
    return { ok: false, errore: 'Non hai accesso a questa sezione.' }
  }

  const esistente = await getLinkCondiviso()
  if (esistente) return { ok: true, token: esistente }

  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()
  const token = randomUUID()

  const { error } = await supabase
    .from('report_share_links')
    .insert({ sezione: SEZIONE, token, created_by: email })

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'analytics_link_generato', { entita: 'report_share_links' })
  revalidatePath('/dashboard/analytics')

  return { ok: true, token }
}

// Revoca il link attivo e ne crea subito uno nuovo: il vecchio smette di
// funzionare immediatamente (revoked_at valorizzato), non solo alla
// creazione del nuovo.
export async function rigeneraLinkCondiviso(): Promise<RisultatoLink> {
  if (!(await utenteHaSezione('analytics'))) {
    return { ok: false, errore: 'Non hai accesso a questa sezione.' }
  }

  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { error: erroreRevoca } = await supabase
    .from('report_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('sezione', SEZIONE)
    .is('revoked_at', null)

  if (erroreRevoca) return { ok: false, errore: erroreRevoca.message }

  const token = randomUUID()
  const { error: erroreInsert } = await supabase
    .from('report_share_links')
    .insert({ sezione: SEZIONE, token, created_by: email })

  if (erroreInsert) return { ok: false, errore: erroreInsert.message }

  await registraLog(email, 'analytics_link_rigenerato', { entita: 'report_share_links' })
  revalidatePath('/dashboard/analytics')

  return { ok: true, token }
}
