// Un solo posto in cui si decide com'e' fatto il file esportato: lo usano
// sia EsportaCsv (che lo scarica) sia AnteprimaReport (che lo mostra prima
// del download). Se la costruzione del CSV vivesse in due copie,
// l'anteprima potrebbe smettere di corrispondere al file senza che nulla
// lo segnali.

// Excel su Windows apre un .csv assumendo la virgola come separatore e una
// codifica locale: con il punto e virgola e il BOM iniziale ('﻿') il
// file si apre invece gia' incolonnato e con le lettere accentate giuste.
export const SEPARATORE_CSV = ';'
export const BOM_CSV = '﻿'

// Ogni valore fra virgolette (raddoppiando quelle interne): senza, un
// valore che contenga il separatore o un a capo spezzerebbe la riga in
// piu' colonne.
function escapeCella(valore: string | number): string {
  return `"${String(valore).replace(/"/g, '""')}"`
}

// Testo esatto del file, BOM escluso: righe separate da CRLF, come si
// aspetta Excel.
export function costruisciCsv(intestazioni: string[], righe: (string | number)[][]): string {
  return [intestazioni, ...righe].map((riga) => riga.map(escapeCella).join(SEPARATORE_CSV)).join('\r\n')
}

// Lettera di colonna in stile foglio di calcolo: 0 -> A, 25 -> Z, 26 -> AA.
export function letteraColonna(indice: number): string {
  let lettera = ''
  for (let n = indice; n >= 0; n = Math.floor(n / 26) - 1) {
    lettera = String.fromCharCode(65 + (n % 26)) + lettera
  }
  return lettera
}
