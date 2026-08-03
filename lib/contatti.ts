export type GruppoContatto = 'adulti' | 'junior'

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
