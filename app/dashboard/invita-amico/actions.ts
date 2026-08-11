'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Stessa logica di gestione di app/dashboard/contatti/actions.ts, adattata a
// form_invita_amico: un invito puo' passare a "gestito" solo se ha gia' una
// nota salvata, e chi lo ha gestito viene letto dall'header impostato dal
// middleware, mai da un valore passato dal client.
export async function impostaGestito(id: string, gestito: boolean): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()

  // Come per i contatti: l'invito si legge sempre, cosi' nel log finisce
  // anche il nome dell'amico invitato e non solo l'id.
  const { data: invito, error: fetchError } = await supabase
    .from('form_invita_amico')
    .select('amico_nome, amico_cognome, amico_email, note')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }

  if (gestito && !invito?.note?.trim()) {
    return { ok: false, errore: "Aggiungi e salva una nota prima di segnare l'invito come gestito." }
  }

  const email = headers().get('x-tca-user-email')

  const { error } = await supabase
    .from('form_invita_amico')
    .update({
      gestito,
      gestito_da: gestito ? email : null,
      gestito_il: gestito ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'invito_amico_gestito', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: { gestito, contatto: etichettaRecord(invito), email_contatto: invito?.amico_email ?? null },
  })

  revalidatePath('/dashboard/invita-amico')

  return { ok: true }
}

export async function salvaNote(id: string, note: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: invito } = await supabase
    .from('form_invita_amico')
    .select('amico_nome, amico_cognome, amico_email')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('form_invita_amico').update({ note }).eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  // Testo della nota e nome nel log: vedi contatti/actions.ts.
  await registraLog(email, 'invito_amico_nota_salvata', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(invito), email_contatto: invito?.amico_email ?? null, nota: note },
  })

  revalidatePath('/dashboard/invita-amico')

  return { ok: true }
}
