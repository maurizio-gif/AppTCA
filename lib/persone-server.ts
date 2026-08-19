import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { ConteggiPersona } from './persone'

// Server-only (usa il client service role): importare solo da Server
// Component/Server Action.

const MODULI: { tabella: string; colonna: string; chiave: keyof ConteggiPersona }[] = [
  { tabella: 'form_contatti', colonna: 'persona_id', chiave: 'enquiries' },
  { tabella: 'form_invita_amico', colonna: 'persona_id', chiave: 'inviti' },
  { tabella: 'form_scuola_tennis', colonna: 'persona_id', chiave: 'scuolaTennis' },
  { tabella: 'form_summer_camp', colonna: 'persona_id', chiave: 'summerCamp' },
  { tabella: 'iscrizioni_eventi', colonna: 'persona_id', chiave: 'eventi' },
]

function conteggiVuoti(): ConteggiPersona {
  return { enquiries: 0, inviti: 0, scuolaTennis: 0, summerCamp: 0, eventi: 0 }
}

// Quante richieste ha portato ciascuna persona, modulo per modulo: e' il dato
// del chip identita' ("3 richieste") e della scheda persona. Una query per
// tabella con l'elenco degli id, contate poi in memoria: sono numeri piccoli
// e cinque count(*) per persona sarebbero molte piu' query.
export async function conteggiRichieste(personaIds: string[]): Promise<Record<string, ConteggiPersona>> {
  const ids = [...new Set(personaIds.filter(Boolean))]
  if (ids.length === 0) return {}

  const supabase = createSupabaseServiceClient()
  const conteggi: Record<string, ConteggiPersona> = Object.fromEntries(ids.map((id) => [id, conteggiVuoti()]))

  await Promise.all(
    MODULI.map(async ({ tabella, colonna, chiave }) => {
      const { data } = await supabase.from(tabella as any).select(colonna).in(colonna, ids)
      for (const riga of (data ?? []) as Record<string, any>[]) {
        const id = riga[colonna]
        if (id && conteggi[id]) conteggi[id][chiave] += 1
      }
    })
  )

  return conteggi
}
