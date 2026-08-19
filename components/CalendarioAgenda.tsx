'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import {
  CLASSE_TIPO,
  ETICHETTE_TIPO_BREVI,
  chiaveGiorno,
  chiaveGiornoDa,
  intervalloOrario,
  raggruppaPerGiorno,
  type VoceAgenda,
} from '@/lib/agenda'

// Calendario unico dell'agenda condivisa: mostra nello stesso mese gli
// appuntamenti prenotati dal sito e i task interni (vedi lib/agenda.ts).
// Le voci arrivano gia' pronte da chi lo usa (/dashboard/agenda e il tab
// Appuntamenti delle Enquiries Adulti), che ci attacca anche il pannello di
// gestione giusto per ogni tipo di riga: qui dentro non si sa piu' da quale
// tabella venga la voce.
export type VoceCalendario = VoceAgenda & {
  // Nome dell'operatore (o email) gia' risolto: il calendario non fa query.
  assegnatoEtichetta: string | null
  // Seconda riga della cella "Chi": contatti, entita' collegata, ecc.
  sottotitolo?: React.ReactNode
  // Passati a ExpandableRow per il dettaglio della riga.
  record: Record<string, unknown>
  hiddenKeys?: string[]
  evidenza?: React.ReactNode
  extra?: React.ReactNode
  extraTitle?: string
}

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const COLONNE_TABELLA = ['Ora', 'Tipo', 'Chi', 'Assegnato a', 'Stato']

// Giorno selezionato nel calendario, leggibile dal form "nuovo task" che
// gli viene passato come prop: cliccare un giorno e poi "Aggiungi" deve
// proporre quel giorno, senza rimetterlo a mano. Il form resta un
// componente indipendente (non lo importiamo qui) proprio perche' questo
// calendario deve poter servire anche sezioni che non creano task.
const GiornoSelezionatoContext = createContext<string | null>(null)

export function useGiornoSelezionato(): string | null {
  return useContext(GiornoSelezionatoContext)
}

// Esportata perche' la usa anche la vista "Lista" dell'Agenda: stessa
// tabella del giorno selezionato, solo ripetuta giorno per giorno.
export function TabellaAgenda({ voci }: { voci: VoceCalendario[] }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            {COLONNE_TABELLA.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <AccordionGroup>
          <tbody>
            {voci.map((voce) => (
              <ExpandableRow
                key={voce.chiave}
                id={voce.chiave}
                columnCount={COLONNE_TABELLA.length + 1}
                columns={COLONNE_TABELLA}
                record={voce.record}
                hiddenKeys={voce.hiddenKeys}
                evidenza={voce.evidenza}
                extra={voce.extra}
                extraTitle={voce.extraTitle ?? 'Gestione'}
                cells={[
                  <span className="ora-con-puntino">
                    <span className={`puntino ${voce.daFare ? 'rosso' : 'verde'}`} />
                    {intervalloOrario(voce.ora, voce.durataMinuti) ?? 'Tutto il giorno'}
                  </span>,
                  <span className={`richiesta-badge ${CLASSE_TIPO[voce.tipo]}`}>
                    {ETICHETTE_TIPO_BREVI[voce.tipo]}
                  </span>,
                  <>
                    {voce.titolo}
                    {voce.sottotitolo && (
                      <>
                        <br />
                        <span className="muted">{voce.sottotitolo}</span>
                      </>
                    )}
                  </>,
                  voce.assegnatoEtichetta ?? '—',
                  voce.statoEtichetta,
                ]}
              />
            ))}
          </tbody>
        </AccordionGroup>
      </table>
    </div>
  )
}

