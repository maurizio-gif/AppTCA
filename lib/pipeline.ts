// Pipeline di gestione di un lead: stati, transizioni ed etichette stanno
// qui e non dentro i componenti, cosi' portarla su un'altra sezione (le
// Enquiries, prima o poi) e' questione di riusare questo file invece di
// riscrivere le stesse regole. Oggi la usa solo "Invita un amico" (vedi
// app/dashboard/invita-amico).
//
//   nuovo -> in_gestione -> vinto -> credito_caricato   (finale)
//                        -> perso                        (finale)
//
// "credito caricato" e' lo step che permette all'operatore di chiudere
// davvero la gestione: un lead vinto resta aperto finche' il credito non e'
// stato caricato.
export const STATI = ['nuovo', 'in_gestione', 'vinto', 'credito_caricato', 'perso'] as const
export type StatoPipeline = (typeof STATI)[number]

export const ETICHETTE_STATO: Record<StatoPipeline, string> = {
  nuovo: 'Nuovo',
  in_gestione: 'In gestione',
  vinto: 'Vinto',
  credito_caricato: 'Credito caricato',
  perso: 'Perso',
}

// Varianti di .richiesta-badge gia' esistenti in globals.css: nessuna
// classe nuova per gli stati, cosi' i badge restano uguali a quelli usati
// altrove nel CRM.
export const CLASSE_STATO: Record<StatoPipeline, string> = {
  nuovo: 'richiesta-ambra',
  in_gestione: 'richiesta-blu',
  vinto: 'richiesta-verde',
  credito_caricato: 'richiesta-viola',
  perso: 'richiesta-neutro',
}

// Percorso "buono" del lead, quello che si mostra come avanzamento: perso e'
// un'uscita laterale, non un passo avanti, quindi resta fuori da questa fila
// (vedi components/PipelineBadge.tsx e PipelineInvito).
export const PASSI_AVANZAMENTO: readonly StatoPipeline[] = ['nuovo', 'in_gestione', 'vinto', 'credito_caricato']

// Stati finali: la gestione e' chiusa, la riga non e' piu' carico di
// lavoro. Ci si torna solo riaprendo il lead (e puo' farlo solo un
// amministratore, vedi lib/auth/permessi.ts).
export const STATI_FINALI: readonly StatoPipeline[] = ['perso', 'credito_caricato']

// Passaggi ammessi. "vinto -> perso" c'e' di proposito: capita che un lead
// dato per vinto non arrivi mai al credito caricato, e senza questa
// transizione resterebbe aperto per sempre.
export const TRANSIZIONI: Record<StatoPipeline, readonly StatoPipeline[]> = {
  nuovo: ['in_gestione'],
  in_gestione: ['vinto', 'perso'],
  vinto: ['credito_caricato', 'perso'],
  credito_caricato: [],
  perso: [],
}

// Etichetta del pulsante che porta a quello stato (non il nome dello
// stato: "Prendi in gestione" e' un'azione, "In gestione" e' un risultato).
export const ETICHETTE_AZIONE: Record<StatoPipeline, string> = {
  nuovo: 'Riporta a nuovo',
  in_gestione: 'Prendi in gestione',
  vinto: 'Segna vinto',
  credito_caricato: 'Credito caricato',
  perso: 'Segna perso',
}

// Passaggi che chiudono (o quasi) la gestione e per cui serve una nota
// salvata: prendere in gestione invece deve restare un click, altrimenti
// nessuno lo fa e il dato di presa in carico non vale niente.
export const STATI_CON_NOTA: readonly StatoPipeline[] = ['vinto', 'perso']

export function eStatoValido(valore: string | null | undefined): valore is StatoPipeline {
  return !!valore && (STATI as readonly string[]).includes(valore)
}

// Uno stato non riconosciuto (riga vecchia, valore scritto a mano sul DB)
// vale "nuovo": meglio vederla in cima al lavoro da fare che perderla.
export function normalizzaStato(valore: string | null | undefined): StatoPipeline {
  return eStatoValido(valore) ? valore : 'nuovo'
}

export function eStatoFinale(stato: StatoPipeline): boolean {
  return STATI_FINALI.includes(stato)
}

export function transizioneAmmessa(da: StatoPipeline, a: StatoPipeline): boolean {
  return TRANSIZIONI[da].includes(a)
}

// Filtri della pagina: raggruppano gli stati per carico di lavoro, non uno
// per uno ("chiusi" tiene insieme persi e crediti caricati, che e' come li
// si guarda in pratica).
export const FILTRI = ['nuovi', 'in_gestione', 'da_caricare', 'chiusi', 'tutti'] as const
export type FiltroPipeline = (typeof FILTRI)[number]

export const OPZIONI_FILTRO = [
  { valore: 'nuovi', etichetta: 'Nuovi' },
  { valore: 'in_gestione', etichetta: 'In gestione' },
  { valore: 'da_caricare', etichetta: 'Vinti da caricare' },
  { valore: 'chiusi', etichetta: 'Chiusi (persi e caricati)' },
  { valore: 'tutti', etichetta: 'Tutti' },
]

// Assente o non valido = "nuovi": e' quello che si vede aprendo la pagina
// dal menu, cioe' il lavoro non ancora preso in carico da nessuno.
export function parseFiltro(raw: string | undefined): FiltroPipeline {
  if (raw && (FILTRI as readonly string[]).includes(raw)) return raw as FiltroPipeline
  return 'nuovi'
}

// null = nessun filtro sullo stato (tutti).
export function statiDelFiltro(filtro: FiltroPipeline): StatoPipeline[] | null {
  switch (filtro) {
    case 'nuovi':
      return ['nuovo']
    case 'in_gestione':
      return ['in_gestione']
    case 'da_caricare':
      return ['vinto']
    case 'chiusi':
      return ['perso', 'credito_caricato']
    default:
      return null
  }
}
