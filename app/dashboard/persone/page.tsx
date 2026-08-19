import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { FiltroSelect } from '@/components/FiltroSelect'
import { PipelineBadge } from '@/components/PipelineBadge'
import { RicercaContatti } from '../contatti/RicercaContatti'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { etichettaFonte, nomePersona, totaleRichieste } from '@/lib/persone'
import { conteggiRichieste } from '@/lib/persone-server'
import { normalizzaStato } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

// L'anagrafica completa e' grande (c'e' dentro lo storico HubSpot): senza un
// limite la pagina diventerebbe illeggibile e lentissima. Chi cerca qualcuno
// in particolare usa la ricerca, che interroga il database.
const LIMITE = 200

const OPZIONI_FILTRO = [
  { valore: 'attive', etichetta: 'Attive (hanno compilato qualcosa)' },
  { valore: 'storiche', etichetta: 'Solo storico HubSpot' },
  { valore: 'tutte', etichetta: 'Tutte' },
]

export default async function PersonePage({
  searchParams,
}: {
  searchParams: { q?: string; filtro?: string }
}) {
  if (!(await utenteHaSezione('persone'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const query = (searchParams.q ?? '').trim()
  const filtro = OPZIONI_FILTRO.some((o) => o.valore === searchParams.filtro) ? searchParams.filtro! : 'attive'

  let richiesta = supabase
    .from('persone')
    .select('*')
    .order('cognome', { ascending: true })
    .order('nome', { ascending: true })
    .limit(LIMITE)

  if (filtro === 'attive') richiesta = richiesta.eq('storico', false)
  if (filtro === 'storiche') richiesta = richiesta.eq('storico', true)

  if (query) {
    // Vedi ricerca-actions.ts: virgole e parentesi romperebbero .or().
    const perIlike = `%${query.replace(/[%_,()]/g, ' ').trim()}%`
    const cifre = query.replace(/\D/g, '')
    const filtri = [`nome.ilike.${perIlike}`, `cognome.ilike.${perIlike}`, `email.ilike.${perIlike}`]
    if (cifre.length >= 4) filtri.push(`cellulare_norm.ilike.%${cifre}%`)
    richiesta = richiesta.or(filtri.join(','))
  }

  const { data: persone, error } = await richiesta

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const ids = (persone ?? []).map((p) => p.id)
  const [{ data: opportunita }, conteggi] = await Promise.all([
    ids.length > 0
      ? supabase.from('opportunita').select('id, persona_id, stato, assegnato_a, chiuso_il').in('persona_id', ids)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    conteggiRichieste(ids),
  ])

  // L'opportunita' da mostrare e' quella aperta; se non ce n'e' una, l'ultima
  // chiusa.
  const leadPerPersona = new Map<string, Record<string, any>>()
  for (const lead of opportunita ?? []) {
    const attuale = leadPerPersona.get(lead.persona_id)
    if (!attuale || (attuale.chiuso_il && !lead.chiuso_il)) leadPerPersona.set(lead.persona_id, lead)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Anagrafica persone</h1>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Una riga per <strong>persona</strong>, non per richiesta: chi compila più moduli nel tempo resta una
            sola scheda. Il collegamento lo fa il database, non serve unire niente a mano.
          </li>
          <li>
            La deduplicazione usa l'<strong>id PerfectGym</strong> e in seconda battuta l'<strong>email</strong>. Lo
            stesso cellulare non unisce: in famiglia si condivide, quindi finisce fra i{' '}
            <Link href="/dashboard/persone/duplicati" className="link">
              possibili duplicati
            </Link>{' '}
            da valutare a mano.
          </li>
          <li>Apri una scheda per vedere tutte le sue richieste, l'opportunità, l'agenda e le visite al sito.</li>
        </ol>
        <p className="box-istruzioni-nota">
          «Solo storico HubSpot» sono le persone che conosciamo dai vecchi lead ma che non hanno ancora compilato
          nulla sul sito nuovo: appena si fanno vive diventano attive.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <RicercaContatti valoreIniziale={searchParams.q ?? ''} />
        <FiltroSelect valore={filtro} opzioni={OPZIONI_FILTRO} />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contatti</th>
              <th>Richieste</th>
              <th>Opportunità</th>
              <th>Assegnata a</th>
              <th>Prima fonte</th>
            </tr>
          </thead>
          <tbody>
            {(persone ?? []).map((persona) => {
              const lead = leadPerPersona.get(persona.id)
              const richieste = totaleRichieste(
                conteggi[persona.id] ?? { enquiries: 0, inviti: 0, scuolaTennis: 0, summerCamp: 0, eventi: 0 }
              )

              return (
                <tr key={persona.id}>
                  <td data-label="Nome">
                    <Link href={`/dashboard/persone/${persona.id}`} className="link">
                      {nomePersona(persona)}
                    </Link>
                    {persona.tipo === 'minore' && (
                      <span className="richiesta-badge richiesta-ciano invito-ruolo">Minore</span>
                    )}
                  </td>
                  <td data-label="Contatti">
                    <span className="muted">{[persona.email, persona.cellulare].filter(Boolean).join(' · ') || '—'}</span>
                  </td>
                  <td data-label="Richieste">{richieste}</td>
                  <td data-label="Opportunità">
                    {lead ? <PipelineBadge stato={normalizzaStato(lead.stato)} /> : '—'}
                  </td>
                  <td data-label="Assegnata a">{lead?.assegnato_a ?? '—'}</td>
                  <td data-label="Prima fonte">{etichettaFonte(persona.fonte) ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {(persone ?? []).length === 0 && (
          <p className="empty-state">{query ? 'Nessuna persona trovata.' : 'Nessuna persona in anagrafica.'}</p>
        )}
        {(persone ?? []).length === LIMITE && (
          <p className="muted" style={{ marginTop: 12 }}>
            Mostrate le prime {LIMITE} in ordine alfabetico: usa la ricerca per trovare una persona precisa.
          </p>
        )}
      </div>
    </div>
  )
}
