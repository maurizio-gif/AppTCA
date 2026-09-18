// Letture per elenco di id (.in('id', [...])) senza farle esplodere.
//
// PostgREST mette gli id nella query string: oltre qualche centinaio di UUID
// la richiesta supera il limite del gateway e non parte nemmeno - torna
// `data: null` con un errore dal messaggio vuoto. Chi legge solo `data` non se
// ne accorge: in agenda voleva dire perdere di colpo TUTTI i nomi delle
// persone (il calendario mostrava il titolo del task al posto del nome) man
// mano che le voci in agenda crescevano, senza nessun errore a schermo.
//
// Misurato: 300 id = 11,7 KB di URL, 500 id non parte piu'. Si legge a
// blocchi da 100 (~4 KB), in parallelo, e l'errore torna a chi chiama invece
// di sparire.
const PER_BLOCCO = 100

export async function leggiABlocchi<T>(
  ids: string[],
  leggi: (blocco: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ righe: T[]; errore: string | null }> {
  const unici = [...new Set(ids.filter(Boolean))]
  if (unici.length === 0) return { righe: [], errore: null }

  const blocchi: string[][] = []
  for (let i = 0; i < unici.length; i += PER_BLOCCO) blocchi.push(unici.slice(i, i + PER_BLOCCO))

  const risultati = await Promise.all(blocchi.map((blocco) => leggi(blocco)))
  const errore = risultati.find((risultato) => risultato.error)?.error

  return {
    righe: risultati.flatMap((risultato) => risultato.data ?? []),
    // Il gateway che rifiuta la richiesta non lascia un messaggio: meglio una
    // frase generica che una stringa vuota in faccia a chi legge l'avviso.
    errore: errore ? errore.message || 'richiesta rifiutata dal database' : null,
  }
}
