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
  // parziale su opportunita): serve a collegare il task alla trattativa giusta
  // senza farla cercare all'operatore.
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
      .map((o) => ({ id: o.id, etichetta: `Opportunità ${ETICHETTE_STATO[normalizzaStato(o.stato)].toLowerCase()}` })),
  }))
}

export type RichiestaPersona = {
  // "entita:id", come lo vuole creaTask (vedi agenda/actions.ts).
  chiave: string
  // Già pronta da mostrare: data, modulo e tipo della richiesta.
  etichetta: string
  // L'opportunita' a cui la richiesta appartiene: collegando il task alla
  // richiesta lo si collega anche alla trattativa, senza chiederlo.
  opportunitaId: string | null
}

// I moduli da cui puo' arrivare una richiesta, con i campi che ne danno data e
// tipo. Ogni voce elenca anche le colonne "persona" da guardare: una persona
// puo' essere il titolare della richiesta, il minore iscritto o il socio che ha
// invitato un amico, e in agenda contano tutte.
const MODULI: {
  tabella: string
  etichetta: string
  colonneData: string[]
  colonneTipo: string[]
  ruoli: { colonna: string; ruolo: string | null }[]
  conOpportunita?: boolean
}[] = [
  {
    tabella: 'form_contatti',
    etichetta: 'Enquiry',
    colonneData: ['created_at'],
    colonneTipo: ['tipo_richiesta'],
    ruoli: [{ colonna: 'persona_id', ruolo: null }],
    conOpportunita: true,
  },
  {
    tabella: 'form_invita_amico',
    etichetta: 'Invita un amico',
    colonneData: ['created_at'],
    colonneTipo: [],
    ruoli: [
      { colonna: 'persona_id', ruolo: null },
      { colonna: 'persona_socio_id', ruolo: 'ha invitato' },
    ],
    conOpportunita: true,
  },
  {
    tabella: 'form_scuola_tennis',
    etichetta: 'Scuola tennis',
    colonneData: ['created_at'],
    colonneTipo: ['tipo_richiesta', 'tipo_corso'],
    ruoli: [
      { colonna: 'persona_id', ruolo: null },
      { colonna: 'persona_minore_id', ruolo: 'iscritto' },
    ],
  },
  {
    tabella: 'form_summer_camp',
    etichetta: 'Summer camp',
    colonneData: ['created_at'],
    colonneTipo: [],
    ruoli: [
      { colonna: 'persona_id', ruolo: null },
      { colonna: 'persona_minore_id', ruolo: 'iscritto' },
    ],
  },
  {
    tabella: 'iscrizioni_eventi',
    etichetta: 'Iscrizione evento',
    colonneData: ['data_compilazione_form', 'created_at'],
    colonneTipo: ['nome_evento'],
    ruoli: [{ colonna: 'persona_id', ruolo: null }],
  },
]

function formatData(valore: string | null): string {
  if (!valore) return 'senza data'
  const soloData = String(valore).slice(0, 10)
  const [anno, mese, giorno] = soloData.split('-').map(Number)
  if (!anno || !mese || !giorno) return 'senza data'
  return new Date(anno, mese - 1, giorno).toLocaleDateString('it-IT')
}

// Tutto quello che questa persona ha compilato, dal più recente: e' l'elenco
// che compare nel form d'agenda appena si scegle la persona, per agganciare il
// task alla richiesta (e quindi al lead) giusta.
export async function richiestePersona(personaId: string): Promise<RichiestaPersona[]> {
  if (!personaId) return []

  const supabase = createSupabaseServiceClient()

  const trovate: { chiave: string; etichetta: string; opportunitaId: string | null; ordine: string }[] = []

  await Promise.all(
    MODULI.flatMap((modulo) =>
      modulo.ruoli.map(async ({ colonna, ruolo }) => {
        const colonne = [
          'id',
          ...modulo.colonneData,
          ...modulo.colonneTipo,
          ...(modulo.conOpportunita ? ['opportunita_id'] : []),
        ]
        const { data } = await supabase
          .from(modulo.tabella as 'form_contatti')
          .select(colonne.join(', '))
          .eq(colonna, personaId)

        for (const riga of (data ?? []) as unknown as Record<string, any>[]) {
          const quando = modulo.colonneData.map((c) => riga[c]).find((v) => !!v) ?? null
          const tipo = modulo.colonneTipo.map((c) => riga[c]).find((v) => !!v) ?? null

          trovate.push({
            chiave: `${modulo.tabella}:${riga.id}`,
            etichetta: [formatData(quando), modulo.etichetta, tipo, ruolo && `come ${ruolo}`]
              .filter(Boolean)
              .join(' · '),
            opportunitaId: riga.opportunita_id ?? null,
            // Le date "pure" e i timestamp si ordinano bene come stringhe ISO;
            // chi non ha data finisce in fondo invece di rompere l'ordine.
            ordine: quando ? String(quando) : '',
          })
        }
      })
    )
  )

  // Piu' recente in cima: e' la richiesta di cui si sta parlando al telefono.
  trovate.sort((a, b) => b.ordine.localeCompare(a.ordine))

  return trovate.map(({ chiave, etichetta, opportunitaId }) => ({ chiave, etichetta, opportunitaId }))
}
