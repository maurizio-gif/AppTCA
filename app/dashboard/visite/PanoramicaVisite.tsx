import { FiltroSelect } from '@/components/FiltroSelect'
import { FontiLead } from '@/components/FontiLead'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import {
  GAP_SESSIONE_MINUTI,
  ORE_RITORNO,
  canaliDiIngresso,
  formatSecondi,
  paginePerPosizione,
  percorsiFrequenti,
  riepilogo,
  statistichePagine,
  visitatoriDiRitorno,
  type SessioneNavigazione,
} from '@/lib/visite-analisi'

export const OPZIONI_PERIODO = [
  { valore: '7', etichetta: 'Ultimi 7 giorni' },
  { valore: '30', etichetta: 'Ultimi 30 giorni' },
  { valore: '90', etichetta: 'Ultimi 90 giorni' },
  { valore: 'tutto', etichetta: 'Tutto' },
]

export const OPZIONI_SEGMENTO = [
  { valore: 'tutti', etichetta: 'Tutti i visitatori' },
  { valore: 'riconosciuti', etichetta: 'Solo chi ha compilato un modulo' },
  { valore: 'anonimi', etichetta: 'Solo chi non ha compilato' },
]

const ETICHETTE_POSIZIONE = ['1ª pagina', '2ª pagina', '3ª pagina', '4ª pagina']

function Statistica({ valore, etichetta, nota }: { valore: string; etichetta: string; nota?: string }) {
  return (
    <div className="stat-card stat-card-static">
      <div className="value">{valore}</div>
      <div className="label">{etichetta}</div>
      {nota && <div className="stat-card-nota">{nota}</div>}
    </div>
  )
}

