'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action (non
// distingue un messaggio "sicuro" da uno sensibile), quindi l'unico modo per
// far arrivare un messaggio leggibile al client e' restituirlo come dato
// normale (stesso criterio di app/dashboard/timbratura/actions.ts).
//
// Lo stato di lavorazione non e' piu' qui: sta sull'opportunita' della persona
// (vedi app/dashboard/opportunita/actions.ts). Della singola richiesta restano
// la nota e la cancellazione.
export async function salvaNote(id: string, note: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: contatto } = await supabase
    .from('form_contatti')
    .select('nome, cognome, email')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('form_contatti').update({ note }).eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  // Il testo della nota entra nel log insieme al nome del contatto: e' la
  // sostanza dell'azione, e in Controllo Operatori serve poter verificare
  // cosa e' stato scritto senza dover aprire il contatto (che nel
  // frattempo puo' essere stato modificato o cancellato).
  await registraLog(email, 'contatto_nota_salvata', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(contatto), email_contatto: contatto?.email ?? null, nota: note },
  })

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
  // Gli appuntamenti compaiono anche nell'agenda condivisa, dove si
  // gestiscono con questo stesso pannello (vedi lib/agenda.ts).
  revalidatePath('/dashboard/agenda')

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

  // Il contatto intero si legge PRIMA di cancellarlo e finisce nel log:
  // dopo la delete non esiste piu' nulla da consultare, e un registro che
  // dice solo "cancellato il contatto <id>" non permette di verificare
  // cosa e' stato buttato via.
  const { data: record } = await supabase.from('form_contatti').select('*').eq('id', id).maybeSingle()

  const { error } = await supabase.from('form_contatti').delete().eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'contatto_cancellato', {
    entita: 'form_contatti',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(record),
      email_contatto: (record?.email as string | null) ?? null,
      record_cancellato: record ?? null,
    },
  })

  revalidatePath('/dashboard/contatti/adulti')
  revalidatePath('/dashboard/contatti/junior')
  // Gli appuntamenti compaiono anche nell'agenda condivisa, dove si
  // gestiscono con questo stesso pannello (vedi lib/agenda.ts).
  revalidatePath('/dashboard/agenda')

  return { ok: true }
}
