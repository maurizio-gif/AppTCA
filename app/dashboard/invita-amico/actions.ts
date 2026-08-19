'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'

type Risultato = { ok: true } | { ok: false; errore: string }

// Il credito da riconoscere al socio che ha invitato: adempimento dei soli
// referral, non uno stato della pipeline (vedi lib/pipeline.ts). Finche' non
// e' caricato, un invito vinto resta in evidenza nella sezione: e' il modo per
// non perdere il credito di un socio.
//
// Stesso pattern del toggle "Caricato su PerfectGym" (scuola-tennis/actions.ts):
// nessuna nota, chi lo fa viene letto dall'header del middleware e il
// risultato torna come valore, perche' in produzione Next.js oscura i
// messaggi degli errori lanciati da una Server Action.
export async function impostaCreditoCaricato(id: string, caricato: boolean): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: invito, error: fetchError } = await supabase
    .from('form_invita_amico')
    .select('amico_nome, amico_cognome, amico_email, email_socio, stato')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!invito) return { ok: false, errore: 'Invito non trovato: forse è stato cancellato.' }

  // Il controllo va rifatto qui e non solo nella UI (che il toggle non lo
  // mostra affatto): una Server Action resta chiamabile a mano. Il credito
  // esiste solo se il referral e' stato vinto.
  if (caricato && invito.stato !== 'vinto') {
    return { ok: false, errore: 'Il credito si carica solo su un referral vinto.' }
  }

  const { error } = await supabase
    .from('form_invita_amico')
    .update({
      credito_caricato: caricato,
      credito_caricato_da: caricato ? email : null,
      credito_caricato_il: caricato ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'invito_amico_credito_caricato', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: {
      caricato,
      contatto: etichettaRecord(invito),
      email_contatto: invito.amico_email ?? null,
      socio: invito.email_socio ?? null,
    },
  })

  revalidatePath('/dashboard/invita-amico')
  revalidatePath('/dashboard')

  return { ok: true }
}
