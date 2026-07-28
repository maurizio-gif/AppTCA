'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'

export async function invitaStaff(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) {
    redirect('/dashboard/utenti?error=Email+mancante')
  }

  const supabase = createSupabaseServiceClient()

  // Solo chi ha "puo_invitare" puo' invitare: controllo lato server, non solo
  // nascondere il form, altrimenti la Server Action resta chiamabile a mano.
  const chiamante = headers().get('x-tca-user-email')
  const { data: permesso } = await supabase
    .from('staff_users')
    .select('puo_invitare')
    .eq('email', chiamante ?? '')
    .maybeSingle()

  if (!permesso?.puo_invitare) {
    redirect('/dashboard/utenti?error=Non+hai+il+permesso+di+invitare+nuovi+utenti')
  }

  const { error: insertError } = await supabase.from('staff_users').upsert({ email })
  if (insertError) {
    redirect(`/dashboard/utenti?error=${encodeURIComponent(insertError.message)}`)
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

  // Stesso controllo di invitaStaff: solo chi ha gia' il permesso puo'
  // concederlo (o toglierlo) ad altri.
  const chiamante = headers().get('x-tca-user-email')
  const { data: permesso } = await supabase
    .from('staff_users')
    .select('puo_invitare')
    .eq('email', chiamante ?? '')
    .maybeSingle()

  if (!permesso?.puo_invitare) {
    throw new Error('Non hai il permesso di modificare i permessi degli altri utenti.')
  }

  const { error } = await supabase
    .from('staff_users')
    .update({ puo_invitare: puoInvitare })
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
