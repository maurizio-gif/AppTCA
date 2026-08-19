'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { SEZIONI } from '@/lib/auth/sezioni'
import { registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Solo chi ha "puo_invitare" puo' invitare o modificare i permessi altrui:
// controllo lato server, non solo nascondere i controlli in UI, altrimenti
// le Server Action restano chiamabili a mano bypassando il permesso.
async function chiamanteHaPermesso(
  supabase: ReturnType<typeof createSupabaseServiceClient>
): Promise<boolean> {
  const chiamante = headers().get('x-tca-user-email')
  const { data } = await supabase
    .from('staff_users')
    .select('puo_invitare')
    .eq('email', chiamante ?? '')
    .maybeSingle()

  return !!data?.puo_invitare
}

export async function invitaStaff(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const nome = String(formData.get('nome') ?? '').trim()
  const cognome = String(formData.get('cognome') ?? '').trim()

  if (!email || !nome || !cognome) {
    redirect(`/dashboard/utenti?error=${encodeURIComponent('Nome, cognome ed email sono obbligatori')}`)
  }

  // Controllo esplicito invece di scoprirlo dal link email: senza questa
  // variabile il redirectTo qui sotto diventa la stringa letterale
  // "undefined/auth/callback", Supabase non la trova in nessuna allowlist
  // e l'invito parte comunque ma con un link rotto (rimanda al Site URL
  // di fallback invece che al pannello).
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    redirect(
      `/dashboard/utenti?error=${encodeURIComponent(
        'NEXT_PUBLIC_SITE_URL non configurata su Vercel (Environment Variables, ambiente Production): il link di invito sarebbe rotto. Impostala e riprova.'
      )}`
    )
  }

  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    redirect('/dashboard/utenti?error=Non+hai+il+permesso+di+invitare+nuovi+utenti')
  }

  const { data: esistente } = await supabase
    .from('staff_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (esistente) {
    // Utente gia' presente (es. invito precedente scaduto, o stiamo solo
    // rimandando l'email): aggiorna nome/cognome ma non toccare permessi
    // e sezioni, che potrebbero essere stati personalizzati in seguito.
    const { error: updateError } = await supabase
      .from('staff_users')
      .update({ nome, cognome })
      .eq('email', email)
    if (updateError) {
      redirect(`/dashboard/utenti?error=${encodeURIComponent(updateError.message)}`)
    }
  } else {
    // Nuovo utente: per policy del club chi invitiamo parte con tutti i
    // diritti (puo' invitare altri e vede tutte le sezioni esistenti);
    // eventuali restrizioni si impostano dopo, dalla tabella qui sotto.
    const { error: insertError } = await supabase.from('staff_users').insert({
      email,
      nome,
      cognome,
      puo_invitare: true,
      sezioni_consentite: SEZIONI.map((s) => s.chiave),
    })
    if (insertError) {
      redirect(`/dashboard/utenti?error=${encodeURIComponent(insertError.message)}`)
    }
  }

  // Se l'utente Supabase Auth esiste gia' (es. era stato rimosso solo dalla
  // allowlist in passato), l'invito fallisce con "gia' registrato": va bene
  // cosi', e' comunque ora nella tabella staff_users e puo' accedere con la
  // password che ha gia'.
  // redirectTo esplicito: senza, Supabase usa il "Site URL" configurato sul
  // progetto (di default localhost:3000) e il link nell'email non arriva
  // mai al pannello vero. Richiede che NEXT_PUBLIC_SITE_URL sia anche nella
  // allowlist "Redirect URLs" di Supabase Auth (Authentication -> URL
  // Configuration), altrimenti Supabase lo ignora comunque.
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })
  if (inviteError && !/already been registered|already exists/i.test(inviteError.message)) {
    redirect(`/dashboard/utenti?error=${encodeURIComponent(inviteError.message)}`)
  }

  await registraLog(headers().get('x-tca-user-email'), 'utente_invitato', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email, nome, cognome },
  })

  revalidatePath('/dashboard/utenti')
  redirect('/dashboard/utenti?ok=1')
}

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action,
// quindi l'unico modo per far arrivare un messaggio leggibile al client e'
// restituirlo come dato normale (stesso criterio di
// app/dashboard/timbratura/actions.ts).
export async function impostaPuoInvitare(email: string, puoInvitare: boolean): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    return { ok: false, errore: 'Non hai il permesso di modificare i permessi degli altri utenti.' }
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ puo_invitare: puoInvitare })
    .eq('email', email)

  if (error) return { ok: false, errore: error.message }

  await registraLog(headers().get('x-tca-user-email'), 'permesso_invitare_modificato', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email, valore: puoInvitare },
  })

  revalidatePath('/dashboard/utenti')

  return { ok: true }
}

export async function impostaPuoCancellare(email: string, puoCancellare: boolean): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    return { ok: false, errore: 'Non hai il permesso di modificare i permessi degli altri utenti.' }
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ puo_cancellare: puoCancellare })
    .eq('email', email)

  if (error) return { ok: false, errore: error.message }

  await registraLog(headers().get('x-tca-user-email'), 'permesso_cancellare_modificato', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email, valore: puoCancellare },
  })

  revalidatePath('/dashboard/utenti')

  return { ok: true }
}

// Diritto di passare a un altro operatore un lead che non e' il proprio: chi
// ce l'ha in mano puo' sempre farlo, questo permesso serve a chi coordina
// (vedi lib/auth/permessi.ts).
export async function impostaPuoRiassegnare(email: string, puoRiassegnare: boolean): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    return { ok: false, errore: 'Non hai il permesso di modificare i permessi degli altri utenti.' }
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ puo_riassegnare: puoRiassegnare })
    .eq('email', email)

  if (error) return { ok: false, errore: error.message }

  await registraLog(headers().get('x-tca-user-email'), 'permesso_riassegnare_modificato', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email, valore: puoRiassegnare },
  })

  revalidatePath('/dashboard/utenti')

  return { ok: true }
}

export async function impostaSezioni(email: string, sezioni: string[]): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    return { ok: false, errore: 'Non hai il permesso di modificare le sezioni visibili agli altri utenti.' }
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ sezioni_consentite: sezioni })
    .eq('email', email)

  if (error) return { ok: false, errore: error.message }

  await registraLog(headers().get('x-tca-user-email'), 'sezioni_modificate', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email, sezioni },
  })

  revalidatePath('/dashboard/utenti')

  return { ok: true }
}

export async function rimuoviStaff(email: string): Promise<Risultato> {
  const supabaseServer = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (user?.email?.toLowerCase() === email.toLowerCase()) {
    return { ok: false, errore: 'Non puoi rimuovere il tuo stesso account.' }
  }

  const supabase = createSupabaseServiceClient()

  // Rimuove l'utente anche da Supabase Auth: se resta solo "invitato" li',
  // un nuovo invito alla stessa email fallisce con "already been
  // registered" (422) e non parte nessuna nuova email.
  const { data: elenco, error: elencoError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (elencoError) return { ok: false, errore: elencoError.message }

  const utenteAuth = elenco.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (utenteAuth) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(utenteAuth.id)
    if (deleteAuthError) return { ok: false, errore: deleteAuthError.message }
  }

  const { error } = await supabase.from('staff_users').delete().eq('email', email)
  if (error) return { ok: false, errore: error.message }

  await registraLog(user?.email, 'utente_rimosso', {
    entita: 'staff_users',
    entitaId: email,
    dettagli: { email_target: email },
  })

  revalidatePath('/dashboard/utenti')

  return { ok: true }
}
