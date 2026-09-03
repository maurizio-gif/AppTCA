import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { contaDisponibilita, corsEventi, getEventoPrenotabile } from '@/lib/eventi'

export const dynamic = 'force-dynamic'

// Endpoint pubblico, senza autenticazione: lo chiama il form eventi del sito
// statico (WebSite-TCA) all'apertura, per mostrare quota, regole di pagamento
// e posti residui — e per chiudersi da solo quando l'evento è al completo.
//
// Risponde solo con numeri e con la configurazione già pubblica sulla pagina
// dell'evento: nessun nome, email o riga di prenotazione. Anche intercettando
// la risposta non si impara nulla su chi ha prenotato, quindi non serve
// autenticazione (stesso ragionamento di /api/disponibilita).

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsEventi('GET') })
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const headers = corsEventi('GET')
  const evento = await getEventoPrenotabile(params.slug)

  if (!evento) {
    return NextResponse.json(
      { prenotabile: false, errore: 'Evento non prenotabile.' },
      { status: 404, headers }
    )
  }

  const disponibilita = await contaDisponibilita(createSupabaseServiceClient(), evento)

  // Lettura fallita: si risponde 503 invece di "0 occupati". Dire che i posti
  // ci sono tutti quando non lo si sa porta a incassare prenotazioni oltre la
  // capienza, che è il caso peggiore da spiegare a chi si presenta all'evento.
  if (!disponibilita) {
    return NextResponse.json(
      { prenotabile: false, errore: 'Disponibilità non leggibile.' },
      { status: 503, headers }
    )
  }

  return NextResponse.json(
    {
      prenotabile: disponibilita.postiResidui > 0,
      slug: evento.slug,
      titolo: evento.titolo,
      ...disponibilita,
      quotaSocio: evento.quotaSocio,
      quotaNonSocio: evento.quotaNonSocio,
      oreScadenza: evento.oreScadenza,
    },
    { headers }
  )
}
