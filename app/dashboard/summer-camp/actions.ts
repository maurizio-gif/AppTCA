'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Stesso pattern di scuola-tennis/actions.ts: nessuna nota, serve solo
// sapere se l'iscrizione e' stata caricata su PerfectGym. Risultato come
// valore di ritorno, non un throw: in produzione Next.js oscura sempre il
// messaggio di un errore lanciato da una Server Action.
export async function impostaCaricatoPgm(id: string, caricato: boolean): Promise<Risultato> {
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
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'summer_camp_caricato_pgm', {
    entita: 'form_summer_camp',
    entitaId: id,
    dettagli: { caricato },
  })

  revalidatePath('/dashboard/summer-camp')

  return { ok: true }
}
