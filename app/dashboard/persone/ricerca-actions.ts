'use server'

import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { nomePersona } from '@/lib/persone'
import { ETICHETTE_STATO, normalizzaStato } from '@/lib/pipeline'

export type PersonaTrovata = {
  id: string
  nome: string
  email: string | null
  cellulare: string | null
  storico: boolean
  // Le sue opportunita' aperte (di norma una sola, vedi l'indice unico
  // parziale su opportunita): serve a collegare il task al lead giusto senza
  // farlo cercare all'operatore.
  opportunita: { id: string; etichetta: string }[]
}

const LIMITE = 8

// Ricerca per il campo "persona" del form d'agenda: si digita nome, cognome,
// email o cellulare e si scelgono dai risultati. Lato server perche'
// l'anagrafica ha 4000 righe (lo storico HubSpot) e non ha senso spedirla al
// browser per una tendina.
export async function cercaPersone(query: string): Promise<PersonaTrovata[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const supabase = createSupabaseServiceClient()
  // Virgole e parentesi spezzerebbero la sintassi di .or() di PostgREST,
  // % e _ sarebbero jolly involontari: fuori tutti.
  const perIlike = `%${q.replace(/[%_,()]/g, ' ').trim()}%`
  const cifre = q.replace(/\D/g, '')

  const filtri = [`nome.ilike.${perIlike}`, `cognome.ilike.${perIlike}`, `email.ilike.${perIlike}`]
  if (cifre.length >= 4) filtri.push(`cellulare_norm.ilike.%${cifre}%`)

  const { data: persone } = await supabase
    .from('persone')
    .select('id, nome, cognome, email, cellulare, storico')
    .or(filtri.join(','))
    // Prima chi e' attivo: chi esiste solo nello storico HubSpot serve, ma
    // raramente e' quello che si sta cercando mentre si fissa un appuntamento.
    .order('storico', { ascending: true })
    .order('cognome', { ascending: true })
    .limit(LIMITE)

  const ids = (persone ?? []).map((p) => p.id)
  const { data: opportunita } = ids.length
    ? await supabase.from('opportunita').select('id, persona_id, stato').in('persona_id', ids).is('chiuso_il', null)
    : { data: [] as Record<string, any>[] }

  return (persone ?? []).map((persona) => ({
    id: persona.id,
    nome: nomePersona(persona),
    email: persona.email ?? null,
    cellulare: persona.cellulare ?? null,
    storico: !!persona.storico,
    opportunita: (opportunita ?? [])
      .filter((o) => o.persona_id === persona.id)
      .map((o) => ({ id: o.id, etichetta: `Lead ${ETICHETTE_STATO[normalizzaStato(o.stato)]}` })),
  }))
}
