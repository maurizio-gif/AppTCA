'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'

export async function invitaStaff(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) {
    redirect('/dashboard/utenti?error=Email+mancante')
  }

  const supabase = createSupabaseServiceClient()

  const { error: insertError } = await supabase.from('staff_users').upsert({ email })
  if (insertError) {
    redirect(`/dashboard/utenti?error=${encodeURIComponent(insertError.message)}`)
  }

  // Se l'utente Supabase Auth esiste gia' (es. era stato rimosso solo dalla
  // allowlist in passato), l'invito fallisce con "gia' registrato": va bene
  // cosi', e' comunque ora nella tabella staff_users e puo' accedere con la
  // password che ha gia'.
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
  if (inviteError && !/already been registered|already exists/i.test(inviteError.message)) {
    redirect(`/dashboard/utenti?error=${encodeURIComponent(inviteError.message)}`)
  }

  revalidatePath('/dashboard/utenti')
  redirect('/dashboard/utenti?ok=1')
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
