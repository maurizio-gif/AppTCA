'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { etichettaRecord, registraLog } from '@/lib/audit'
import { puoAmministrare } from '@/lib/auth/permessi'
import {
  ETICHETTE_STATO,
  STATI_CON_NOTA,
  eStatoFinale,
  eStatoValido,
  normalizzaStato,
  transizioneAmmessa,
  type StatoPipeline,
} from '@/lib/pipeline'

type Risultato = { ok: true } | { ok: false; errore: string }

// Risultato come valore di ritorno, non un throw: in produzione Next.js
// oscura sempre il messaggio di un errore lanciato da una Server Action,
// quindi l'unico modo per far arrivare un messaggio leggibile al client e'
// restituirlo come dato normale (vedi contatti/actions.ts).
//
// Chi prende in gestione l'invito viene letto dall'header impostato dal
// middleware (email gia' validata con Supabase Auth), mai da un valore
// passato dal client: cosi' non si puo' falsificare l'assegnazione via
// devtools.
const CAMPI_INVITO = 'amico_nome, amico_cognome, amico_email, note, stato, assegnato_a'

function emailCorrente(): string | null {
  const email = headers().get('x-tca-user-email')
  return email ? email.trim().toLowerCase() : null
}

function stessaPersona(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
}

// gestito/gestito_da/gestito_il restano allineati allo stato: sono le
// colonne che il resto del CRM (e i flussi n8n) leggeva prima della
// pipeline, e tenerle in pari costa una riga e non lascia nessuno indietro.
// Lo stato resta l'unica fonte di verita', queste sono derivate.
function campiCompatibilita(stato: StatoPipeline, assegnatoA: string | null, assegnatoIl: string | null) {
  return {
    gestito: stato !== 'nuovo',
    gestito_da: stato === 'nuovo' ? null : assegnatoA,
    gestito_il: stato === 'nuovo' ? null : assegnatoIl,
  }
}

// Il primo che prende in gestione l'invito diventa il titolare: da qui in
// avanti solo lui (o un amministratore) puo' farlo avanzare. Nessuna nota
// richiesta, deve restare un click: se prendere in carico costasse fatica
// nessuno lo farebbe e il dato di presa in carico non varrebbe niente.
export async function prendiInGestione(id: string): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()
  const email = emailCorrente()

  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }

  const { data: invito, error: fetchError } = await supabase
    .from('form_invita_amico')
    .select(CAMPI_INVITO)
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!invito) return { ok: false, errore: 'Invito non trovato: forse è stato cancellato.' }

  const stato = normalizzaStato(invito.stato)

  // Corsa fra due consulenti che cliccano insieme: vince chi arriva primo,
  // il secondo vede di chi e' invece di sovrascriverlo.
  if (stato !== 'nuovo') {
    return {
      ok: false,
      errore: invito.assegnato_a
        ? `Questo invito è già assegnato a ${invito.assegnato_a} (${ETICHETTE_STATO[stato]}).`
        : `Questo invito non è più nuovo (${ETICHETTE_STATO[stato]}).`,
    }
  }

  const adesso = new Date().toISOString()

  const { data: aggiornate, error } = await supabase
    .from('form_invita_amico')
    .update({
      stato: 'in_gestione',
      assegnato_a: email,
      assegnato_il: adesso,
      stato_da: email,
      stato_il: adesso,
      ...campiCompatibilita('in_gestione', email, adesso),
    })
    .eq('id', id)
    // Se nel frattempo qualcun altro l'ha preso, questa update non tocca
    // nulla: il controllo sopra da solo non basta, fra select e update c'e'
    // sempre una finestra. Il select serve proprio ad accorgersene.
    .eq('stato', 'nuovo')
    .select('id')

  if (error) return { ok: false, errore: error.message }
  if (!aggiornate?.length) {
    return { ok: false, errore: 'Un altro operatore ha preso in gestione questo invito un istante prima di te.' }
  }

  await registraLog(email, 'invito_amico_preso_in_gestione', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(invito), email_contatto: invito.amico_email ?? null, assegnato_a: email },
  })

  revalidatePath('/dashboard/invita-amico')
  revalidatePath('/dashboard')

  return { ok: true }
}

