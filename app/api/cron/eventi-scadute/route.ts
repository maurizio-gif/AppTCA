import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

// Cron (vedi vercel.json): porta a "scaduta" le prenotazioni eventi non
// pagate oltre la scadenza, liberando il posto in modo visibile.
//
// Il conteggio dei posti già ignora una prenotazione in attesa scaduta (vedi
// contaDisponibilita), quindi il posto è di fatto libero anche prima che il
// cron passi: questo giro serve a rendere lo stato leggibile in dashboard —
// altrimenti la segreteria vedrebbe righe "in attesa di pagamento" vecchie di
// settimane e non saprebbe quali contano ancora.
//
// Vercel chiama i cron con l'header Authorization: Bearer $CRON_SECRET. Senza
// il controllo la route sarebbe pubblica e chiunque potrebbe far scadere
// prenotazioni ancora valide.
export async function GET(request: Request) {
  const atteso = process.env.CRON_SECRET
  if (!atteso) {
    return NextResponse.json({ errore: 'CRON_SECRET non configurato.' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${atteso}`) {
    return NextResponse.json({ errore: 'Non autorizzato.' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  const adesso = new Date().toISOString()

  const { data, error } = await supabase
    .from('iscrizioni_eventi')
    .update({ stato: 'scaduta' })
    .eq('stato', 'in_attesa_pagamento')
    .not('scadenza_pagamento', 'is', null)
    .lt('scadenza_pagamento', adesso)
    .select('id')

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, scadute: data?.length ?? 0 })
}
