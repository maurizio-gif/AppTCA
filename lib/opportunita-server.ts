import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { leggiABlocchi } from '@/lib/supabase/aBlocchi'
import { apparteneAGruppo } from '@/lib/contatti'

// Server-only (usa il client service role): importare solo da Server
// Component/Server Action.

export type VoceStorico = {
  stato: string
  statoPrecedente: string | null
  cambiatoDa: string | null
  cambiatoIl: string
}

// Storico dei passaggi di stato, per opportunita' e dal piu' recente: lo
// scrive un trigger sul database (vedi opportunita_storico), qui lo si legge
// per mostrarlo nel pannello di gestione.
export async function storicoOpportunita(ids: string[]): Promise<Record<string, VoceStorico[]>> {
  const unici = [...new Set(ids.filter(Boolean))]
  if (unici.length === 0) return {}

  const supabase = createSupabaseServiceClient()
  // A blocchi come le altre letture per id: una sola richiesta con centinaia
  // di UUID non parte nemmeno (vedi leggiABlocchi).
  const { righe } = await leggiABlocchi<Record<string, any>>(unici, (blocco) =>
    supabase
      .from('opportunita_storico')
      .select('opportunita_id, stato, stato_precedente, cambiato_da, cambiato_il')
      .in('opportunita_id', blocco)
      .order('cambiato_il', { ascending: false })
  )

  const perOpportunita: Record<string, VoceStorico[]> = {}
  for (const riga of righe) {
    const voce: VoceStorico = {
      stato: riga.stato,
      statoPrecedente: riga.stato_precedente,
      cambiatoDa: riga.cambiato_da,
      cambiatoIl: riga.cambiato_il,
    }
    if (!perOpportunita[riga.opportunita_id]) perOpportunita[riga.opportunita_id] = []
    perOpportunita[riga.opportunita_id].push(voce)
  }

  return perOpportunita
}

// Le richieste con i dati di presa in carico presi dall'opportunita' della
// persona, scritti sui campi che Analytics legge da sempre (gestito,
// gestito_da, gestito_il). Serve perche' lo stato di lavorazione non vive piu'
// sulla singola richiesta: la presa in carico e' quella della trattativa.
//
// Solo per Adulti: Junior e' rimasta al modello precedente la pipeline (vedi
// ContattiSezione), quindi il suo "gestito" e' di nuovo quello scritto a
// mano sulla richiesta - sovrascriverlo con l'opportunita' (che nasce
// comunque in background per ogni form_contatti, ma su Junior non la
// gestisce nessuno) lo bloccherebbe per sempre sull'esito di quando la
// pipeline era ancora mostrata anche li'.
export async function conPresaInCarico<T extends { opportunita_id?: string | null; gruppo_attivita?: string | null }>(
  righe: T[]
): Promise<T[]> {
  const ids = [...new Set(righe.map((riga) => riga.opportunita_id).filter(Boolean))] as string[]
  if (ids.length === 0) return righe

  const supabase = createSupabaseServiceClient()
  const { righe: trovate } = await leggiABlocchi<Record<string, any>>(ids, (blocco) =>
    supabase.from('opportunita').select('id, stato, assegnato_a, assegnato_il').in('id', blocco)
  )
  const perId = new Map(trovate.map((o) => [o.id, o]))

  return righe.map((riga) => {
    if (apparteneAGruppo(riga.gruppo_attivita, 'junior')) return riga

    const opportunita = riga.opportunita_id ? perId.get(riga.opportunita_id) : null
    return {
      ...riga,
      gestito: !!opportunita && opportunita.stato !== 'nuovo',
      gestito_da: opportunita?.assegnato_a ?? null,
      gestito_il: opportunita?.assegnato_il ?? null,
    }
  })
}
