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
            <strong>Passo 2 — Blocchi.</strong> Ogni voce spuntata diventa un blocco dell'email. Per ognuno scegli
            l'impaginazione (foto grande, foto piccola a lato, solo testo), quanto testo prendere dalla pagina del
            sito (i capoversi si aggiungono uno per uno), la foto e il pulsante. Le frecce ▲▼ cambiano l'ordine.
          </li>
          <li>
            <strong>Passo 3 — Testata e chiusura.</strong> Oggetto, titolo, testo di apertura e pulsante finale.
          </li>
          <li>
            <strong>Anteprima e consegna.</strong> L'anteprima si aggiorna da sola. Quando è a posto, «Copia HTML»
            (da incollare nell'editor «codice HTML» della piattaforma di invio) oppure «Scarica .html».
          </li>
        </ol>
        <p className="box-istruzioni-nota">
          Il testo e i link arrivano dal sito, quindi non serve ricopiare nulla a mano: ogni campo resta comunque
          modificabile qui, e le modifiche non toccano il sito. Il lavoro in corso resta salvato in questo browser:
          se chiudi la pagina e la riapri, ritrovi la newsletter come l'avevi lasciata. Le foto in formato .avif o
          .webp non si vedono in molti programmi di posta: dove capita, la voce lo segnala e puoi scegliere un'altra
          foto tra quelle già pubblicate sul sito.
        </p>
      </BoxIstruzioni>

      <CostruttoreNewsletter contenutiIniziali={contenuti} />
    </div>
  )
}
