// Generatore del template HTML della newsletter.
//
// Funzioni pure (nessun accesso a rete o a Supabase): le usa sia l'anteprima
// nel browser sia il file scaricato, così ciò che si vede in anteprima e ciò
// che si incolla nella piattaforma di invio sono lo stesso HTML, byte per
// byte.
//
// Scelte legate al fatto che l'output è un'email, non una pagina:
//  - tabelle e stili inline: Outlook ignora i CSS esterni, il grid e il flex;
//  - larghezza fissa 600px con una sola media query per il mobile;
//  - font di sistema come fallback (Barlow non è installato sui client di
//    posta, quindi Arial regge il layout senza sorprese);
//  - ogni immagine ha width e alt: se il client blocca le immagini — è il
//    default di Outlook — l'email resta leggibile;
//  - nessuna immagine di sfondo e nessun testo dentro le foto.
//
// La palette è quella del sito (WebSite-TCA/src/styles/global.css), copiata
// qui come valori espliciti: in email le CSS custom properties non si possono
// usare.

export const COLORI = {
  sfondo: '#F5F3F0',
  carta: '#FFFFFF',
  testo: '#1A1A1A',
  testoChiaro: '#555555',
  accento: '#8B1A1A',
  accentoScuro: '#6B1414',
  bordo: '#EBEBEB',
} as const

const FONT_TITOLI = "'Barlow Condensed', 'Arial Narrow', Arial, Helvetica, sans-serif"
const FONT_TESTO = "Barlow, Arial, Helvetica, sans-serif"

export const LAYOUT_BLOCCO = ['grande', 'compatto', 'solo-testo'] as const
export type LayoutBlocco = (typeof LAYOUT_BLOCCO)[number]

export const ETICHETTE_LAYOUT: Record<LayoutBlocco, string> = {
  grande: 'Foto grande sopra il testo',
  compatto: 'Foto piccola accanto al testo',
  'solo-testo': 'Solo testo, senza foto',
}

export type BloccoNewsletter = {
  id: string
  layout: LayoutBlocco
  etichetta: string
  titolo: string
  data: string | null
  mostraData: boolean
  testo: string
  immagine: string | null
  immagineAlt: string
  ctaLabel: string
  ctaHref: string
}

export type ConfigNewsletter = {
  oggetto: string
  preheader: string
  titolo: string
  sottotitolo: string
  intro: string
  blocchi: BloccoNewsletter[]
  ctaFinaleLabel: string
  ctaFinaleHref: string
  chiusura: string
  logoUrl: string
  urlSito: string
  firma: string
  mostraDisiscrizione: boolean
  testoDisiscrizione: string
}

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

export function formatDataItaliana(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
}

