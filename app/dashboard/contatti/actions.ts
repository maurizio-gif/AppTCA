'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Chi ha gestito il contatto viene letto dall'header impostato dal
// middleware (gia' validato con Supabase Auth), mai da un valore passato
// dal client: cosi' non si puo' falsificare "gestito da" via devtools.
export async function impostaGestito(id: string, gestito: boolean) {
  const supabase = createSupabaseServiceClient()

  // Verifica lato server (non solo lato UI, altrimenti la Server Action
  // resta chiamabile a mano bypassando il controllo): un contatto puo'
  // passare a "gestito" solo se ha gia' una nota salvata.
  if (gestito) {
    const { data: contatto, error: fetchError } = await supabase
      .from('form_contatti')
      .select('note')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!contatto?.note?.trim()) {
      throw new Error('Aggiungi e salva una nota prima di segnare il contatto come gestito.')
    }
  }

  const email = headers().get('x-tca-user-email')

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

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
}

export async function salvaNote(id: string, note: string) {
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.from('form_contatti').update({ note }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
}

// Verifica lato server (non solo lato UI, altrimenti la Server Action resta
// chiamabile a mano bypassando il permesso): solo chi ha "puo_cancellare"
// puo' cancellare definitivamente un contatto.
export async function eliminaContatto(id: string) {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: chiamante } = await supabase
    .from('staff_users')
    .select('puo_cancellare')
    .eq('email', email ?? '')
    .maybeSingle()

  if (!chiamante?.puo_cancellare) {
    throw new Error('Non hai il permesso di cancellare i record.')
  }

  const { error } = await supabase.from('form_contatti').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
}