export function CalendarioAgenda({
  voci,
  nuovoTask,
  legendaExtra,
}: {
  voci: VoceCalendario[]
  // Form di creazione (vedi NuovoTask): reso sotto la lista del giorno, con
  // il giorno selezionato disponibile via useGiornoSelezionato().
  nuovoTask?: React.ReactNode
  legendaExtra?: React.ReactNode
}) {
  const oggi = useMemo(() => new Date(), [])
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const chiaveOggi = chiaveGiornoDa(oggi)

  const { gruppi, senzaData } = useMemo(() => raggruppaPerGiorno(voci), [voci])

  // Aprendo la pagina si vede subito la giornata di oggi se c'e' qualcosa,
  // altrimenti nessun giorno aperto (come il calendario appuntamenti).
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(
    gruppi.has(chiaveOggi) ? chiaveOggi : null
  )

  const etichettaMese = new Date(anno, mese, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const primoGiornoSettimana = (new Date(anno, mese, 1).getDay() + 6) % 7 // 0 = lunedi'
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate()

  function cambiaMese(delta: number) {
    const data = new Date(anno, mese + delta, 1)
    setAnno(data.getFullYear())
    setMese(data.getMonth())
    setGiornoSelezionato(null)
  }

  function statoGiorno(chiave: string): 'rosso' | 'verde' | null {
    const lista = gruppi.get(chiave)
    if (!lista || lista.length === 0) return null
    return lista.some((voce) => voce.daFare) ? 'rosso' : 'verde'
  }

  const vociGiorno = giornoSelezionato ? gruppi.get(giornoSelezionato) ?? [] : []
  const etichettaGiornoSelezionato = giornoSelezionato
    ? new Date(`${giornoSelezionato}T00:00:00`).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  return (
    <div>
      <div className="cal-header">
        <h2 className="cal-mese">{etichettaMese}</h2>
        <div className="cal-nav">
          <button type="button" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">
            ‹
          </button>
          <button type="button" onClick={() => setGiornoSelezionato(chiaveOggi)} className="cal-oggi">
            Oggi
          </button>
          <button type="button" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
            ›
          </button>
        </div>
      </div>

      <div className="cal-legenda">
        <span>
          <span className="puntino rosso" /> c'è ancora qualcosa da fare
        </span>
        <span>
          <span className="puntino verde" /> tutto gestito
        </span>
        {legendaExtra}
      </div>

      <div className="cal-grid">
        {GIORNI_SETTIMANA.map((g) => (
          <div className="cal-dow" key={g}>
            {g}
          </div>
        ))}

        {Array.from({ length: primoGiornoSettimana }).map((_, i) => (
          <div className="cal-cella vuota" key={`vuota-${i}`} />
        ))}

        {Array.from({ length: giorniNelMese }, (_, i) => i + 1).map((giorno) => {
          const chiave = chiaveGiorno(anno, mese, giorno)
          const stato = statoGiorno(chiave)
          const lista = gruppi.get(chiave) ?? []
          const classi = ['cal-cella']
          if (chiave === chiaveOggi) classi.push('oggi')
          if (chiave === giornoSelezionato) classi.push('selezionata')
          // Ogni giorno e' cliccabile, non solo quelli con qualcosa: da un
          // giorno vuoto ci si aggiunge un task.
          classi.push('selezionabile')

          return (
            <button
              type="button"
              className={classi.join(' ')}
              key={chiave}
              onClick={() => setGiornoSelezionato(chiave === giornoSelezionato ? null : chiave)}
              aria-label={`${giorno} — ${lista.length} voci in agenda`}
            >
              <span className="cal-giorno-num">{giorno}</span>
              {stato && (
                <span className="cal-puntini">
                  <span className={`puntino ${stato}`} />
                  {lista.length > 1 && <span className="cal-conteggio">{lista.length}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {giornoSelezionato && (
        <div className="giorno-dettaglio">
          <h3>
            {etichettaGiornoSelezionato} <span className="count">{vociGiorno.length}</span>
          </h3>
          {vociGiorno.length > 0 ? (
            <TabellaAgenda voci={vociGiorno} />
          ) : (
            <p className="empty-state">Niente in agenda in questo giorno.</p>
          )}
        </div>
      )}

      {nuovoTask && (
        <GiornoSelezionatoContext.Provider value={giornoSelezionato}>
          {nuovoTask}
        </GiornoSelezionatoContext.Provider>
      )}

      {senzaData.length > 0 && (
        <div className="cal-senza-data">
          <h3>
            Senza data <span className="count">{senzaData.length}</span>
          </h3>
          <p className="muted">
            Appuntamenti arrivati dal sito senza un giorno registrato: non finiscono in nessuna casella del
            calendario, quindi restano qui.
          </p>
          <TabellaAgenda voci={senzaData} />
        </div>
      )}
    </div>
  )
}