// Avanzamento nella pipeline (vedi lib/pipeline.ts per gli stati e le
// transizioni ammesse). Tutti i controlli sono anche qui e non solo nella
// UI: una Server Action resta chiamabile a mano.
export async function cambiaStato(id: string, nuovoStato: string, motivoPerso?: string): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()
  const email = emailCorrente()

  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }
  if (!eStatoValido(nuovoStato)) return { ok: false, errore: 'Stato non riconosciuto.' }

  const { data: invito, error: fetchError } = await supabase
    .from('form_invita_amico')
    .select(`${CAMPI_INVITO}, assegnato_il`)
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { ok: false, errore: fetchError.message }
  if (!invito) return { ok: false, errore: 'Invito non trovato: forse è stato cancellato.' }

  const stato = normalizzaStato(invito.stato)

  // Prendere in carico un invito nuovo e' l'unico passaggio aperto a tutti
  // ed e' anche quello che assegna il lead: ha un'azione dedicata, qui la
  // richiamiamo invece di duplicarne le regole (o di bloccarla per via del
  // controllo sul titolare, che su un invito nuovo non c'e' ancora).
  if (stato === 'nuovo' && nuovoStato === 'in_gestione') {
    return prendiInGestione(id)
  }

  if (!transizioneAmmessa(stato, nuovoStato)) {
    return {
      ok: false,
      errore: `Da «${ETICHETTE_STATO[stato]}» non si può passare a «${ETICHETTE_STATO[nuovoStato]}».`,
    }
  }

  // Il lead e' di chi lo ha preso in carico: gli altri lo vedono ma non lo
  // muovono. Un amministratore si', serve per le ferie e i passaggi di mano.
  if (!stessaPersona(invito.assegnato_a, email) && !(await puoAmministrare(email))) {
    return {
      ok: false,
      errore: `Questo invito è assegnato a ${invito.assegnato_a ?? 'un altro operatore'}: solo chi lo gestisce (o un amministratore) può cambiarne lo stato.`,
    }
  }

  if (STATI_CON_NOTA.includes(nuovoStato) && !invito.note?.trim()) {
    return {
      ok: false,
      errore: `Scrivi e salva una nota prima di segnare l'invito come «${ETICHETTE_STATO[nuovoStato]}».`,
    }
  }

  const motivo = (motivoPerso ?? '').trim()
  if (nuovoStato === 'perso' && !motivo) {
    return { ok: false, errore: 'Indica il motivo per cui il lead è perso.' }
  }

  const adesso = new Date().toISOString()

  const { data: aggiornate, error } = await supabase
    .from('form_invita_amico')
    .update({
      stato: nuovoStato,
      stato_da: email,
      stato_il: adesso,
      // Solo quando si perde: uscendo da "perso" (riapertura) il motivo
      // vecchio non deve restare attaccato al lead.
      motivo_perso: nuovoStato === 'perso' ? motivo : null,
      chiuso_il: eStatoFinale(nuovoStato) ? adesso : null,
      ...campiCompatibilita(nuovoStato, invito.assegnato_a ?? null, invito.assegnato_il ?? null),
    })
    .eq('id', id)
    // Come sopra: la riga deve essere ancora nello stato che abbiamo letto,
    // altrimenti stiamo scavalcando il cambio di qualcun altro.
    .eq('stato', invito.stato)
    .select('id')

  if (error) return { ok: false, errore: error.message }
  if (!aggiornate?.length) {
    return { ok: false, errore: 'Lo stato è cambiato mentre stavi lavorando: ricarica la pagina e riprova.' }
  }

  await registraLog(email, 'invito_amico_stato_cambiato', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(invito),
      email_contatto: invito.amico_email ?? null,
      da: ETICHETTE_STATO[stato],
      a: ETICHETTE_STATO[nuovoStato],
      motivo_perso: nuovoStato === 'perso' ? motivo : null,
    },
  })

  revalidatePath('/dashboard/invita-amico')
  revalidatePath('/dashboard')

  return { ok: true }
}

