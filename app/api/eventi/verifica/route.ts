import { NextResponse } from 'next/server'
import { corsEventi, verificaSocio } from '@/lib/eventi'

export const dynamic = 'force-dynamic'

// Primo passo del form eventi: l'email digitata è di un socio con contratto
// attivo? Da questo dipendono la quota (25 € / 35 €) e il fatto di non
// richiedere dati che il Club ha già.
//
// La verifica passa dal webhook n8n `tca-verifica-iscritto`, lo stesso che il
// form contatti interroga al primo passo (vedi verificaSocio in lib/eventi.ts).
//
// La risposta contiene il solo bit "questa email è socio": nome, cognome e
// cellulare restano fuori, anche se il CRM li conosce. Farli arrivare al
// browser significherebbe permettere a chiunque di leggere i recapiti di un
// socio conoscendone l'email. Al momento della prenotazione li rilegge il
// server (vedi /api/eventi/prenotazione), l'unico punto in cui servono.

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

  const esito = await verificaSocio(email)

  // Verifica non riuscita: si prosegue trattando la persona come non socia,
  // invece di bloccare la prenotazione. Chiedere i dati a un socio è un
  // fastidio; impedirgli di prenotare è perdere l'iscrizione. La quota viene
  // comunque ricalcolata al salvataggio, quando il webhook potrebbe essere
  // tornato disponibile.
  return NextResponse.json({ socio: esito.socio, verificaRiuscita: esito.riuscita }, { headers })
}