function esc(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Il testo dei blocchi è scritto a mano nella textarea: riga vuota = nuovo
// capoverso, a-capo singolo = <br>. È la stessa regola del sito (remarkBreaks
// in astro.config.mjs), così chi scrive non deve imparare due comportamenti.
function paragrafi(testo: string, stile: string): string {
  return testo
    .split(/\n\s*\n/)
    .map((blocco) => blocco.trim())
    .filter(Boolean)
    .map((blocco) => `<p style="${stile}">${esc(blocco).replace(/\n/g, '<br />')}</p>`)
    .join('\n              ')
}

const STILE_PARAGRAFO = `margin:0 0 14px; font-family:${FONT_TESTO}; font-size:16px; line-height:1.65; color:${COLORI.testoChiaro};`

// Pulsante: tabella e non <a> con padding, perché Outlook non applica il
// padding ai link. Il colore di sfondo sta sulla cella, il testo sul link.
function pulsante(label: string, href: string, allineamento: 'left' | 'center' = 'left'): string {
  if (!label.trim() || !href.trim()) return ''
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${allineamento}" style="margin:6px 0 0;">
                <tr>
                  <td align="center" bgcolor="${COLORI.accento}" style="border-radius:2px;">
                    <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display:inline-block; padding:13px 26px; font-family:${FONT_TITOLI}; font-size:15px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#FFFFFF; text-decoration:none;">${esc(label)}</a>
                  </td>
                </tr>
              </table>`
}

function meta(blocco: BloccoNewsletter): string {
  const voci = [
    blocco.etichetta.trim() ? esc(blocco.etichetta.trim().toUpperCase()) : '',
    blocco.mostraData ? esc(formatDataItaliana(blocco.data)) : '',
  ].filter(Boolean)

  if (!voci.length) return ''
  return `
              <p style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:13px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:${COLORI.accento};">${voci.join(' &middot; ')}</p>`
}

function titoloBlocco(blocco: BloccoNewsletter, dimensione: number): string {
  if (!blocco.titolo.trim()) return ''
  return `
              <h2 style="margin:0 0 10px; font-family:${FONT_TITOLI}; font-size:${dimensione}px; font-weight:800; line-height:1.15; letter-spacing:.01em; text-transform:uppercase; color:${COLORI.testo};">${esc(blocco.titolo)}</h2>`
}

function immagine(url: string, alt: string, larghezza: number): string {
  return `<img src="${esc(url)}" alt="${esc(alt)}" width="${larghezza}" style="display:block; width:100%; max-width:${larghezza}px; height:auto; border:0; outline:none; text-decoration:none;" />`
}

function bloccoHtml(blocco: BloccoNewsletter): string {
  const conFoto = blocco.layout !== 'solo-testo' && !!blocco.immagine?.trim()

  if (blocco.layout === 'compatto' && conFoto) {
    // Foto a lato: su mobile le due celle diventano larghe 100% (classe
    // .stack + media query in testa al documento) e la foto passa sopra.
    return `
        <tr>
          <td class="content-padding" style="padding:26px 40px; border-bottom:1px solid ${COLORI.bordo};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="stack" width="180" valign="top" style="width:180px; padding:0 20px 0 0;">
                  ${immagine(blocco.immagine!.trim(), blocco.immagineAlt || blocco.titolo, 180)}
                </td>
                <td class="stack" valign="top">${meta(blocco)}${titoloBlocco(blocco, 22)}
                  ${paragrafi(blocco.testo, STILE_PARAGRAFO)}${pulsante(blocco.ctaLabel, blocco.ctaHref)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
  }

  const foto = conFoto
    ? `
        <tr>
          <td style="padding:0;">${immagine(blocco.immagine!.trim(), blocco.immagineAlt || blocco.titolo, 600)}</td>
        </tr>`
    : ''

  return `${foto}
        <tr>
          <td class="content-padding" style="padding:26px 40px 30px; border-bottom:1px solid ${COLORI.bordo};">${meta(blocco)}${titoloBlocco(blocco, 26)}
              ${paragrafi(blocco.testo, STILE_PARAGRAFO)}${pulsante(blocco.ctaLabel, blocco.ctaHref)}
          </td>
        </tr>`
}

export function costruisciNewsletter(config: ConfigNewsletter): string {
  const blocchi = config.blocchi.map(bloccoHtml).join('\n')

  const intestazioneLogo = config.logoUrl.trim()
    ? `
              <a href="${esc(config.urlSito)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <img src="${esc(config.logoUrl.trim())}" alt="Tennis Club Ambrosiano" width="180" style="display:block; width:180px; max-width:180px; height:auto; border:0; margin:0 auto;" />
              </a>`
    : `
              <span style="font-family:${FONT_TITOLI}; font-size:24px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:${COLORI.testo};">Tennis Club Ambrosiano</span>`

  const testata = config.titolo.trim() || config.sottotitolo.trim() || config.intro.trim()
    ? `
        <tr>
          <td class="content-padding" style="padding:34px 40px 6px;">
            ${config.sottotitolo.trim()
              ? `<p style="margin:0 0 10px; font-family:${FONT_TITOLI}; font-size:13px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:${COLORI.accento};">${esc(config.sottotitolo)}</p>`
              : ''}
            ${config.titolo.trim()
              ? `<h1 class="heading" style="margin:0 0 14px; font-family:${FONT_TITOLI}; font-size:34px; font-weight:800; line-height:1.1; text-transform:uppercase; color:${COLORI.testo};">${esc(config.titolo)}</h1>`
              : ''}
            ${config.intro.trim() ? paragrafi(config.intro, STILE_PARAGRAFO) : ''}
          </td>
        </tr>`
    : ''

  const ctaFinale = pulsante(config.ctaFinaleLabel, config.ctaFinaleHref, 'center')
  const chiusura = config.chiusura.trim() || ctaFinale
    ? `
        <tr>
          <td class="content-padding" align="center" style="padding:30px 40px 34px;">
            ${config.chiusura.trim()
              ? paragrafi(config.chiusura, `${STILE_PARAGRAFO} text-align:center;`)
              : ''}
            ${ctaFinale}
          </td>
        </tr>`
    : ''

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${esc(config.oggetto || 'Newsletter Tennis Club Ambrosiano')}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: ${COLORI.sfondo}; }

      a.cta-button:hover { background-color: ${COLORI.accentoScuro} !important; }

      @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .content-padding { padding-left: 24px !important; padding-right: 24px !important; }
        .heading { font-size: 26px !important; }
        /* Le due celle del blocco compatto diventano una sopra l'altra */
        .stack { display: block !important; width: 100% !important; padding: 0 0 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORI.sfondo};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
      ${esc(config.preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORI.sfondo};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:${COLORI.carta};">
            <tr>
              <td align="center" style="padding:30px 40px 22px; border-bottom:1px solid ${COLORI.bordo};">${intestazioneLogo}
              </td>
            </tr>${testata}
${blocchi}${chiusura}
            <tr>
              <td align="center" style="padding:26px 40px 30px; background-color:${COLORI.sfondo};">
                <p style="margin:0 0 10px; font-family:${FONT_TESTO}; font-size:13px; line-height:1.6; color:${COLORI.testoChiaro};">
                  <a href="${esc(config.urlSito)}" target="_blank" rel="noopener noreferrer" style="color:${COLORI.accento}; text-decoration:none; font-weight:600;">tcambrosiano.com</a>
                </p>
                <p style="margin:0; font-family:${FONT_TESTO}; font-size:11px; line-height:1.6; color:${COLORI.testoChiaro};">
                  ${esc(config.firma)}
                </p>
                ${config.mostraDisiscrizione
                  ? `<p style="margin:12px 0 0; font-family:${FONT_TESTO}; font-size:11px; line-height:1.6; color:${COLORI.testoChiaro};">${esc(config.testoDisiscrizione)}</p>`
                  : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}
