'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { registraLog } from '@/lib/audit'
import { BUCKET_ALLEGATI_NOTIFICHE, DIMENSIONE_MASSIMA_ALLEGATO, TIPI_ALLEGATO_CONSENTITI } from '@/lib/allegati'

type Risultato = { ok: true } | { ok: false; errore: string }

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action
// (stesso criterio di app/dashboard/timbratura/actions.ts).

// FormData (non argomenti separati) perche' serve poter allegare un file:
// una Server Action puo' ricevere un File solo dentro un FormData.
// Una riga per destinatario, cosi' ognuno ha il proprio stato di lettura
// indipendente (letta_il), anche se messaggio e allegato sono gli stessi.
export async function inviaNotifica(formData: FormData): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    return { ok: false, errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  }

  const testo = String(formData.get('messaggio') ?? '').trim()
  if (!testo) {
    return { ok: false, errore: 'Scrivi un messaggio prima di inviarlo.' }
  }

  const destinatariUnici = [...new Set(formData.getAll('destinatari').map(String).filter(Boolean))]
  if (destinatariUnici.length === 0) {
    return { ok: false, errore: 'Seleziona almeno un destinatario.' }
  }

  const file = formData.get('allegato')
  const allegato = file instanceof File && file.size > 0 ? file : null

  if (allegato) {
    if (!TIPI_ALLEGATO_CONSENTITI[allegato.type]) {
      return { ok: false, errore: 'Tipo di file non supportato. Sono ammessi: JPG, PNG, PDF, Word, Excel.' }
    }
    if (allegato.size > DIMENSIONE_MASSIMA_ALLEGATO) {
      return { ok: false, errore: 'Il file supera la dimensione massima di 5 MB.' }
    }
  }

  const supabase = createSupabaseServiceClient()

  let allegatoPath: string | null = null
  if (allegato) {
    allegatoPath = `${email}/${randomUUID()}${TIPI_ALLEGATO_CONSENTITI[allegato.type]}`
    const { error: erroreUpload } = await supabase.storage
      .from(BUCKET_ALLEGATI_NOTIFICHE)
      .upload(allegatoPath, allegato, { contentType: allegato.type })

    if (erroreUpload) {
      return { ok: false, errore: erroreUpload.message }
    }
  }

  const { error } = await supabase.from('notifiche').insert(
    destinatariUnici.map((a_email) => ({
      da_email: email,
      a_email,
      messaggio: testo,
      allegato_path: allegatoPath,
      allegato_nome: allegato?.name ?? null,
      allegato_tipo: allegato?.type ?? null,
      allegato_dimensione: allegato?.size ?? null,
    }))
  )

  if (error) {
    if (allegatoPath) {
      await supabase.storage.from(BUCKET_ALLEGATI_NOTIFICHE).remove([allegatoPath])
    }
    return { ok: false, errore: error.message }
  }

  // Il testo del messaggio non entra nei "dettagli" del log: stesso criterio
  // delle note dei contatti, non serve duplicarlo in un'altra tabella.
  await registraLog(email, 'notifica_inviata', {
    entita: 'notifiche',
    dettagli: { destinatari: destinatariUnici, allegato: allegato?.name ?? null },
  })

  revalidatePath('/dashboard/notifiche')

  return { ok: true }
}

// Verifica lato server che la notifica sia davvero indirizzata a chi
// chiama, non solo lato UI: altrimenti chiunque potrebbe confermare la
// lettura di un messaggio non suo passando un id a caso.
export async function confermaLettura(id: number): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  if (!email) {
    return { ok: false, errore: 'Sessione non valida: ricarica la pagina e riprova.' }
  }

  const supabase = createSupabaseServiceClient()

  const { data: riga } = await supabase.from('notifiche').select('a_email, letta_il').eq('id', id).maybeSingle()

  if (!riga || riga.a_email !== email) {
    return { ok: false, errore: 'Notifica non trovata.' }
  }

  if (!riga.letta_il) {
    const { error } = await supabase
      .from('notifiche')
      .update({ letta_il: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { ok: false, errore: error.message }
    }
  }

  revalidatePath('/dashboard/notifiche')

  return { ok: true }
}

export type UltimaNotifica = {
  id: number
  daNome: string
  messaggio: string
  quando: string
}

// Chiamata periodicamente dal client (NotificheProvider) per il badge nel
// menu e il banner in evidenza: solo conteggio + l'unica non letta più
// recente, non l'intero elenco - questo endpoint e' interrogato spesso.
export async function getStatoNotifiche(): Promise<{ nonLette: number; ultima: UltimaNotifica | null }> {
  const email = headers().get('x-tca-user-email')
  if (!email) return { nonLette: 0, ultima: null }

  const supabase = createSupabaseServiceClient()

  const [{ count }, { data: ultimaRiga }] = await Promise.all([
    supabase.from('notifiche').select('*', { count: 'exact', head: true }).eq('a_email', email).is('letta_il', null),
    supabase
      .from('notifiche')
      .select('id, da_email, messaggio, created_at')
      .eq('a_email', email)
      .is('letta_il', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!ultimaRiga) {
    return { nonLette: count ?? 0, ultima: null }
  }

  const { data: mittente } = await supabase
    .from('staff_users')
    .select('nome, cognome')
    .eq('email', ultimaRiga.da_email)
    .maybeSingle()

  const nomeCompleto = mittente ? `${mittente.nome ?? ''} ${mittente.cognome ?? ''}`.trim() : ''

  return {
    nonLette: count ?? 0,
    ultima: {
      id: ultimaRiga.id,
      daNome: nomeCompleto || ultimaRiga.da_email,
      messaggio: ultimaRiga.messaggio,
      quando: ultimaRiga.created_at,
    },
  }
}
