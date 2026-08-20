// Anagrafica deduplicata (tabella persone): la stessa persona compila piu'
// moduli nel tempo, qui ha una riga sola. La deduplicazione la fa il
// database (trova_o_crea_persona, chiamata dai trigger dei moduli): questo
// file contiene solo cio' che serve a mostrarla e cercarla.
//
// Nessun import server-only: usato sia dai Server Component sia dai client.

export type RigaPersona = Record<string, any>

export const ETICHETTE_FONTE: Record<string, string> = {
  form_contatti: 'Enquiry dal sito',
  form_invita_amico: 'Invita un amico',
  form_scuola_tennis: 'Scuola tennis',
  form_summer_camp: 'Summer camp',
  iscrizioni_eventi: 'Iscrizione evento',
  hubspot_storico: 'Storico HubSpot',
  perfectgym_crm: 'CRM PerfectGym',
}

export function etichettaFonte(fonte: string | null | undefined): string | null {
  if (!fonte) return null
  return ETICHETTE_FONTE[fonte] ?? fonte
}

// Nome e cognome quando ci sono, altrimenti l'email: una persona senza nome
// esiste (es. il socio di un invito, di cui conosciamo solo l'email) e deve
// restare riconoscibile.
export function nomePersona(persona: RigaPersona | null | undefined): string {
  if (!persona) return '—'
  const nome = `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim()
  return nome || persona.email || 'Senza nome'
}

// Stringa di ricerca su una persona/riga con dati di contatto: nome,
// cognome, "nome cognome" insieme (altrimenti cercando "mario rossi" non
// troverebbe una riga con nome="Mario" e cognome="Rossi" in due campi
// separati), email, cellulare, e qualunque testo extra rilevante per quella
// sorgente (es. il titolo di un task d'agenda). Sempre in minuscolo: chi
// cerca confronta gia' in minuscolo, qui si prepara una volta invece che ad
// ogni digitazione. Usata da Enquiries e dall'Agenda (vedi lib/agenda.ts).
export function testoRicerca({
  nome,
  cognome,
  email,
  cellulare,
  extra,
}: {
  nome?: string | null
  cognome?: string | null
  email?: string | null
  cellulare?: string | null
  extra?: (string | null | undefined)[]
}): string {
  const pulito = (v: string | null | undefined) => (v ?? '').trim()
  const n = pulito(nome)
  const c = pulito(cognome)
  const pezzi = [n, c, n && c ? `${n} ${c}` : '', pulito(email), pulito(cellulare), ...(extra ?? []).map(pulito)]
  return pezzi.filter(Boolean).join(' ').toLowerCase()
}

// Ricerca lato server su un elenco gia' caricato: nome, cognome, email,
// cellulare (anche scritto con prefisso o spazi, vedi cellulare_norm).
export function corrispondePersona(persona: RigaPersona, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const soloCifre = q.replace(/\D/g, '')
  if (soloCifre.length >= 4 && String(persona.cellulare_norm ?? '').includes(soloCifre)) return true

  return ['nome', 'cognome', 'email', 'codice_fiscale', 'pgm_member_id'].some((campo) => {
    const valore = persona[campo]
    return typeof valore === 'string' && valore.toLowerCase().includes(q)
  })
}

// Quante richieste ha portato una persona, per il chip identita' e la
// scheda: i conteggi arrivano gia' fatti da chi interroga il DB.
export type ConteggiPersona = {
  enquiries: number
  inviti: number
  scuolaTennis: number
  summerCamp: number
  eventi: number
}

export function totaleRichieste(conteggi: ConteggiPersona): number {
  return conteggi.enquiries + conteggi.inviti + conteggi.scuolaTennis + conteggi.summerCamp + conteggi.eventi
}
