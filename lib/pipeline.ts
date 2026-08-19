// Ciclo di gestione di un'OPPORTUNITA': stati, transizioni ed etichette
// stanno qui e non dentro i componenti, cosi' vale per ogni sezione che ne
// lavora una (vedi app/dashboard/opportunita/actions.ts).
//
//   nuovo -> in_gestione -> vinto   (finale)
//                        -> perso   (finale)
//
// Le etichette non usano mai la parola "nuovo": form_contatti ha una colonna
// "stato" verificata su PerfectGym con valori come NUOVO, NUOVO ADULTO, MAI
// AVUTO CONTRATTO, CURRENT - due "nuovo" accanto sarebbero solo confusione.
// E non si chiamano "lead": una richiesta dal sito e' un'enquiry, mentre
// l'opportunita' e' la trattativa che ne nasce, ed e' della persona.
//
// Il caricamento del credito NON e' uno stato: riguarda solo i referral (il
// credito da riconoscere al socio che ha invitato) ed e' un toggle sulla riga
// dell'invito, vedi app/dashboard/invita-amico. Una pipeline generale non deve
// portarsi dietro l'adempimento di una sola sezione.
export const STATI = ['nuovo', 'in_gestione', 'vinto', 'perso'] as const
export type StatoPipeline = (typeof STATI)[number]

export const ETICHETTE_STATO: Record<StatoPipeline, string> = {
  nuovo: 'Da prendere in carico',
  in_gestione: 'In gestione',
  vinto: 'Vinta',
  perso: 'Persa',
}

// Varianti di .richiesta-badge gia' esistenti in globals.css: nessuna
// classe nuova per gli stati, cosi' i badge restano uguali a quelli usati
// altrove nel CRM.
export const CLASSE_STATO: Record<StatoPipeline, string> = {
  nuovo: 'richiesta-ambra',
  in_gestione: 'richiesta-blu',
  vinto: 'richiesta-verde',
  perso: 'richiesta-neutro',
}

// Percorso "buono" del lead, quello che si mostra come avanzamento: perso e'
// un'uscita laterale, non un passo avanti, quindi resta fuori da questa fila
// (vedi components/PipelineBadge.tsx e PipelineInvito).
export const PASSI_AVANZAMENTO: readonly StatoPipeline[] = ['nuovo', 'in_gestione', 'vinto']

// Stati finali: la trattativa e' chiusa. Ci si torna solo riaprendo il lead,
// e puo' farlo solo un amministratore (vedi lib/auth/permessi.ts). Su un
// referral vinto resta comunque il credito da caricare, che e' un adempimento
// a parte e non riapre il lead.
export const STATI_FINALI: readonly StatoPipeline[] = ['vinto', 'perso']

export const TRANSIZIONI: Record<StatoPipeline, readonly StatoPipeline[]> = {
  nuovo: ['in_gestione'],
  in_gestione: ['vinto', 'perso'],
  vinto: [],
  perso: [],
}

// Etichetta del pulsante che porta a quello stato (non il nome dello
// stato: "Prendi in gestione" e' un'azione, "In gestione" e' un risultato).
export const ETICHETTE_AZIONE: Record<StatoPipeline, string> = {
  nuovo: 'Rimetti da prendere in carico',
  in_gestione: 'Prendi in carico',
  vinto: 'Segna vinta',
  perso: 'Segna persa',
}

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
