'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { SEZIONI } from '@/lib/auth/sezioni'

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

  revalidatePath('/dashboard/utenti')
  redirect('/dashboard/utenti?ok=1')
}

export async function impostaPuoInvitare(email: string, puoInvitare: boolean) {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    throw new Error('Non hai il permesso di modificare i permessi degli altri utenti.')
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ puo_invitare: puoInvitare })
    .eq('email', email)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/utenti')
}

export async function impostaSezioni(email: string, sezioni: string[]) {
  const supabase = createSupabaseServiceClient()

  if (!(await chiamanteHaPermesso(supabase))) {
    throw new Error('Non hai il permesso di modificare le sezioni visibili agli altri utenti.')
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ sezioni_consentite: sezioni })
    .eq('email', email)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/utenti')
}

export async function rimuoviStaff(email: string) {
  const supabaseServer = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (user?.email?.toLowerCase() === email.toLowerCase()) {
    throw new Error('Non puoi rimuovere il tuo stesso account.')
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.from('staff_users').delete().eq('email', email)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/utenti')
}
