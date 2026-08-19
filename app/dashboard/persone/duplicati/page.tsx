import Link from 'next/link'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { puoAmministrare } from '@/lib/auth/permessi'
import { etichettaFonte, nomePersona, totaleRichieste } from '@/lib/persone'
import { conteggiRichieste } from '@/lib/persone-server'
import { AzioniDuplicato } from './AzioniDuplicato'

export const dynamic = 'force-dynamic'

const LIMITE = 100

const MOTIVI: Record<string, string> = {
  cellulare: 'Stesso cellulare',
  nome: 'Stesso nome e cognome, email diverse',
}

// Le coppie che la deduplicazione automatica NON unisce da sola (vedi la
// vista possibili_duplicati): stesso cellulare - che in famiglia si condivide
// - o stesso nome con email diverse. Qui le si guarda affiancate e si decide.
export default async function DuplicatiPage() {
  if (!(await utenteHaSezione('persone'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  const supabase = createSupabaseServiceClient()
  const emailCorrente = (headers().get('x-tca-user-email') ?? '').toLowerCase() || null
  const eAmministratore = await puoAmministrare(emailCorrente)

  const { data: coppie, error } = await supabase.from('possibili_duplicati').select('*').limit(LIMITE)

  if (error) {
    return <p className="error-banner">Errore nel caricamento: {error.message}</p>
  }

  const ids = [...new Set((coppie ?? []).flatMap((c) => [c.id_a, c.id_b]).filter(Boolean))] as string[]
  const [{ data: persone }, conteggi] = await Promise.all([
    ids.length > 0
      ? supabase.from('persone').select('*').in('id', ids)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
    conteggiRichieste(ids),
  ])

  const personePerId = new Map((persone ?? []).map((p) => [p.id, p]))
  const richiesteDi = (id: string) =>
    totaleRichieste(conteggi[id] ?? { enquiries: 0, inviti: 0, scuolaTennis: 0, summerCamp: 0, eventi: 0 })

  return (
    <div>
      <div className="page-header">
        <h1>Possibili duplicati</h1>
        <Link href="/dashboard/persone" className="link">
          ← Torna all'anagrafica
        </Link>
      </div>

      <BoxIstruzioni titolo="Come funziona">
        <ol>
          <li>
            Qui ci sono solo le coppie che il sistema <strong>non</strong> unisce da sé: id PerfectGym ed email
            uniscono in automatico, il resto no.
          </li>
          <li>
            Se sono la stessa persona, scegli quale scheda <strong>resta</strong>: richieste, lead, task e figli
            vengono spostati su quella, l'altra viene cancellata. Non si torna indietro.
          </li>
          <li>
            Se sono due persone diverse (tipico: familiari con lo stesso cellulare), premi «Sono persone diverse» e
            la coppia non ricompare più.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Se entrambe hanno un lead aperto, resta aperto quello più avanti nella pipeline e l'altro viene chiuso
          come perso, con il motivo scritto: nel registro operatori resta tutto.
        </p>
      </BoxIstruzioni>

      {(coppie ?? []).length === 0 ? (
        <p className="empty-state">Nessun possibile duplicato da valutare.</p>
      ) : (
        <ul className="duplicati-elenco">
          {(coppie ?? []).map((coppia) => {
            const a = personePerId.get(coppia.id_a!)
            const b = personePerId.get(coppia.id_b!)
            if (!a || !b) return null

            return (
              <li className="duplicato-coppia" key={`${coppia.id_a}-${coppia.id_b}`}>
                <span className="richiesta-badge richiesta-ambra">
                  {MOTIVI[coppia.motivo ?? ''] ?? coppia.motivo}
                </span>

                <div className="duplicato-schede">
                  {[a, b].map((persona) => (
                    <div className="duplicato-scheda" key={persona.id}>
                      <Link href={`/dashboard/persone/${persona.id}`} className="link">
                        {nomePersona(persona)}
                      </Link>
                      <span className="muted">{persona.email ?? 'senza email'}</span>
                      <span className="muted">{persona.cellulare ?? 'senza cellulare'}</span>
                      <span className="muted">
                        {richiesteDi(persona.id)} richieste · {etichettaFonte(persona.fonte) ?? 'fonte ignota'}
                        {persona.storico ? ' · solo storico' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <AzioniDuplicato
                  idA={a.id}
                  idB={b.id}
                  nomeA={nomePersona(a)}
                  nomeB={nomePersona(b)}
                  puoUnire={eAmministratore}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
