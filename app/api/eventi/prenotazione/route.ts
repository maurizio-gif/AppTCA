import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import {
  cercaPersona,
  contaDisponibilita,
  corsEventi,
  getEventoPrenotabile,
  notificaEmailEvento,
  verificaSocio,
} from '@/lib/eventi'

export const dynamic = 'force-dynamic'

// Salvataggio della prenotazione arrivata dal form eventi del sito statico.
// Il posto viene occupato subito ma in stato "in attesa di pagamento": si
// paga in cassa, e senza pagamento entro le ore configurate la riga decade
// (vedi /api/cron/eventi-scadute) e il posto torna disponibile.
//
// Niente di ciò che arriva dal browser viene creduto sui numeri: capienza,
// quota e ore di scadenza si rileggono dal manifest del sito, e lo stato di
// socio si riverifica qui contro il webhook n8n — altrimenti basterebbe una
// POST a mano con `socio: true` per pagare 25 € invece di 35 €.

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODICE_UNIQUE_VIOLATION = '23505'

function testo(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function cellulareValido(v: string): boolean {
  const cifre = v.replace(/[^0-9]/g, '')
  return cifre.length >= 6 && cifre.length <= 15
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsEventi('POST') })
}

export async function POST(request: Request) {
  const headers = corsEventi('POST')

  let corpo: Record<string, unknown>
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ errore: 'Richiesta non valida.' }, { status: 400, headers })
  }

  const slug = testo(corpo.slug, 120)
  const email = testo(corpo.email, 180).toLowerCase()
  const lingua = testo(corpo.lingua, 5) === 'en' ? 'en' : 'it'

  if (!EMAIL_VALIDA.test(email)) {
    return NextResponse.json({ errore: 'Email non valida.', campo: 'email' }, { status: 400, headers })
  }

  const evento = await getEventoPrenotabile(slug)
  if (!evento) {
    return NextResponse.json({ errore: 'Evento non prenotabile.' }, { status: 404, headers })
  }

  const supabase = createSupabaseServiceClient()

  const disponibilita = await contaDisponibilita(supabase, evento)
  if (!disponibilita) {
    return NextResponse.json({ errore: 'Disponibilità non leggibile.' }, { status: 503, headers })
  }
  if (disponibilita.postiResidui <= 0) {
    return NextResponse.json({ errore: 'completo', postiResidui: 0 }, { status: 409, headers })
  }

  const verifica = await verificaSocio(email)

  // Un socio i suoi dati li ha già dati al Club: il form non glieli richiede e
  // si rileggono dall'anagrafica interna. Se lì non c'è (o non è socio) restano
  // quelli digitati nel form. Per il non socio i tre campi sono obbligatori:
  // senza recapito la segreteria non può richiamarlo per il pagamento.
  const persona = verifica.socio ? await cercaPersona(supabase, email) : null

  const nome = persona?.nome ?? testo(corpo.nome, 80)
  const cognome = persona?.cognome ?? testo(corpo.cognome, 80)
  const cellulare = persona?.cellulare ?? testo(corpo.cellulare, 40)

  if (!verifica.socio) {
    if (!nome) return NextResponse.json({ errore: 'Nome mancante.', campo: 'nome' }, { status: 400, headers })
    if (!cognome) return NextResponse.json({ errore: 'Cognome mancante.', campo: 'cognome' }, { status: 400, headers })
    if (!cellulare || !cellulareValido(cellulare)) {
      return NextResponse.json({ errore: 'Cellulare non valido.', campo: 'cellulare' }, { status: 400, headers })
    }
    if (corpo.privacy !== true) {
      return NextResponse.json({ errore: 'Consenso privacy mancante.', campo: 'privacy' }, { status: 400, headers })
    }
  }

  const quota = verifica.socio ? evento.quotaSocio : evento.quotaNonSocio
  const adesso = new Date()
  const scadenza = new Date(adesso.getTime() + evento.oreScadenza * 3_600_000)

  const { data: inserita, error } = await supabase
    .from('iscrizioni_eventi')
    .insert({
      evento_slug: evento.slug,
      nome_evento: evento.titolo,
      stato: 'in_attesa_pagamento',
      quota,
      scadenza_pagamento: scadenza.toISOString(),
      data_compilazione_form: adesso.toISOString(),
      lingua,
      nome: nome || null,
      cognome: cognome || null,
      email,
      cellulare: cellulare || null,
      socio: verifica.socio,
      // Lo stato restituito da n8n, non un contratto letto da PerfectGym:
      // serve alla segreteria per sapere su cosa si è basata la quota.
      stato_contratto_pgm: verifica.riuscita ? verifica.stato : 'verifica non riuscita',
      // Collega la prenotazione alla scheda anagrafica già esistente, così in
      // dashboard la persona non risulta un contatto nuovo.
      persona_id: persona?.id ?? null,
      link_pgm: persona?.pgmMemberId
        ? `https://tcambrosiano.perfectgym.com/pgm/#/Users/${persona.pgmMemberId}/UserProfile`
        : null,
    })
    .select('id')
    .single()

  if (error) {
    // Indice unico su (evento_slug, email) limitato alle prenotazioni vive:
    // è il doppio invio (doppio click, refresh della pagina di conferma) o
    // qualcuno che riprova con la stessa email. Non è un errore da mostrare
    // come guasto: il posto ce l'ha già.
    if (error.code === CODICE_UNIQUE_VIOLATION) {
      return NextResponse.json({ errore: 'gia_prenotato', quota }, { status: 409, headers })
    }
    return NextResponse.json({ errore: 'Salvataggio non riuscito.' }, { status: 500, headers })
  }

  // Controllo di capienza dopo l'inserimento: due form inviati nello stesso
  // istante superano entrambi il controllo iniziale, perché fra la lettura e
  // la scrittura non c'è un lock. Qui si riconta e, se si è finiti oltre la
  // capienza, si annulla l'ultima arrivata — la propria riga, riconosciuta
  // per id: chi era già dentro non viene toccato.
  const dopo = await contaDisponibilita(supabase, evento)
  if (dopo && dopo.postiOccupati > evento.postiTotali) {
    const { data: eccedenti } = await supabase
      .from('iscrizioni_eventi')
      .select('id')
      .eq('evento_slug', evento.slug)
      .in('stato', ['in_attesa_pagamento', 'confermata'])
      .order('id', { ascending: true })
      .range(evento.postiTotali, evento.postiTotali + 50)

    if ((eccedenti ?? []).some((r) => r.id === inserita.id)) {
      await supabase
        .from('iscrizioni_eventi')
        .update({ stato: 'annullata', annullata_da: 'sistema', annullata_il: new Date().toISOString(), note: 'Annullata: posti esauriti (invii simultanei).' })
        .eq('id', inserita.id)
      return NextResponse.json({ errore: 'completo', postiResidui: 0 }, { status: 409, headers })
    }
  }

  await notificaEmailEvento('prenotazione_ricevuta', {
    id: inserita.id,
    slug: evento.slug,
    evento: evento.titolo,
    eventoEn: evento.titoloEn,
    urlEvento: evento.urlEvento,
    dataEvento: evento.data,
    lingua,
    email,
    nome,
    cognome,
    socio: verifica.socio,
    quota,
    scadenzaPagamento: scadenza.toISOString(),
    oreScadenza: evento.oreScadenza,
  })

  return NextResponse.json(
    {
      ok: true,
      socio: verifica.socio,
      quota,
      oreScadenza: evento.oreScadenza,
      scadenzaPagamento: scadenza.toISOString(),
      postiResidui: dopo ? dopo.postiResidui : Math.max(0, disponibilita.postiResidui - 1),
    },
    { headers }
  )
}
