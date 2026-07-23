'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Valori di esempio: allineali a quelli che il workflow n8n scrive
// davvero nella colonna "stato" di form_contatti.
const STATI_VALIDI = ['nuovo', 'in_lavorazione', 'contattato', 'chiuso']

export async function aggiornaStato(id: string, nuovoStato: string) {
  if (!STATI_VALIDI.includes(nuovoStato)) {
    throw new Error(`Stato non valido: ${nuovoStato}`)
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('form_contatti')
    .update({ stato: nuovoStato })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contatti')
}
