'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'
import { notificaEmailEvento, statoDi } from '@/lib/eventi'

type Risultato = { ok: true } | { ok: false; errore: string }

function rinfresca() {
  revalidatePath('/dashboard/iscrizioni-eventi')
  revalidatePath('/dashboard')
}

// iscrizioni_eventi.id e' un bigint, ma dal client arriva sempre come
// stringa (e' l'id della riga dell'accordion): la conversione sta qui una
// volta sola, cosi' ogni azione lavora sul numero. Un id non numerico
// diventa NaN e non trova nulla, che e' il comportamento giusto.
function idNumerico(id: string): number {
  return Number(id)
}

async function leggiPrenotazione(id: string) {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('iscrizioni_eventi')
    .select('*')
    .eq('id', idNumerico(id))
    .maybeSingle()
  return data
}

// Il pagamento in cassa è l'unico atto che rende definitiva la prenotazione
// (vedi il testo mostrato dal form: senza pagamento il posto decade). Da qui
// la segreteria registra l'incasso: la riga esce dall'attesa e parte l'email
// di conferma definitiva al partecipante.
export async function confermaPagamento(id: string, importo: number | null): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const prenotazione = await leggiPrenotazione(id)

  if (!prenotazione) return { ok: false, errore: 'Prenotazione non trovata: ricarica la pagina.' }

  const stato = statoDi(prenotazione)
  if (stato === 'confermata') return { ok: false, errore: 'Questa prenotazione è già confermata.' }
  if (stato === 'annullata') {
    return { ok: false, errore: 'Prenotazione annullata: non si può registrare un pagamento.' }
  }

  // Una prenotazione scaduta si può ancora incassare: se la persona si
  // presenta in cassa il giorno dopo la scadenza e c'è ancora posto, la
  // segreteria deve poterla riattivare invece di rifarla da zero. Il posto va
  // però verificato a mano: qui non si ricontano i posti, perché è la
  // segreteria a decidere se accettare (magari fuori quota, in accordo con
  // l'organizzatore).
  const importoFinale = importo != null && Number.isFinite(importo) ? importo : prenotazione.quota

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('iscrizioni_eventi')
    .update({
      stato: 'confermata',
      importo_pagato: importoFinale,
      pagamento_confermato_da: email,
      pagamento_confermato_il: new Date().toISOString(),
    })
    .eq('id', idNumerico(id))

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'evento_pagamento_confermato', {
    entita: 'iscrizioni_eventi',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(prenotazione),
      email_contatto: prenotazione.email ?? null,
      evento: prenotazione.nome_evento ?? null,
      importo: importoFinale,
      stato_precedente: stato,
    },
  })

  await notificaEmailEvento('pagamento_confermato', {
    id,
    slug: prenotazione.evento_slug,
    evento: prenotazione.nome_evento,
    lingua: prenotazione.lingua ?? 'it',
    email: prenotazione.email,
    nome: prenotazione.nome,
    cognome: prenotazione.cognome,
    socio: prenotazione.socio,
    importo: importoFinale,
  })

  rinfresca()
  return { ok: true }
}

// Annullamento: libera il posto tenendo la riga: serve sapere che quella
// persona aveva prenotato e non ha pagato, sia per richiamarla sia per
// spiegare all'organizzatore perché il posto è tornato libero. La
// cancellazione definitiva è un'altra azione (eliminaPrenotazione).
export async function annullaPrenotazione(id: string, motivo: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const prenotazione = await leggiPrenotazione(id)

  if (!prenotazione) return { ok: false, errore: 'Prenotazione non trovata: ricarica la pagina.' }
  if (statoDi(prenotazione) === 'annullata') {
    return { ok: false, errore: 'Questa prenotazione è già annullata.' }
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('iscrizioni_eventi')
    .update({
      stato: 'annullata',
      annullata_da: email,
      annullata_il: new Date().toISOString(),
      note: motivo.trim() || prenotazione.note,
    })
    .eq('id', idNumerico(id))

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'evento_prenotazione_annullata', {
    entita: 'iscrizioni_eventi',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(prenotazione),
      email_contatto: prenotazione.email ?? null,
      evento: prenotazione.nome_evento ?? null,
      motivo: motivo.trim() || null,
      stato_precedente: statoDi(prenotazione),
    },
  })

  rinfresca()
  return { ok: true }
}

// Riapertura: rimette in attesa di pagamento una riga annullata o scaduta,
// con una nuova finestra di 48 ore dal momento della riapertura. Serve per
// l'annullamento fatto per errore e per chi si rifà vivo: senza, l'unica
// strada sarebbe cancellare e chiedere alla persona di ricompilare il form.
export async function riapriPrenotazione(id: string, ore: number): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const prenotazione = await leggiPrenotazione(id)

  if (!prenotazione) return { ok: false, errore: 'Prenotazione non trovata: ricarica la pagina.' }

  const stato = statoDi(prenotazione)
  if (stato === 'in_attesa_pagamento') {
    return { ok: false, errore: 'Questa prenotazione è già in attesa di pagamento.' }
  }
  if (stato === 'confermata') {
    return { ok: false, errore: 'Prenotazione già pagata: non va rimessa in attesa.' }
  }

  const oreValide = Number.isFinite(ore) && ore > 0 ? ore : 48
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('iscrizioni_eventi')
    .update({
      stato: 'in_attesa_pagamento',
      scadenza_pagamento: new Date(Date.now() + oreValide * 3_600_000).toISOString(),
      annullata_da: null,
      annullata_il: null,
    })
    .eq('id', idNumerico(id))

  // Indice unico su (evento_slug, email) fra le prenotazioni vive: la stessa
  // persona ha già riprenotato nel frattempo, quindi non c'è nulla da
  // riaprire — riaprire creerebbe due posti per una persona sola.
  if (error) {
    if (error.code === '23505') {
      return { ok: false, errore: 'Questa persona ha già una prenotazione attiva su questo evento.' }
    }
    return { ok: false, errore: error.message }
  }

  await registraLog(email, 'evento_prenotazione_riaperta', {
    entita: 'iscrizioni_eventi',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(prenotazione),
      email_contatto: prenotazione.email ?? null,
      evento: prenotazione.nome_evento ?? null,
      stato_precedente: stato,
      ore_concesse: oreValide,
    },
  })

  rinfresca()
  return { ok: true }
}

// Verifica lato server (non solo lato UI, altrimenti la Server Action resta
// chiamabile a mano bypassando il permesso): solo chi ha "puo_cancellare"
// puo' cancellare definitivamente un record.
export async function eliminaPrenotazione(id: string): Promise<Risultato> {
  const email = headers().get('x-tca-user-email')
  const supabase = createSupabaseServiceClient()

  const { data: chiamante } = await supabase
    .from('staff_users')
    .select('puo_cancellare')
    .eq('email', email ?? '')
    .maybeSingle()

  if (!chiamante?.puo_cancellare) {
    return { ok: false, errore: 'Non hai il permesso di cancellare i record.' }
  }

  // La riga intera si legge PRIMA di cancellarla e finisce nel log: dopo la
  // delete non resta nulla da consultare (stesso pattern di eliminaContatto).
  const record = await leggiPrenotazione(id)

  const { error } = await supabase.from('iscrizioni_eventi').delete().eq('id', idNumerico(id))
  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'evento_prenotazione_eliminata', {
    entita: 'iscrizioni_eventi',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(record),
      email_contatto: record?.email ?? null,
      evento: record?.nome_evento ?? null,
      record_cancellato: record ?? null,
    },
  })

  rinfresca()
  return { ok: true }
}
