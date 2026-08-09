// Il tracciamento (webhook n8n ping-tca -> tabella "accessi") registra un
// pageview per riga, con lo stesso "vid" del form_contatti/form_scuola_tennis/
// ecc.: e' l'id del visitatore lato browser, generato e riletto dal sito
// prima di ogni invio. Qui raggruppiamo gli accessi per vid in "sessioni" di
// navigazione e le abbiniamo all'anagrafica del contatto che ha lo stesso vid
// (se esiste), cosi' la sezione Visite al sito mostra chi ha visitato cosa
// senza dover incrociare le tabelle a mano.

export type RigaAccesso = {
  id: number
  created_at: string
  vid: string | null
  pagina: string | null
  referrer: string | null
  utm: unknown
}

export type OrigineContatto = 'form_contatti' | 'form_scuola_tennis' | 'form_summer_camp' | 'form_invita_amico'

export const ETICHETTA_ORIGINE: Record<OrigineContatto, string> = {
  form_contatti: 'Enquiry',
  form_scuola_tennis: 'Scuola tennis',
  form_summer_camp: 'Summer Camp',
  form_invita_amico: 'Invita un amico',
}

export type ContattoAnagrafica = {
  origine: OrigineContatto
  vid: string
  created_at: string
  nome: string | null
  cognome: string | null
  email: string | null
}

export type SessioneVisita = {
  vid: string
  primaVisita: string
  ultimaVisita: string
  pagine: RigaAccesso[]
  contatto: ContattoAnagrafica | null
}

// Un vid puo' comparire su piu' moduli (es. chi visita il sito e poi compila
// sia "Parliamone" sia "Scuola tennis"): teniamo l'anagrafica piu' recente,
// e' quella con i dati piu' aggiornati per quel visitatore.
export function costruisciSessioni(accessi: RigaAccesso[], contatti: ContattoAnagrafica[]): SessioneVisita[] {
  const contattoPerVid = new Map<string, ContattoAnagrafica>()
  for (const contatto of contatti) {
    if (!contatto.vid) continue
    const esistente = contattoPerVid.get(contatto.vid)
    if (!esistente || contatto.created_at > esistente.created_at) {
      contattoPerVid.set(contatto.vid, contatto)
    }
  }

  const pagineePerVid = new Map<string, RigaAccesso[]>()
  for (const accesso of accessi) {
    if (!accesso.vid) continue
    if (!pagineePerVid.has(accesso.vid)) pagineePerVid.set(accesso.vid, [])
    pagineePerVid.get(accesso.vid)!.push(accesso)
  }

  const sessioni: SessioneVisita[] = []
  for (const [vid, pagineVid] of pagineePerVid) {
    // Piu' recente per prima: e' l'ordine in cui interessa leggerle (l'ultima
    // pagina vista e' quella piu' vicina all'eventuale contatto lasciato).
    const ordinate = [...pagineVid].sort((a, b) => b.created_at.localeCompare(a.created_at))
    sessioni.push({
      vid,
      primaVisita: ordinate[ordinate.length - 1].created_at,
      ultimaVisita: ordinate[0].created_at,
      pagine: ordinate,
      contatto: contattoPerVid.get(vid) ?? null,
    })
  }

  return sessioni.sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita))
}

export function corrispondeRicercaVisita(sessione: SessioneVisita, query: string): boolean {
  if (sessione.vid.toLowerCase().includes(query)) return true
  const contatto = sessione.contatto
  if (!contatto) return false
  return [contatto.nome, contatto.cognome, contatto.email].some((valore) =>
    (valore ?? '').toLowerCase().includes(query)
  )
}
