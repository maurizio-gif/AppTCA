export type GruppoContatto = 'adulti' | 'junior'
export type TipoContatto = 'messaggio' | 'appuntamento_telefonico' | 'appuntamento_in_sede'

// "Adulti" e' anche il contenitore di default per le richieste senza
// gruppo_attivita esplicito (form generici non legati alla scuola tennis
// junior): solo cio' che e' etichettato "junior" finisce nella sezione
// Junior, tutto il resto va in Adulti. Stessa regola usata sia dalle due
// pagine Enquiries sia dai contatori nella Dashboard, cosi' i numeri
// restano coerenti tra le due viste.
export function apparteneAGruppo(gruppoAttivita: string | null | undefined, gruppo: GruppoContatto): boolean {
  const chiave = (gruppoAttivita || '').toLowerCase()
  if (gruppo === 'junior') return chiave === 'junior'
  return chiave !== 'junior'
}

// Il form non ha un campo dedicato "messaggio vs appuntamento": lo
// deduciamo da tipo_richiesta (testo libero) e dalla presenza di una
// data_richiesta. "sede"/"visita" nel testo -> appuntamento in sede (chi
// scrive "visita" intende venire di persona a vedere la struttura),
// altrimenti se e' un appuntamento lo trattiamo come telefonico (il caso
// piu' comune per una richiesta di richiamata).
export function classificaContatto(riga: {
  tipo_richiesta?: string | null
  data_richiesta?: string | null
  ora_richiesta?: string | null
}): TipoContatto {
  const tipo = (riga.tipo_richiesta || '').toLowerCase()
  const eAppuntamento = tipo.includes('appuntamento') || !!riga.data_richiesta || !!riga.ora_richiesta
  if (!eAppuntamento) return 'messaggio'
  return tipo.includes('sede') || tipo.includes('visita') ? 'appuntamento_in_sede' : 'appuntamento_telefonico'
}
