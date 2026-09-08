import { chiaveGiorno } from './analytics'

// Dal 15 agosto 2026 il modulo della scuola tennis non raccoglie piu'
// preiscrizioni ma prenotazioni di un provino. La distinzione e' un
// attributo della riga (colonna tipo_richiesta, con default e backfill
// lato database), non una regola calcolata al volo: cosi' si puo'
// correggere il singolo record se qualcuno compila il modulo sbagliato,
// e il dato resta vero anche se un domani la data cambia.
export const DATA_PASSAGGIO_PROVINI = '2026-08-15'

export type TipoRichiestaScuola = 'preiscrizione' | 'provino' | 'iscrizione'

export const ETICHETTA_TIPO: Record<TipoRichiestaScuola, string> = {
  preiscrizione: 'Preiscrizione',
  provino: 'Prenotazione provino',
  iscrizione: 'Iscrizione',
}

// Bucket privato dei contratti firmati: nella riga teniamo il path, non un
// URL, perche' quello firmato scade. Vedi la migrazione
// form_scuola_tennis_iscrizioni_contratto.
export const BUCKET_CONTRATTI = 'contratti-scuola-tennis'
export const DURATA_URL_CONTRATTO_SECONDI = 60 * 60

type RigaScuola = Record<string, any>

// La colonna e' la fonte di verita'; la regola sulla data resta come
// riserva per le righe che non ce l'hanno (una riga inserita da un flusso
// che non passa dal default, o il periodo tra il deploy del codice e
// quello della migrazione).
export function tipoRichiesta(riga: RigaScuola): TipoRichiestaScuola {
  if (
    riga.tipo_richiesta === 'provino' ||
    riga.tipo_richiesta === 'preiscrizione' ||
    riga.tipo_richiesta === 'iscrizione'
  ) {
    return riga.tipo_richiesta
  }
  return chiaveGiorno(riga.created_at) >= DATA_PASSAGGIO_PROVINI ? 'provino' : 'preiscrizione'
}

// Una prenotazione provino e' un appuntamento, non un'iscrizione: non c'e'
// niente da caricare su PerfectGym, quindi conta come gia' gestita e non
// deve restare nell'elenco delle cose da fare. Preiscrizioni e iscrizioni
// invece su PerfectGym ci vanno, e restano da fare finche' non e' successo.
export function gestita(riga: RigaScuola): boolean {
  return tipoRichiesta(riga) === 'provino' || !!riga.caricato_pgm
}

// Il contratto firmato esiste solo per le iscrizioni: e' quello che le
// distingue dalle preiscrizioni raccolte fino al 2026.
export function haContratto(riga: RigaScuola): boolean {
  return tipoRichiesta(riga) === 'iscrizione' && !!riga.contratto_pdf_path
}

// Residenza del genitore su una riga sola, per l'export e la stampa:
// "Via Feltre 33, 20134 Milano". Il modulo chiede via, citta' e CAP; la
// provincia sopravvive solo sulle preiscrizioni raccolte fino al 2026,
// quindi si aggiunge se c'e' invece di lasciare una parentesi vuota.
export function indirizzoCompleto(riga: RigaScuola): string {
  const pulisci = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const via = pulisci(riga.indirizzo_via)
  const citta = pulisci(riga.indirizzo_citta)
  const cap = pulisci(riga.indirizzo_cap)
  const provincia = pulisci(riga.indirizzo_provincia)

  let localita = [cap, citta].filter(Boolean).join(' ')
  if (localita && provincia) localita += ` (${provincia})`
  return [via, localita].filter(Boolean).join(', ')
}

// I campi a scelta multipla del modulo (giorni, orari preferiti) arrivano
// come array jsonb: in tabella e nell'export vanno letti come elenco, non
// come "[object Object]".
export function testoElenco(valore: unknown): string {
  if (Array.isArray(valore)) return valore.filter(Boolean).join(', ') || '—'
  if (valore === null || valore === undefined || valore === '') return '—'
  return String(valore)
}
