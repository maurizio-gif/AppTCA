import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AccordionGroup, ExpandableRow } from '@/components/ExpandableRow'
import { ContactLinks } from '@/components/ContactLinks'
import { ExternalLink } from '@/components/ExternalLink'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { formatDateOra } from '@/lib/format'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoCancellare } from '@/lib/auth/permessi'
import { headers } from 'next/headers'
import {
  attesaScaduta,
  CLASSE_STATO_PRENOTAZIONE,
  ETICHETTE_STATO,
  getEventoPrenotabile,
  STATI_PRENOTAZIONE,
  statoDi,
  type StatoPrenotazione,
} from '@/lib/eventi'
import { GestionePrenotazione } from './GestionePrenotazione'

export const dynamic = 'force-dynamic'

const COLONNE_TABELLA = ['Data', 'Evento', 'Partecipante', 'Socio', 'Stato', 'Quota', 'Contratto PGM']

const COLONNE_VISIBILI = [
  'id',
  'created_at',
  'evento_slug',
  'nome_evento',
  'nome',
  'cognome',
  'email',
  'cellulare',
  'socio',
  'stato',
  'quota',
  'importo_pagato',
  'stato_contratto_pgm',
  'link_pgm',
]

const OPZIONI_STATO = [
  { valore: 'tutti', etichetta: 'Tutti gli stati' },
  { valore: 'da_incassare', etichetta: 'Da incassare (in attesa)' },
  ...STATI_PRENOTAZIONE.map((s) => ({ valore: s, etichetta: ETICHETTE_STATO[s] })),
]

