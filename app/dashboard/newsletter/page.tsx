import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { BoxIstruzioni } from '@/components/BoxIstruzioni'
import { caricaContenutiSito } from '@/lib/newsletter'
import { CostruttoreNewsletter } from './CostruttoreNewsletter'

export const dynamic = 'force-dynamic'

export default async function NewsletterPage() {
  if (!(await utenteHaSezione('newsletter'))) {
    return <p className="error-banner">Non hai accesso a questa sezione.</p>
  }

  // Se il sito non risponde la pagina non ha nulla da offrire: meglio dirlo
  // con il motivo (di solito un deploy in corso o SITO_TCA_URL sbagliato)
  // che mostrare un elenco vuoto, che sembrerebbe "nessun contenuto".
  let contenuti
  try {
    contenuti = await caricaContenutiSito()
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'errore sconosciuto'
    return (
      <div>
        <div className="page-header">
          <h1>Newsletter</h1>
        </div>
        <p className="error-banner">
          Non riesco a leggere i contenuti dal sito ({motivo}). Riprova tra qualche minuto: se il problema resta,
          probabilmente è in corso un deploy del sito.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Newsletter</h1>
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        Scegli dal sito le news, gli eventi, i servizi e la promo da mettere in newsletter: qui dentro diventano un
        template HTML pronto da incollare nella piattaforma di invio. Nessuna email viene spedita da questa pagina.
      </p>

      <BoxIstruzioni titolo="Come si usa">
        <ol>
          <li>
            <strong>Passo 1 — Contenuti.</strong> Spunta le voci da inserire. I filtri in alto servono a trovarle:
            tipo di contenuto, periodo, parola nel titolo.
          </li>
          <li>
            <strong>Passo 2 — Blocchi.</strong> Ogni voce spuntata diventa un blocco già impaginato secondo il suo
            tipo: un evento prende la card con la data grande, una news la card su fondo chiaro, la promo il blocco
            scuro. Per ognuno scegli quanto testo prendere dalla pagina del sito (i capoversi si aggiungono uno per
            uno), la foto e i link. Le frecce ▲▼ cambiano l'ordine dentro la sezione.
          </li>
          <li>
            <strong>Passo 3 — Oggetto e apertura.</strong> Oggetto, titolo grande, testo di apertura e foto di
            apertura. Sotto «Testata, sezioni e footer» ci sono l'indice numerato, i titoli delle sezioni e i
            recapiti: sono già impostati, di solito non serve toccarli.
          </li>
          <li>
            <strong>Anteprima e consegna.</strong> L'anteprima si aggiorna da sola. Quando è a posto, «Copia HTML»
            (da incollare nell'editor «codice HTML» della piattaforma di invio) oppure «Scarica .html».
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          L'impaginazione è quella della newsletter mensile del Club (testata nera, indice numerato, card evento con
          la data, card news, footer con i recapiti): quella non va rifatta ogni volta. I testi invece partono
          vuoti — oggetto, apertura, indice e fasce di testo si scrivono qui, e ciò che non si compila semplicemente
          non compare nell'email. Il testo e i link dei blocchi arrivano dal sito, quindi non serve ricopiare nulla
          a mano: ogni campo resta comunque modificabile, e le modifiche non toccano il sito. Il lavoro in corso
          resta salvato in questo browser:
          se chiudi la pagina e la riapri, ritrovi la newsletter come l'avevi lasciata. Le foto in formato .avif o
          .webp non si vedono in molti programmi di posta: dove capita, la voce lo segnala e puoi scegliere un'altra
          foto tra quelle già pubblicate sul sito.
        </p>
      </BoxIstruzioni>

      <CostruttoreNewsletter contenutiIniziali={contenuti} />
    </div>
  )
}