// Perso e credito caricato sono stati finali: riaprirli e' un'eccezione, e
// la puo' fare solo un amministratore. Il lead torna "in gestione" allo
// stesso titolare, non a chi riapre.
export async function riapriGestione(id: string): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()
  const email = emailCorrente()

  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }
  if (!(await puoAmministrare(email))) {
    return { ok: false, errore: 'Solo un amministratore può riaprire un invito già chiuso.' }
  }

  const { data: invito } = await supabase
    .from('form_invita_amico')
    .select(`${CAMPI_INVITO}, assegnato_il`)
    .eq('id', id)
    .maybeSingle()

  if (!invito) return { ok: false, errore: 'Invito non trovato: forse è stato cancellato.' }

  const stato = normalizzaStato(invito.stato)
  if (!eStatoFinale(stato)) {
    return { ok: false, errore: `Questo invito non è chiuso (${ETICHETTE_STATO[stato]}): non c'è nulla da riaprire.` }
  }

  const adesso = new Date().toISOString()

  const { error } = await supabase
    .from('form_invita_amico')
    .update({
      stato: 'in_gestione',
      stato_da: email,
      stato_il: adesso,
      motivo_perso: null,
      chiuso_il: null,
      ...campiCompatibilita('in_gestione', invito.assegnato_a ?? null, invito.assegnato_il ?? null),
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'invito_amico_riaperto', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(invito), email_contatto: invito.amico_email ?? null, da: ETICHETTE_STATO[stato] },
  })

  revalidatePath('/dashboard/invita-amico')
  revalidatePath('/dashboard')

  return { ok: true }
}

// Passaggio di mano (ferie, uscita di un operatore): solo amministratori, e
// solo verso qualcuno che esiste in staff_users.
export async function riassegna(id: string, nuovoAssegnato: string): Promise<Risultato> {
  const supabase = createSupabaseServiceClient()
  const email = emailCorrente()

  if (!email) return { ok: false, errore: 'Sessione scaduta: ricarica la pagina e rientra.' }
  if (!(await puoAmministrare(email))) {
    return { ok: false, errore: 'Solo un amministratore può riassegnare un invito.' }
  }

  const destinatario = nuovoAssegnato.trim().toLowerCase()
  if (!destinatario) return { ok: false, errore: 'Scegli a chi assegnare l’invito.' }

  const { data: staff } = await supabase
    .from('staff_users')
    .select('email')
    .eq('email', destinatario)
    .maybeSingle()

  if (!staff) return { ok: false, errore: 'Quella persona non è fra gli operatori del CRM.' }

  const { data: invito } = await supabase
    .from('form_invita_amico')
    .select(CAMPI_INVITO)
    .eq('id', id)
    .maybeSingle()

  if (!invito) return { ok: false, errore: 'Invito non trovato: forse è stato cancellato.' }

  const stato = normalizzaStato(invito.stato)
  const adesso = new Date().toISOString()

  const { error } = await supabase
    .from('form_invita_amico')
    .update({
      assegnato_a: destinatario,
      // Data di assegnazione al nuovo titolare: e' da qui che parte il suo
      // tempo di gestione, il precedente resta nel registro operatori.
      assegnato_il: adesso,
      // Un invito ancora "nuovo" assegnato a mano entra in gestione: senza
      // questo resterebbe nel filtro dei nuovi pur avendo un titolare.
      stato: stato === 'nuovo' ? 'in_gestione' : stato,
      stato_da: email,
      stato_il: adesso,
      ...campiCompatibilita(stato === 'nuovo' ? 'in_gestione' : stato, destinatario, adesso),
    })
    .eq('id', id)

  if (error) return { ok: false, errore: error.message }

  await registraLog(email, 'invito_amico_riassegnato', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: {
      contatto: etichettaRecord(invito),
      email_contatto: invito.amico_email ?? null,
      da: invito.assegnato_a ?? null,
      a: destinatario,
    },
  })

  revalidatePath('/dashboard/invita-amico')
  revalidatePath('/dashboard')

  return { ok: true }
}

export async function salvaNote(id: string, note: string): Promise<Risultato> {
  const email = emailCorrente()
  const supabase = createSupabaseServiceClient()

  const { data: invito } = await supabase
    .from('form_invita_amico')
    .select('amico_nome, amico_cognome, amico_email')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('form_invita_amico').update({ note }).eq('id', id)

  if (error) {
    return { ok: false, errore: error.message }
  }

  // Testo della nota e nome nel log: vedi contatti/actions.ts.
  await registraLog(email, 'invito_amico_nota_salvata', {
    entita: 'form_invita_amico',
    entitaId: id,
    dettagli: { contatto: etichettaRecord(invito), email_contatto: invito?.amico_email ?? null, nota: note },
  })

  revalidatePath('/dashboard/invita-amico')

  return { ok: true }
}
