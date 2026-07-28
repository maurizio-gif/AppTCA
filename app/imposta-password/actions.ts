'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export async function impostaPassword(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  const cognome = String(formData.get('cognome') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const conferma = String(formData.get('conferma') ?? '')

  if (!nome || !cognome) {
    redirect('/imposta-password?error=Nome+e+cognome+sono+obbligatori')
  }
  if (password.length < 8) {
    redirect('/imposta-password?error=La+password+deve+avere+almeno+8+caratteri')
  }
  if (password !== conferma) {
    redirect('/imposta-password?error=Le+due+password+non+coincidono')
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect(`/imposta-password?error=${encodeURIComponent(error.message)}`)
  }

  // Il client "anon" del server non ha permesso di scrivere su staff_users
  // (RLS): serve il client service role, come nel resto dell'app.
  const supabaseService = createSupabaseServiceClient()
  const { error: staffError } = await supabaseService
    .from('staff_users')
    .update({ nome, cognome })
    .eq('email', user!.email!)

  if (staffError) {
    redirect(`/imposta-password?error=${encodeURIComponent(staffError.message)}`)
  }

  redirect('/dashboard')
}
