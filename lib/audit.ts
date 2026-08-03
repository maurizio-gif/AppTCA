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
  sezioni_modificate: 'Sezioni visibili modificate',
  contatto_gestito: 'Contatto: stato gestione modificato',
  contatto_nota_salvata: 'Contatto: nota salvata',
  contatto_cancellato: 'Contatto: cancellato definitivamente',
  scuola_tennis_caricato_pgm: 'Scuola Tennis: stato PerfectGym modificato',
  summer_camp_caricato_pgm: 'Summer Camp: stato PerfectGym modificato',
  timbratura_entrata: 'Timbratura: entrata',
  timbratura_uscita: 'Timbratura: uscita',
  timbratura_rifiutata: 'Timbratura: rifiutata (fuori zona)',
  notifica_inviata: 'Notifica interna inviata',
}

export function etichettaAzione(azione: string): string {
  return AZIONI_LOG[azione] ?? azione
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
