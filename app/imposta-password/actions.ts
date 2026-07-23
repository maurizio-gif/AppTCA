'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/serverClient'

export async function impostaPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const conferma = String(formData.get('conferma') ?? '')

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

  redirect('/dashboard')
}
