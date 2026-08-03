'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action
// (non distingue un messaggio "sicuro" da uno sensibile), quindi l'unico
// modo per far arrivare un messaggio leggibile al client e' restituirlo
// come dato normale (stesso criterio di app/dashboard/timbratura/actions.ts).
//
// Chi ha gestito il contatto viene letto dall'header impostato dal
// middleware (gia' validato con Supabase Auth), mai da un valore passato
// dal client: cosi' non si puo' falsificare "gestito da" via devtools.
export async function impostaGestito(id: string, gestito: boolean): Promise<Risultato> {
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

    if (fetchError) return { ok: false, errore: fetchError.message }
    if (!contatto?.note?.trim()) {
      return { ok: false, errore: 'Aggiungi e salva una nota prima di segnare il contatto come gestito.' }
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
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'contatto_gestito', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: { gestito },
  })

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')

  return { ok: true }
}

export async function salvaNote(id: string, note: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.from('form_contatti').update({ note }).eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  // Il testo della nota non entra nei "dettagli" del log: duplicherebbe
  // dati del contatto (potenzialmente sensibili) in un'altra tabella senza
  // un reale bisogno, basta sapere chi e quando ha aggiornato la nota.
  await registraLog(email, 'contatto_nota_salvata', { entita: 'form_contatti', entitaId: id })

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')

  return { ok: true }
}

// Verifica lato server (non solo lato UI, altrimenti la Server Action resta
// chiamabile a mano bypassando il permesso): solo chi ha "puo_cancellare"
// puo' cancellare definitivamente un contatto.
export async function eliminaContatto(id: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: chiamante } = await supabase
    .from('staff_users')
    .select('puo_cancellare')
    .eq('email', email ?? '')
    .maybeSingle()

  if (!chiamante?.puo_cancellare) {
    return { ok: false, errore: 'Non hai il permesso di cancellare i record.' }
  }

  const { error } = await supabase.from('form_contatti').delete().eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'contatto_cancellato', { entita: 'form_contatti', entitaId: id })

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')

  return { ok: true }
}
