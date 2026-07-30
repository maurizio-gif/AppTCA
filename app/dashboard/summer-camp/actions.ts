'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Stesso pattern di scuola-tennis/actions.ts: nessuna nota, serve solo
// sapere se l'iscrizione e' stata caricata su PerfectGym.
export async function impostaCaricatoPgm(id: string, caricato: boolean) {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('form_summer_camp')
    .update({
      caricato_pgm: caricato,
      caricato_pgm_da: caricato ? email : null,
      caricato_pgm_il: caricato ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/summer-camp')
}
