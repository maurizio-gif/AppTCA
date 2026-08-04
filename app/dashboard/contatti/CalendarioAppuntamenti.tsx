'use client'

import { useMemo, useState } from 'react'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { formatDateOra } from '@/lib/format'
import { classificaContatto } from '@/lib/contatti'
import { RichiestaEvidenza } from './RichiestaEvidenza'
import { GestioneSezione } from './GestioneSezione'

const COLONNE_TABELLA = ['Ora', 'Nome e cognome', 'Stato', 'Attività', 'Tipo']

// A differenza dei Messaggi, qui email/cellulare li mostriamo gia' come
// cella (ContactLinks) invece che nel dettaglio generico: chi guarda gli
// appuntamenti di un giorno deve poter chiamare senza aprire la riga.
// created_at e' nascosto qui ma non perso: lo mostriamo per esteso subito
// sotto la richiesta ("arrivata il...", vedi ArrivoRichiesta), invece di
// lasciarlo comparire come stringa ISO grezza nella griglia generica.
const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'nome',
  'cognome',
  'tipo_richiesta',
  'attivita',
  'stato',
  'gestito',
  'gestito_da',
  'gestito_il',
  'note',
  'gruppo_attivita',
  'motivo',
  'data_richiesta',
  'ora_richiesta',
  'email',
  'cellulare',
]

// Il punto di questa vista e' proprio distinguere quando e' arrivata la
// richiesta da quando e' fissato l'appuntamento: lo rendiamo esplicito qui
// invece di lasciare che l'utente lo debba dedurre dal calendario.
function ArrivoRichiesta({ riga }: { riga: RigaContatto }) {
  if (!riga.created_at) return null
  return <p className="richiesta-arrivo">Richiesta arrivata il {formatDateOra(riga.created_at)}</p>
}

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

type RigaContatto = Record<string, any>

function chiaveData(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

// Piu' presto prima, piu' tardi dopo: gli orari sono testo "HH:MM" quindi
// l'ordine alfabetico coincide con quello cronologico. Chi non ha un orario
// finisce in fondo invece di rompere l'ordinamento degli altri.
function confrontaOraRichiesta(a: RigaContatto, b: RigaContatto): number {
  const oraA = a.ora_richiesta || ''
  const oraB = b.ora_richiesta || ''
  if (!oraA && !oraB) return 0
  if (!oraA) return 1
  if (!oraB) return -1
  return oraA.localeCompare(oraB)
}

// Raggruppa per data_richiesta (giorno dell'appuntamento), non per
// created_at (giorno di arrivo dell'enquiry): e' proprio il punto di
// questo calendario.
function raggruppaPerData(righe: RigaContatto[]) {
  const gruppi = new Map<string, RigaContatto[]>()
  const senzaData: RigaContatto[] = []

  for (const riga of righe) {
    if (!riga.data_richiesta) {
      senzaData.push(riga)
      continue
    }
    const chiave = String(riga.data_richiesta).slice(0, 10)
    if (!gruppi.has(chiave)) gruppi.set(chiave, [])
    gruppi.get(chiave)!.push(riga)
  }

  for (const lista of gruppi.values()) {
    lista.sort(confrontaOraRichiesta)
  }

  return { gruppi, senzaData }
}

// Tabella di appuntamenti (di un giorno, o quelli senza data): stessa
// struttura di ExpandableRow usata per i Messaggi, con Ora+Tipo al posto
// di Data e ora+Richiesta e i contatti gia' visibili nella cella nome.
function TabellaAppuntamenti({ righe, puoCancellare }: { righe: RigaContatto[]; puoCancellare: boolean }) {
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
            {righe.map((riga) => {
              const tipo = classificaContatto(riga)
              return (
                <ExpandableRow
                  key={riga.id}
                  id={String(riga.id)}
                  columnCount={COLONNE_TABELLA.length + 1}
                  columns={COLONNE_TABELLA}
                  record={riga}
                  hiddenKeys={COLONNE_VISIBILI}
                  evidenza={
                    <>
                      <RichiestaEvidenza riga={riga} />
                      <ArrivoRichiesta riga={riga} />
                    </>
                  }
                  extra={
                    <GestioneSezione
                      id={riga.id}
                      gestito={!!riga.gestito}
                      gestitoDa={riga.gestito_da ?? null}
                      gestitoIl={riga.gestito_il ?? null}
                      noteIniziali={riga.note ?? null}
                      puoCancellare={puoCancellare}
                    />
                  }
                  cells={[
                    <span className="ora-con-puntino">
                      <span className={`puntino ${riga.gestito ? 'verde' : 'rosso'}`} />
                      {riga.ora_richiesta || '—'}
                    </span>,
                    <>
                      {riga.nome} {riga.cognome}
                      <br />
                      <ContactLinks email={riga.email} phone={riga.cellulare} />
                    </>,
                    riga.stato || '—',
                    Array.isArray(riga.attivita) ? riga.attivita.join(', ') : riga.attivita || '—',
                    tipo === 'appuntamento_in_sede' ? (
                      <span className="richiesta-badge richiesta-verde">In sede</span>
                    ) : (
                      <span className="richiesta-badge richiesta-blu">Telefonico</span>
                    ),
                  ]}
                />
              )
            })}
          </tbody>
        </AccordionGroup>
      </table>
    </div>
  )
}

