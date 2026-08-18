import { chiaveGiorno } from './analytics'

// Dal 15 settembre 2026 il modulo della scuola tennis non raccoglie piu'
// preiscrizioni ma prenotazioni di un provino. La distinzione e' un
// attributo della riga (colonna tipo_richiesta, con default e backfill
// lato database), non una regola calcolata al volo: cosi' si puo'
// correggere il singolo record se qualcuno compila il modulo sbagliato,
// e il dato resta vero anche se un domani la data cambia.
export const DATA_PASSAGGIO_PROVINI = '2026-09-15'

export type TipoRichiestaScuola = 'preiscrizione' | 'provino'

export const ETICHETTA_TIPO: Record<TipoRichiestaScuola, string> = {
  preiscrizione: 'Preiscrizione',
  provino: 'Prenotazione provino',
}

type RigaScuola = Record<string, any>

// La colonna e' la fonte di verita'; la regola sulla data resta come
// riserva per le righe che non ce l'hanno (una riga inserita da un flusso
// che non passa dal default, o il periodo tra il deploy del codice e
// quello della migrazione).
export function tipoRichiesta(riga: RigaScuola): TipoRichiestaScuola {
  if (riga.tipo_richiesta === 'provino' || riga.tipo_richiesta === 'preiscrizione') {
    return riga.tipo_richiesta
  }
  return chiaveGiorno(riga.created_at) >= DATA_PASSAGGIO_PROVINI ? 'provino' : 'preiscrizione'
}

// Una prenotazione provino e' un appuntamento, non un'iscrizione: non c'e'
// niente da caricare su PerfectGym, quindi conta come gia' gestita e non
// deve restare nell'elenco delle cose da fare.
export function gestita(riga: RigaScuola): boolean {
  return tipoRichiesta(riga) === 'provino' || !!riga.caricato_pgm
}

// I campi a scelta multipla del modulo (giorni, orari preferiti) arrivano
// come array jsonb: in tabella e nell'export vanno letti come elenco, non
// come "[object Object]".
export function testoElenco(valore: unknown): string {
  if (Array.isArray(valore)) return valore.filter(Boolean).join(', ') || '—'
  if (valore === null || valore === undefined || valore === '') return '—'
  return String(valore)
}
