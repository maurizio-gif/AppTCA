import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Server-only (usa il client service role): importare solo da Server
// Action/Server Component, mai da un file "use client".

// Etichette in italiano per ogni azione registrata: usate sia per il
// filtro sia per la colonna "Azione" in /dashboard/log-operatori. Una
// chiave senza etichetta qui mostra semplicemente la chiave grezza (vedi
// etichettaAzione), non serve aggiornare altro per una nuova azione.
export const AZIONI_LOG: Record<string, string> = {
  login: 'Accesso riuscito',
  login_fallito: 'Accesso rifiutato',
  logout: 'Uscita',
  password_impostata: 'Password impostata',
  utente_invitato: 'Utente invitato',
  utente_rimosso: 'Utente rimosso',
  permesso_invitare_modificato: 'Permesso "Può invitare" modificato',
  permesso_cancellare_modificato: 'Permesso "Può cancellare" modificato',
  permesso_riassegnare_modificato: 'Permesso "Può riassegnare le opportunità" modificato',
  sezioni_modificate: 'Sezioni visibili modificate',
  contatto_gestito: 'Contatto: stato gestione modificato',
  contatto_nota_salvata: 'Contatto: nota salvata',
  appuntamento_completato: 'Appuntamento: segnato come fatto',
  appuntamento_riaperto: 'Appuntamento: riaperto',
  contatto_cancellato: 'Contatto: cancellato definitivamente',
  // Azione di prima della pipeline (vecchio toggle Da gestire/Gestito):
  // resta qui per i record storici del registro.
  invito_amico_gestito: 'Invita un amico: stato gestione modificato',
  invito_amico_nota_salvata: 'Invita un amico: nota salvata',
  invito_amico_preso_in_gestione: 'Invita un amico: preso in gestione',
  invito_amico_stato_cambiato: 'Invita un amico: stato pipeline cambiato',
  invito_amico_riaperto: 'Invita un amico: gestione riaperta',
  invito_amico_riassegnato: 'Invita un amico: riassegnato a un altro operatore',
  invito_amico_credito_caricato: 'Invita un amico: credito al socio caricato',
  opportunita_presa_in_gestione: 'Opportunità: presa in carico',
  opportunita_stato_cambiato: 'Opportunità: stato cambiato',
  opportunita_riaperta: 'Opportunità: riaperta',
  opportunita_riassegnata: 'Opportunità: passata a un altro operatore',
  // Azione non piu' possibile (il campo nota sul lead e' stato rimosso):
  // resta l'etichetta per le righe storiche del registro.
  opportunita_nota_salvata: 'Opportunità: nota salvata',
  persone_unite: 'Anagrafica: due schede unite',
  duplicato_ignorato: 'Anagrafica: coppia segnata come persone diverse',
  task_creato: 'Agenda: task creato',
  task_completato: 'Agenda: task completato',
  task_annullato: 'Agenda: task annullato',
  task_riaperto: 'Agenda: task riaperto',
  task_eliminato: 'Agenda: task eliminato',
  scuola_tennis_caricato_pgm: 'Scuola Tennis: stato PerfectGym modificato',
  summer_camp_caricato_pgm: 'Summer Camp: stato PerfectGym modificato',
  timbratura_entrata: 'Timbratura: entrata',
  timbratura_uscita: 'Timbratura: uscita',
  timbratura_rifiutata: 'Timbratura: rifiutata (fuori zona)',
  timbratura_modificata: 'Timbratura: turno corretto a mano',
  timbratura_eliminata: 'Timbratura: turno cancellato',
  notifica_inviata: 'Notifica interna inviata',
}

export function etichettaAzione(azione: string): string {
  return AZIONI_LOG[azione] ?? azione
}

// Nome leggibile del record su cui e' stata fatta l'azione, da salvare nel
// log insieme all'id: l'id da solo non dice nulla a chi rilegge il
// registro, e se il record viene cancellato in seguito non c'e' piu' modo
// di risalire a chi fosse. Le tabelle dei form usano prefissi diversi per
// la stessa cosa (amico_nome, minore_nome, genitore_nome), quindi si
// provano in ordine invece di avere una funzione per tabella.
export function etichettaRecord(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null

  const coppieNome: [unknown, unknown][] = [
    [record.nome, record.cognome],
    [record.amico_nome, record.amico_cognome],
    [record.minore_nome, record.minore_cognome],
    [record.genitore_nome, record.genitore_cognome],
  ]
  for (const [nome, cognome] of coppieNome) {
    const testo = `${nome ?? ''} ${cognome ?? ''}`.trim()
    if (testo) return testo
  }

  const email = record.email ?? record.amico_email ?? record.genitore_email ?? record.email_socio
  return typeof email === 'string' && email ? email : null
}

type Dettagli = Record<string, unknown>

// "Fire and forget" verso audit_log: un problema nel log (tabella non
// ancora creata, rete, ecc.) non deve mai far fallire l'azione vera e
// propria dell'operatore, quindi qui non si propaga mai un'eccezione.
export async function registraLog(
  email: string | null | undefined,
  azione: string,
  opts?: { entita?: string; entitaId?: string; dettagli?: Dettagli }
) {
  try {
    const supabase = createSupabaseServiceClient()
    await supabase.from('audit_log').insert({
      email: email ?? null,
      azione,
      entita: opts?.entita ?? null,
      entita_id: opts?.entitaId ?? null,
      dettagli: (opts?.dettagli ?? null) as any,
    })
  } catch {
    // Vedi commento sopra: il log e' un'informazione accessoria.
  }
}