// Dashboard di percorso: tutto quello che c'e' qui e' ricostruito dai
// pageview raggruppati per vid (vedi lib/visite-analisi.ts), quindi
// cambia con il segmento scelto - ed e' proprio il confronto tra "chi ha
// compilato un modulo" e "chi non l'ha fatto" a dire quali percorsi
// portano a una richiesta e quali si perdono per strada.
export function PanoramicaVisite({
  sessioni,
  periodo,
  segmento,
}: {
  sessioni: SessioneNavigazione[]
  periodo: string
  segmento: string
}) {
  const dati = riepilogo(sessioni)
  const ritorni = visitatoriDiRitorno(sessioni)
  const canali = canaliDiIngresso(sessioni)
  const passi = paginePerPosizione(sessioni)
  const percorsi = percorsiFrequenti(sessioni)
  const pagine = statistichePagine(sessioni)

  return (
    <div>
      <BoxIstruzioni titolo="Come leggere questi numeri">
        <ol>
          <li>
            Ogni percorso e' ricostruito a partire dal <strong>vid</strong>, l'identificativo del visitatore: non
            sono medie su traffico anonimo, sono le navigazioni di singole persone, le stesse che ritrovi nella
            scheda del contatto quando compilano un modulo.
          </li>
          <li>
            Una <strong>visita</strong> finisce dopo {GAP_SESSIONE_MINUTI} minuti di inattivita': se la stessa
            persona torna il giorno dopo conta come una seconda visita, non come una sola lunga. Un{' '}
            <strong>visitatore di ritorno</strong> usa invece una soglia piu' alta — almeno {ORE_RITORNO} ore tra
            un accesso e il successivo — perche' riaprire il sito dopo cena non e' «essere tornati».
          </li>
          <li>
            Cambia il segmento per confrontare il percorso di chi ha lasciato una richiesta con quello di chi se
            n'e' andato: le differenze tra i due percorsi sono i punti in cui il sito perde le persone.
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Il tempo su una pagina si misura come distanza dal pageview successivo: sull'ultima pagina di una visita
          non esiste un evento di uscita da cui calcolarlo, quindi non viene contato (per questo la durata media
          considera solo le visite da almeno due pagine). Nei percorsi, i ricaricamenti consecutivi della stessa
          pagina sono accorpati in un solo passo.
        </p>
      </BoxIstruzioni>

      <div className="filtri-toolbar">
        <FiltroSelect valore={periodo} opzioni={OPZIONI_PERIODO} paramName="periodo" ariaLabel="Periodo" />
        <FiltroSelect
          valore={segmento}
          opzioni={OPZIONI_SEGMENTO}
          paramName="segmento"
          ariaLabel="Segmento di visitatori"
        />
      </div>

      {dati.sessioni === 0 ? (
        <p className="empty-state">Nessuna visita registrata con questi filtri.</p>
      ) : (
        <>
          <div className="stat-row stat-row-griglia">
            <Statistica valore={String(dati.visitatori)} etichetta="Visitatori unici" nota="vid distinti" />
            <Statistica valore={String(dati.sessioni)} etichetta="Visite" />
            <Statistica valore={String(dati.paginePerSessione)} etichetta="Pagine per visita" />
            <Statistica
              valore={formatSecondi(dati.durataMediaSecondi)}
              etichetta="Durata media"
              nota={`su ${dati.sessioniConDurata} visite da 2+ pagine`}
            />
            <Statistica
              valore={`${dati.tassoRimbalzo}%`}
              etichetta="Visite di una sola pagina"
              nota={`${dati.sessioniRimbalzo} su ${dati.sessioni}`}
            />
            <Statistica
              valore={`${dati.tassoRiconoscimento}%`}
              etichetta="Visitatori con un modulo compilato"
              nota={`${dati.visitatoriRiconosciuti} su ${dati.visitatori}`}
            />
          </div>

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">Visitatori che tornano</h3>
            <p className="ritorni-titolo">
              <strong>
                {ritorni.diRitorno} visitatori su {ritorni.visitatori} ({ritorni.percentuale}%)
              </strong>{' '}
              sono tornati sul sito ad almeno {ORE_RITORNO} ore di distanza
              {ritorni.giorniMediTraPrimoEUltimo !== null && (
                <>
                  , con{' '}
                  <strong>
                    {ritorni.giorniMediTraPrimoEUltimo}{' '}
                    {ritorni.giorniMediTraPrimoEUltimo === 1 ? 'giorno' : 'giorni'}
                  </strong>{' '}
                  in media tra il primo e l'ultimo accesso
                </>
              )}
              .
            </p>
            <FontiLead
              fonti={ritorni.distribuzione.map((v) => ({ fonte: v.chiave, conteggio: v.conteggio }))}
              messaggioVuoto="Nessun visitatore in questo periodo."
            />
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              Un «accesso» qui non e' una visita: piu' visite ravvicinate nello stesso giorno contano come un
              accesso solo, e ne parte uno nuovo dopo almeno {ORE_RITORNO} ore dalla fine della precedente. Il
              conteggio e' relativo al periodo scelto qui sopra: chi ha visitato il sito prima dell'inizio del
              periodo e poi e' tornato dentro il periodo risulta con un accesso solo. Allarga il periodo per
              vedere i ritorni piu' lunghi.
            </p>
          </div>

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">Da dove arrivano</h3>
            <FontiLead
              fonti={canali.map((c) => ({ fonte: c.chiave, conteggio: c.conteggio }))}
              messaggioVuoto="Nessun canale da classificare in questo periodo."
            />
          </div>

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">I primi quattro passi del percorso</h3>
            <div className="passi-percorso">
              {passi.map((passo) => (
                <div key={passo.posizione} className="passo-percorso">
                  <div className="passo-percorso-testata">
                    <span className="passo-percorso-titolo">{ETICHETTE_POSIZIONE[passo.posizione - 1]}</span>
                    <span className="passo-percorso-conteggio">
                      {passo.sessioniArrivate} {passo.sessioniArrivate === 1 ? 'visita' : 'visite'}
                      {passo.posizione > 1 && dati.sessioni > 0 && (
                        <span className="muted">
                          {' '}
                          ({Math.round((passo.sessioniArrivate / dati.sessioni) * 100)}% arriva fin qui)
                        </span>
                      )}
                    </span>
                  </div>
                  <FontiLead
                    fonti={passo.pagine.map((p) => ({ fonte: p.chiave, conteggio: p.conteggio }))}
                    messaggioVuoto="Nessuna visita arriva a questo passo."
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">Percorsi piu' frequenti</h3>
            {percorsi.length === 0 ? (
              <p className="muted">Nessun percorso da mostrare.</p>
            ) : (
              <ol className="percorsi-frequenti">
                {percorsi.map((percorso) => (
                  <li key={percorso.passi.join('>')} className="percorso-frequente">
                    <div className="percorso-frequente-catena">
                      {percorso.passi.map((passo, i) => (
                        <span key={`${passo}-${i}`} className="percorso-frequente-passo">
                          {i > 0 && <span className="percorso-frequente-freccia">→</span>}
                          <span className="percorso-frequente-pagina">{passo}</span>
                        </span>
                      ))}
                      {percorso.proseguono > 0 && <span className="percorso-frequente-freccia">→ …</span>}
                    </div>
                    <div className="percorso-frequente-numeri">
                      <strong>{percorso.conteggio}</strong>
                      <span className="muted">
                        {percorso.riconosciuti > 0 && ` · ${percorso.riconosciuti} con modulo`}
                        {percorso.proseguono > 0 && ` · ${percorso.proseguono} proseguono`}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="riepilogo-sottosezione">
            <h3 className="riepilogo-sottosezione-titolo">Pagine: ingressi, uscite, tempo</h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pagina</th>
                    <th>Viste</th>
                    <th>Ingressi</th>
                    <th>Uscite</th>
                    <th>Tempo medio</th>
                  </tr>
                </thead>
                <tbody>
                  {pagine.map((pagina) => (
                    <tr key={pagina.pagina}>
                      <td data-label="Pagina">{pagina.pagina}</td>
                      <td data-label="Viste">{pagina.viste}</td>
                      <td data-label="Ingressi">{pagina.ingressi}</td>
                      <td data-label="Uscite">
                        {pagina.uscite} <span className="muted">({pagina.tassoUscita}%)</span>
                      </td>
                      <td data-label="Tempo medio">{formatSecondi(pagina.secondiMedi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              «Ingressi» = quante volte quella pagina e' stata la prima della visita. «Uscite» = quante volte e'
              stata l'ultima. Una pagina con molte viste e una percentuale di uscita alta e' un punto in cui le
              persone si fermano: o hanno trovato quello che cercavano, o non hanno trovato come proseguire.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