export function CalendarioAppuntamenti({
  righe,
  puoCancellare,
}: {
  righe: RigaContatto[]
  puoCancellare: boolean
}) {
  const oggi = useMemo(() => new Date(), [])
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const chiaveOggi = chiaveData(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())

  const { gruppi, senzaData } = useMemo(() => raggruppaPerData(righe), [righe])

  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(
    gruppi.has(chiaveOggi) ? chiaveOggi : null
  )

  const etichettaMese = new Date(anno, mese, 1).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })

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
    return lista.some((riga) => !riga.gestito) ? 'rosso' : 'verde'
  }

  const righeGiorno = giornoSelezionato ? gruppi.get(giornoSelezionato) ?? [] : []
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
          <button type="button" onClick={() => cambiaMese(1)} aria-label="Mese successivo">
            ›
          </button>
        </div>
      </div>

      <div className="cal-legenda">
        <span>
          <span className="puntino rosso" /> almeno un appuntamento da gestire
        </span>
        <span>
          <span className="puntino verde" /> tutti gli appuntamenti gestiti
        </span>
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
          const chiave = chiaveData(anno, mese, giorno)
          const stato = statoGiorno(chiave)
          const classi = [
            'cal-cella',
            stato ? 'selezionabile' : '',
            chiave === chiaveOggi ? 'oggi' : '',
            chiave === giornoSelezionato ? 'selezionata' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={chiave}
              className={classi}
              onClick={stato ? () => setGiornoSelezionato(chiave) : undefined}
            >
              <span className="cal-giorno-num">{giorno}</span>
              {stato && (
                <div className="cal-puntini">
                  <span className={`puntino ${stato}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="giorno-dettaglio">
        {!giornoSelezionato ? (
          <p className="empty-state">Seleziona un giorno con un pallino per vedere gli appuntamenti.</p>
        ) : righeGiorno.length === 0 ? (
          <p className="empty-state">Nessun appuntamento il {etichettaGiornoSelezionato}.</p>
        ) : (
          <>
            <h3>
              {etichettaGiornoSelezionato}
              <span className="count">
                ({righeGiorno.length} {righeGiorno.length === 1 ? 'appuntamento' : 'appuntamenti'})
              </span>
            </h3>
            <TabellaAppuntamenti righe={righeGiorno} puoCancellare={puoCancellare} />
          </>
        )}
      </div>

      {senzaData.length > 0 && (
        <div className="cal-senza-data">
          <h3>
            Senza data <span className="count">({senzaData.length})</span>
          </h3>
          <p className="muted">
            Appuntamenti senza una data richiesta registrata: non possono comparire nel calendario.
          </p>
          <TabellaAppuntamenti righe={senzaData} puoCancellare={puoCancellare} />
        </div>
      )}
    </div>
  )
}
