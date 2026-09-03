import { NextResponse } from 'next/server'
import { corsEventi } from '@/lib/eventi'
import { verificaSocioPgm } from '@/lib/perfectgym'

export const dynamic = 'force-dynamic'

// Primo passo del form eventi: l'email digitata è di un socio con contratto
// attivo? Da questo dipendono la quota (25 € / 35 €) e il fatto di non
// richiedere dati che il Club ha già.
//
// La risposta NON contiene nome, cognome o cellulare del socio, anche se
// PerfectGym li restituisce: farli arrivare al browser significherebbe
// permettere a chiunque di leggere i recapiti di un socio conoscendone
// l'email. Al momento della prenotazione li rilegge il server (vedi
// /api/eventi/prenotazione), che è l'unico punto in cui servono davvero.
//
// Resta esposto il solo bit "questa email è socio": è la stessa informazione
// che il webhook n8n `tca-verifica-iscritto` già restituisce al form contatti
// del sito, quindi non apre una superficie nuova.

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsEventi('POST') })
}

export async function POST(request: Request) {
  const headers = corsEventi('POST')

  let corpo: { email?: unknown }
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ errore: 'Richiesta non valida.' }, { status: 400, headers })
  }

  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : ''
  if (!EMAIL_VALIDA.test(email)) {
    return NextResponse.json({ errore: 'Email non valida.' }, { status: 400, headers })
  }

  const esito = await verificaSocioPgm(email)

  // PerfectGym irraggiungibile: si prosegue trattando la persona come non
  // socia, invece di bloccare la prenotazione. Chiedere i dati a un socio è
  // un fastidio; impedirgli di prenotare è perdere l'iscrizione. La quota
  // viene comunque ricalcolata al salvataggio, quando PGM potrebbe essere
  // tornato disponibile.
  return NextResponse.json({ socio: esito.socio, verificaRiuscita: !esito.errore }, { headers })
}
