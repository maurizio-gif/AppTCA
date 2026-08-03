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

// Riassunto leggibile della colonna "dettagli" per la tabella del log:
// ogni azione ha una forma diversa di dettagli (vedi i punti di chiamata
// di registraLog), quindi qui si traduce caso per caso invece di mostrare
// il JSON grezzo. Un'azione senza caso dedicato ricade sull'id del record
// coinvolto, o su un trattino se non c'e' nulla da mostrare.
export function formattaDettagliLog(riga: {
  azione: string
  entita_id: string | null
  dettagli: unknown
}): string {
  const d = (riga.dettagli ?? {}) as Record<string, any>

  switch (riga.azione) {
    case 'login_fallito':
      return d.motivo ? `motivo: ${d.motivo}` : '—'
    case 'utente_invitato':
      return d.email_target ? `invitato: ${d.email_target}` : '—'
    case 'utente_rimosso':
      return d.email_target ? `rimosso: ${d.email_target}` : '—'
    case 'permesso_invitare_modificato':
    case 'permesso_cancellare_modificato':
      return d.email_target ? `${d.email_target} → ${d.valore ? 'Sì' : 'No'}` : '—'
    case 'sezioni_modificate':
      return d.email_target
        ? `${d.email_target} → ${Array.isArray(d.sezioni) && d.sezioni.length ? d.sezioni.join(', ') : 'nessuna'}`
        : '—'
    case 'contatto_gestito':
      return d.gestito ? 'segnato come gestito' : 'segnato come da gestire'
    case 'contatto_nota_salvata':
      return 'nota aggiornata'
    case 'contatto_cancellato':
      return 'record cancellato definitivamente'
    case 'scuola_tennis_caricato_pgm':
    case 'summer_camp_caricato_pgm':
      return d.caricato ? 'segnato come caricato su PerfectGym' : 'segnato come non caricato'
    default:
      return riga.entita_id ? `id: ${riga.entita_id}` : '—'
  }
}
