'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Chi ha gestito il contatto viene letto dall'header impostato dal
// middleware (gia' validato con Supabase Auth), mai da un valore passato
// dal client: cosi' non si puo' falsificare "gestito da" via devtools.
export async function impostaGestito(id: string, gestito: boolean) {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('form_contatti')
    .update({
      gestito,
      gestito_da: gestito ? email : null,
      gestito_il: gestito ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contatti')
}

export async function salvaNote(id: string, note: string) {
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.from('form_contatti').update({ note }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contatti')
}
