import { formatDateOra, formatDurataBreve } from '@/lib/format'
import type { RigaAccesso } from '@/lib/visite'

// Solo l'host, e "Accesso diretto" se manca (niente referrer = link
// digitato, preferiti, o app): e' la sorgente di ingresso, l'unica
// provenienza che interessa mostrare (i passaggi successivi sono
// navigazione interna, gia' impliciti nell'ordine del percorso).
function sorgenteIngresso(referrer: string | null): string {
  if (!referrer) return 'Accesso diretto'
  try {
    return `da ${new URL(referrer).hostname.replace(/^www\./, '')}`
  } catch {
    return `da ${referrer}`
  }
}

// In evidenza appena si apre la riga: il percorso di navigazione dalla prima
// pagina vista all'ultima, in stile "flow" (una tappa dopo l'altra, con il
// tempo trascorso tra un salto e il successivo) invece della tabella grezza
// di prima - tappe ravvicinate raccontano un visitatore che sta esplorando
// attivamente, utile per farsi un'idea di quanto sia interessato.
export function VisitePagine({ pagine }: { pagine: RigaAccesso[] }) {
  if (pagine.length === 0) return null

  return (
    <div className="detail-group">
      <div className="detail-group-title">
        Percorso di navigazione ({pagine.length} {pagine.length === 1 ? 'pagina' : 'pagine'})
      </div>
      <p className="percorso-sorgente muted">Ingresso: {sorgenteIngresso(pagine[0].referrer)}</p>
      <ol className="percorso-visite">
        {pagine.map((accesso, indice) => {
          const ultima = indice === pagine.length - 1
          return (
            <li key={accesso.id} className="percorso-tappa">
              <div className="percorso-tappa-indicatore">
                <span className={`percorso-tappa-pallino${ultima ? ' e-ultima' : ''}`} />
                {!ultima && <span className="percorso-tappa-linea" />}
              </div>
              <div className="percorso-tappa-contenuto">
                <div className="percorso-tappa-riga">
                  <span className="percorso-tappa-pagina">{accesso.pagina || '(pagina sconosciuta)'}</span>
                  <span className="percorso-tappa-ora">{formatDateOra(accesso.created_at)}</span>
                </div>
                {!ultima && (
                  <span className="percorso-tappa-delta muted">
                    dopo {formatDurataBreve(accesso.created_at, pagine[indice + 1].created_at)}
                  </span>
                )}
                {ultima && pagine.length > 1 && <span className="percorso-tappa-delta muted">Ultima pagina vista</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
