import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { DURATA_PREDEFINITA, normalizzaOra } from '@/lib/agenda'
import { classificaContatto } from '@/lib/contatti'

export const dynamic = 'force-dynamic'

// Endpoint pubblico, senza autenticazione: lo chiama il sito statico
// (WebSite-TCA, build Astro senza backend proprio) prima di offrire in
// prenotazione un orario di richiamata/visita, per togliere quelli già
// occupati in agenda. Risponde SOLO con data/ora/durata degli impegni: nessun
// nome, email, titolo o id di riga — anche intercettando la risposta non si
// impara nulla su chi ha un appuntamento, quindi non serve autenticazione né
// una anon key con RLS dedicata.
//
// Stessa "agenda condivisa" di lib/agenda.ts: un task e un appuntamento dal
// sito occupano lo stesso calendario, quindi una richiamata prenotabile deve
// evitare anche gli orari già presi da una visita in sede (e viceversa).

// Oltre il massimo davvero offerto dal sito (giorniRichiamata/giorniVisita in
// src/content/moduli/dati-stagionali.md, oggi 7-14 gg): un intervallo più
// ampio è quasi certamente un errore del chiamante, non un uso legittimo.
const MAX_GIORNI = 62

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // Breve: riduce il carico su Supabase senza rendere la disponibilità
    // percepibilmente vecchia (il sito la richiede una sola volta per
    // apertura del calendario, non ad ogni click).
    'Cache-Control': 'public, max-age=15, s-maxage=15',
  }
}

function eDataValida(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const da = searchParams.get('da')
  const a = searchParams.get('a')

  if (!eDataValida(da) || !eDataValida(a) || da > a) {
    return NextResponse.json(
      { errore: 'Parametri "da"/"a" mancanti o non validi (formato YYYY-MM-DD).' },
      { status: 400, headers: corsHeaders() }
    )
  }

  const giorni = (Date.parse(a) - Date.parse(da)) / 86_400_000
  if (giorni > MAX_GIORNI) {
    return NextResponse.json({ errore: 'Intervallo troppo ampio.' }, { status: 400, headers: corsHeaders() })
  }

  const supabase = createSupabaseServiceClient()

  const [
    { data: task, error: erroreTask },
    { data: contatti, error: erroreContatti },
  ] = await Promise.all([
    supabase.from('task').select('data, ora, durata_minuti, stato').gte('data', da).lte('data', a),
    supabase
      .from('form_contatti')
      .select('data_richiesta, ora_richiesta, tipo_richiesta')
      .gte('data_richiesta', da)
      .lte('data_richiesta', a),
  ])

  if (erroreTask || erroreContatti) {
    return NextResponse.json(
      { errore: 'Errore nella lettura della disponibilità.' },
      { status: 500, headers: corsHeaders() }
    )
  }

  const occupati: Record<string, { ora: string; durataMinuti: number }[]> = {}

  function aggiungi(giorno: string | null, ora: string | null, durataMinuti: number) {
    const oraPulita = normalizzaOra(ora)
    if (!giorno || !oraPulita) return
    const chiave = giorno.slice(0, 10)
    if (!occupati[chiave]) occupati[chiave] = []
    occupati[chiave].push({ ora: oraPulita, durataMinuti })
  }

  // Solo "annullato" libera lo slot: un task già "completato" ha comunque
  // occupato quel momento (stessa logica di voceDaTask in lib/agenda.ts).
  for (const riga of task ?? []) {
    if (riga.stato === 'annullato') continue
    const durata = Number(riga.durata_minuti) > 0 ? Number(riga.durata_minuti) : DURATA_PREDEFINITA.task
    aggiungi(riga.data, riga.ora, durata)
  }

  // Solo i messaggi generici (classificaContatto -> 'messaggio') non
  // prenotano un vero slot: gli appuntamenti, telefonici o in sede, sì —
  // indipendentemente da quale dei due starà per prenotare chi chiama questo
  // endpoint (stessa agenda condivisa, vedi commento in testa al file).
  for (const riga of contatti ?? []) {
    const tipo = classificaContatto(riga)
    if (tipo === 'messaggio') continue
    aggiungi(riga.data_richiesta, riga.ora_richiesta, DURATA_PREDEFINITA[tipo])
  }

  return NextResponse.json({ occupati }, { headers: corsHeaders() })
}