export default async function IscrizioniEventiPage({
  searchParams,
}: {
  searchParams: { filtro?: string; evento?: string }
}) {
  if (!(await utenteHaSezione('iscrizioni-eventi'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const emailCorrente = headers().get('x-tca-user-email')
  const puoEliminare = await puoCancellare(emailCorrente)

  const supabase = createSupabaseServiceClient()

  const { data: righe, error } = await supabase
    .from('iscrizioni_eventi')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const tutte = righe ?? []

  // Riepilogo posti per evento: la capienza arriva dal manifest pubblicato
  // dal sito (la stessa fonte che valida le prenotazioni in arrivo), non da
  // un valore riscritto qui — altrimenti la dashboard potrebbe dire "16
  // posti" mentre l'API ne accetta un numero diverso.
  const slugs = Array.from(
    new Set(tutte.map((r) => r.evento_slug).filter((s): s is string => !!s))
  )
  const eventi = await Promise.all(
    slugs.map(async (slug) => {
      const config = await getEventoPrenotabile(slug)
      const suEvento = tutte.filter((r) => r.evento_slug === slug)
      const occupati = suEvento.filter(
        (r) => ['in_attesa_pagamento', 'confermata'].includes(statoDi(r)) && !attesaScaduta(r)
      ).length
      return {
        slug,
        titolo: config?.titolo ?? suEvento[0]?.nome_evento ?? slug,
        postiTotali: config?.postiTotali ?? null,
        occupati,
        inAttesa: suEvento.filter((r) => statoDi(r) === 'in_attesa_pagamento').length,
      }
    })
  )

  const filtro = searchParams.filtro ?? 'tutti'
  const eventoFiltro = searchParams.evento ?? 'tutti'

  const visibili = tutte.filter((riga) => {
    if (eventoFiltro !== 'tutti' && riga.evento_slug !== eventoFiltro) return false
    if (filtro === 'tutti') return true
    if (filtro === 'da_incassare') return statoDi(riga) === 'in_attesa_pagamento'
    return statoDi(riga) === filtro
  })

  const opzioniEvento = [
    { valore: 'tutti', etichetta: 'Tutti gli eventi' },
    ...eventi.map((e) => ({ valore: e.slug, etichetta: e.titolo })),
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Iscrizioni Eventi</h1>
        <div className="filter-row">
          <FiltroSelect valore={eventoFiltro} opzioni={opzioniEvento} paramName="evento" ariaLabel="Filtra per evento" />
          <FiltroSelect valore={filtro} opzioni={OPZIONI_STATO} paramName="filtro" ariaLabel="Filtra per stato" />
        </div>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Le prenotazioni arrivate dal sito nascono <strong>in attesa di pagamento</strong>: occupano il posto, ma
            si pagano in cassa. Senza pagamento entro la scadenza indicata la prenotazione decade e il posto torna
            disponibile.
          </li>
          <li>
            Apri una riga e usa <strong>Conferma pagamento</strong> quando incassi in cassa: la prenotazione diventa
            definitiva e al partecipante parte l&apos;email di conferma.
          </li>
          <li>
            <strong>Annulla prenotazione</strong> libera subito il posto tenendo la riga (per ricordare chi non ha
            pagato). <strong>Cancella definitivamente</strong> rimuove la riga e richiede il permesso di cancellazione.
          </li>
          <li>
            Nella colonna «Contratto PGM» trovi il link diretto al contratto su PerfectGym, quando presente.
          </li>
        </ol>
      </BoxIstruzioni>

      {eventi.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Posti occupati</th>
                <th>In attesa di pagamento</th>
              </tr>
            </thead>
            <tbody>
              {eventi.map((e) => (
                <tr key={e.slug}>
                  <td data-label="Evento">{e.titolo}</td>
                  <td data-label="Posti occupati">
                    {e.postiTotali != null ? `${e.occupati} su ${e.postiTotali}` : e.occupati}
                  </td>
                  <td data-label="In attesa di pagamento">{e.inAttesa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Data</th>
              <th>Evento</th>
              <th>Partecipante</th>
              <th>Socio</th>
              <th>Stato</th>
              <th>Quota</th>
              <th>Contratto PGM</th>
            </tr>
          </thead>
          <AccordionGroup>
            <tbody>
              {visibili.map((riga) => {
                const stato: StatoPrenotazione = statoDi(riga)
                const inRitardo = attesaScaduta(riga)
                return (
                  <ExpandableRow
                    key={riga.id}
                    id={String(riga.id)}
                    columnCount={8}
                    columns={COLONNE_TABELLA}
                    record={riga}
                    hiddenKeys={COLONNE_VISIBILI}
                    evidenziata={stato === 'in_attesa_pagamento'}
                    extra={
                      <GestionePrenotazione
                        id={String(riga.id)}
                        stato={stato}
                        quota={riga.quota}
                        importoPagato={riga.importo_pagato}
                        scadenza={riga.scadenza_pagamento}
                        pagatoDa={riga.pagamento_confermato_da}
                        pagatoIl={riga.pagamento_confermato_il}
                        annullataDa={riga.annullata_da}
                        annullataIl={riga.annullata_il}
                        puoEliminare={puoEliminare}
                      />
                    }
                    cells={[
                      formatDateOra(riga.created_at),
                      riga.nome_evento,
                      <>
                        {riga.nome} {riga.cognome}
                        <br />
                        <ContactLinks email={riga.email} phone={riga.cellulare} />
                      </>,
                      riga.socio ? 'Sì' : 'No',
                      <>
                        <span className={`richiesta-badge ${CLASSE_STATO_PRENOTAZIONE[stato]}`}>
                          {ETICHETTE_STATO[stato]}
                        </span>
                        {inRitardo && (
                          <>
                            <br />
                            <span className="richiesta-arrivo">scaduta il {formatDateOra(riga.scadenza_pagamento)}</span>
                          </>
                        )}
                      </>,
                      riga.importo_pagato != null
                        ? `€ ${riga.importo_pagato} (pagata)`
                        : riga.quota != null
                          ? `€ ${riga.quota} da incassare`
                          : '-',
                      <>
                        {riga.stato_contratto_pgm}
                        {riga.link_pgm && (
                          <>
                            {' · '}
                            <ExternalLink href={riga.link_pgm} className="link">
                              apri
                            </ExternalLink>
                          </>
                        )}
                      </>,
                    ]}
                  />
                )
              })}
            </tbody>
          </AccordionGroup>
        </table>
        {visibili.length === 0 && <p className="empty-state">Nessuna iscrizione trovata.</p>}
      </div>
    </div>
  )
}
