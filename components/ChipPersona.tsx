'use client'

import Link from 'next/link'

// Identita' della persona su una riga di richiesta: dice subito che non e' un
// contatto nuovo ("3 richieste") e porta alla sua scheda, dove ci sono tutti
// i moduli, il lead e l'agenda. E' il modo in cui l'anagrafica deduplicata
// (lib/persone.ts) si vede mentre si lavora, senza dover cercare nulla.
//
// Client component solo per fermare la propagazione del click: la riga
// attorno e' un accordion, e aprire la scheda non deve anche richiuderla.
export function ChipPersona({
  id,
  nome,
  richieste,
  storico = false,
}: {
  id: string
  nome: string
  // Quante richieste ha portato in tutto (moduli di ogni sezione).
  richieste: number
  // Persona che finora esisteva solo nello storico HubSpot: e' un ritorno,
  // non un contatto nuovo.
  storico?: boolean
}) {
  return (
    <Link
      href={`/dashboard/persone/${id}`}
      className="chip-persona"
      // La riga attorno e' un accordion cliccabile: il link non deve anche
      // aprirla o chiuderla.
      onClick={(e) => e.stopPropagation()}
    >
      <span className="chip-persona-nome">{nome}</span>
      {richieste > 1 && <span className="chip-persona-conteggio">{richieste} richieste</span>}
      {storico && <span className="chip-persona-storico">già nello storico</span>}
    </Link>
  )
}
