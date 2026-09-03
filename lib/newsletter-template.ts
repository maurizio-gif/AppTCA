// Generatore del template HTML della newsletter.
//
// Funzioni pure (nessun accesso a rete o a Supabase): le usa sia l'anteprima
// nel browser sia il file scaricato, così ciò che si vede in anteprima e ciò
// che si incolla nella piattaforma di invio sono lo stesso HTML, byte per
// byte.
//
// L'impaginazione riproduce la newsletter mensile del Club (testata nera,
// foto di apertura, indice numerato, blocco scuro in evidenza, card evento
// con la data impilata, card news su fondo chiaro, footer con contatti e
// social). Le sezioni non si compongono a mano: i blocchi vengono raggruppati
// per tipo nell'ordine di ORDINE_SEZIONI e ogni gruppo prende la sua
// intestazione e il suo link di coda — chi compone scegle i contenuti, la
// struttura dell'email è sempre quella.
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
  scuro: '#111111',
  testo: '#1A1A1A',
  testoChiaro: '#555555',
  testoScuroSfondo: '#B9B9B9',
  accento: '#8B1A1A',
  accentoScuro: '#6B1414',
  bordo: '#EBEBEB',
  badge: '#F0EEEB',
  grigio: '#999999',
} as const

const FONT_TITOLI = "'Barlow Condensed', 'Arial Narrow', Arial, Helvetica, sans-serif"
const FONT_TESTO = 'Barlow, Arial, Helvetica, sans-serif'

// ─── Tipi ───────────────────────────────────────────────────────────────────

export const LAYOUT_BLOCCO = ['evento', 'news', 'evidenza', 'testo'] as const
export type LayoutBlocco = (typeof LAYOUT_BLOCCO)[number]

export const ETICHETTE_LAYOUT: Record<LayoutBlocco, string> = {
  evento: 'Card evento (foto, data grande, luogo)',
  news: 'Card news (fondo chiaro, foto piccola)',
  evidenza: 'Blocco scuro in evidenza',
  testo: 'Blocco semplice (foto grande e testo)',
}

// Ordine delle sezioni nell'email, indipendente dall'ordine con cui si
// spuntano i contenuti: prima l'annuncio in evidenza, poi il calendario, poi
// le notizie, infine i blocchi liberi. È l'ordine della newsletter mensile.
export const ORDINE_SEZIONI: readonly LayoutBlocco[] = ['evidenza', 'evento', 'news', 'testo']

export type Sezione = {
  eyebrow: string
  titolo: string
  linkLabel: string
  linkHref: string
}

export type BloccoNewsletter = {
  id: string
  layout: LayoutBlocco
  etichetta: string
  luogo: string
  titolo: string
  // Seconda riga del titolo, in rosso: solo per il blocco in evidenza
  titoloAccento: string
  data: string | null
  mostraData: boolean
  testo: string
  // Elenco numerato del blocco in evidenza (es. i passi del Passaparola)
  punti: string[]
  nota: string
  immagine: string | null
  immagineAlt: string
  ctaLabel: string
  ctaHref: string
  cta2Label: string
  cta2Href: string
}

export type ConfigNewsletter = {
  oggetto: string
  preheader: string

  // Testata nera
  logoUrl: string
  tagline: string
  ctaTestataLabel: string
  ctaTestataHref: string

  // Foto di apertura
  heroImmagine: string
  heroAlt: string

  // Apertura
  introEyebrow: string
  introTitolo: string
  introTitoloAccento: string
  intro: string
  indice: { titolo: string; testo: string }[]
  ctaIndiceLabel: string
  ctaIndiceHref: string

  blocchi: BloccoNewsletter[]
  sezioni: Record<LayoutBlocco, Sezione>

  // Chiusura e footer
  chiusuraTesto: string
  chiusuraLinkLabel: string
  chiusuraLinkHref: string
  footerNota: string
  footerRagioneSociale: string
  footerIndirizzo: string
  footerTelefono: string
  footerEmail: string
  instagramUrl: string
  facebookUrl: string
  footerMotivo: string
  urlSito: string
}

// ─── Date ───────────────────────────────────────────────────────────────────

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

// Data impilata della card evento: SET / 20 / 2026.
export function dataImpilata(iso: string | null): { mese: string; giorno: string; anno: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return {
    mese: MESI[d.getMonth()].slice(0, 3).toUpperCase(),
    giorno: String(d.getDate()).padStart(2, '0'),
    anno: String(d.getFullYear()),
  }
}

// ─── Utilità di rendering ───────────────────────────────────────────────────

function esc(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Il testo dei blocchi è scritto nella textarea: riga vuota = nuovo
// capoverso, a-capo singolo = <br>. È la stessa regola del sito (remarkBreaks
// in astro.config.mjs), così chi scrive non deve imparare due comportamenti.
function paragrafi(testo: string, stile: string): string {
  return testo
    .split(/\n\s*\n/)
    .map((blocco) => blocco.trim())
    .filter(Boolean)
    .map((blocco) => `<p style="${stile}">${esc(blocco).replace(/\n/g, '<br />')}</p>`)
    .join('\n            ')
}

const stileParagrafo = (colore: string, dimensione = 15.5) =>
  `margin:0 0 12px; font-family:${FONT_TESTO}; font-size:${dimensione}px; line-height:1.7; color:${colore};`

function immagine(url: string, alt: string, larghezza: number): string {
  return `<img src="${esc(url)}" alt="${esc(alt)}" width="${larghezza}" style="display:block; width:100%; max-width:${larghezza}px; height:auto; border:0; outline:none; text-decoration:none;" />`
}

// Pulsante pieno: tabella e non <a> con padding, perché Outlook non applica
// il padding ai link. Il colore di sfondo sta sulla cella.
function pulsante(
  label: string,
  href: string,
  opzioni?: { chiaro?: boolean; allineamento?: 'left' | 'center' }
): string {
  if (!label.trim() || !href.trim()) return ''
  const chiaro = opzioni?.chiaro
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${opzioni?.allineamento ?? 'left'}" style="margin:4px 0 0;">
              <tr>
                <td align="center" bgcolor="${chiaro ? '#FFFFFF' : COLORI.accento}" style="border-radius:1px;">
                  <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="${chiaro ? 'cta-chiaro' : 'cta-button'}" style="display:inline-block; padding:13px 26px; font-family:${FONT_TITOLI}; font-size:14px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; white-space:nowrap; color:${chiaro ? COLORI.scuro : '#FFFFFF'}; text-decoration:none;">${esc(label)}</a>
                </td>
              </tr>
            </table>`
}

// Link testuale con la freccia e la sottolineatura rossa: è il richiamo
// ricorrente della newsletter ("DETTAGLI →", "TUTTI GLI EVENTI →").
function linkFreccia(label: string, href: string, colore: string = COLORI.accento): string {
  if (!label.trim() || !href.trim()) return ''
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="font-family:${FONT_TITOLI}; font-size:13.5px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:${colore}; text-decoration:none; border-bottom:2px solid ${COLORI.accento}; padding-bottom:2px;">${esc(label)} &rarr;</a>`
}

// Link semplice sottolineato, senza freccia: per i social nel footer.
function linkSemplice(label: string, href: string): string {
  if (!label.trim() || !href.trim()) return ''
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="font-family:${FONT_TITOLI}; font-size:13px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:${COLORI.accento}; text-decoration:none; border-bottom:1px solid ${COLORI.accento}; padding-bottom:2px;">${esc(label)}</a>`
}

function divisore(colore: string = COLORI.bordo, margine = '0'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${margine};"><tr><td style="height:1px; line-height:1px; font-size:0; background-color:${colore};">&nbsp;</td></tr></table>`
}

// ─── Testata, apertura, indice ──────────────────────────────────────────────

function testata(config: ConfigNewsletter): string {
  const logo = config.logoUrl.trim()
    ? `<a href="${esc(config.urlSito)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;"><img src="${esc(config.logoUrl.trim())}" alt="Tennis Club Ambrosiano" width="210" style="display:block; width:210px; max-width:210px; height:auto; border:0; margin:0 auto;" /></a>`
    : `<span style="font-family:${FONT_TITOLI}; font-size:26px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#FFFFFF;">Tennis Club Ambrosiano</span>`

  const sotto = [
    config.tagline.trim()
      ? `<p style="margin:0 0 12px; font-family:${FONT_TESTO}; font-size:13px; line-height:1.6; color:#9A9A9A;">${esc(config.tagline)}</p>`
      : '',
    linkFreccia(config.ctaTestataLabel, config.ctaTestataHref, '#FFFFFF'),
  ]
    .filter(Boolean)
    .join('\n              ')

  return `
        <tr>
          <td class="content-padding" align="center" bgcolor="${COLORI.scuro}" style="padding:30px 40px 26px; background-color:${COLORI.scuro};">
              ${logo}
              ${sotto ? `${divisore('rgba(255,255,255,.18)', '20px 0 16px')}\n              ${sotto}` : ''}
          </td>
        </tr>`
}

function indice(voci: ConfigNewsletter['indice']): string {
  const valide = voci.filter((v) => v.titolo.trim())
  if (!valide.length) return ''

  const cella = (voce: { titolo: string; testo: string }, numero: number) => `
                <td class="stack" width="50%" valign="top" style="width:50%; padding:0 12px 20px 0;">
                  <p style="margin:0 0 4px; font-family:${FONT_TITOLI}; font-size:12px; font-weight:700; letter-spacing:.14em; color:${COLORI.accento};">${String(numero).padStart(2, '0')}</p>
                  <p style="margin:0 0 4px; font-family:${FONT_TITOLI}; font-size:18px; font-weight:800; letter-spacing:.02em; text-transform:uppercase; color:${COLORI.testo};">${esc(voce.titolo)}</p>
                  ${voce.testo.trim() ? `<p style="margin:0; font-family:${FONT_TESTO}; font-size:13.5px; line-height:1.6; color:${COLORI.testoChiaro};">${esc(voce.testo)}</p>` : ''}
                </td>`

  const righe: string[] = []
  for (let i = 0; i < valide.length; i += 2) {
    const coppia = [cella(valide[i], i + 1)]
    if (valide[i + 1]) coppia.push(cella(valide[i + 1], i + 2))
    else coppia.push('<td class="stack" width="50%" style="width:50%;">&nbsp;</td>')
    righe.push(`<tr>${coppia.join('')}\n              </tr>`)
  }

  return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${righe.join('\n              ')}
            </table>`
}

function apertura(config: ConfigNewsletter): string {
  const contenuto = [
    config.introEyebrow.trim()
      ? `<p style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:12.5px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:${COLORI.accento};">${esc(config.introEyebrow)}</p>`
      : '',
    config.introTitolo.trim() || config.introTitoloAccento.trim()
      ? `<h1 class="heading" style="margin:0 0 16px; font-family:${FONT_TITOLI}; font-size:38px; font-weight:800; line-height:1.05; letter-spacing:.005em; text-transform:uppercase; color:${COLORI.testo};">${esc(config.introTitolo)}${
          config.introTitoloAccento.trim()
            ? `<br /><span style="color:${COLORI.accento};">${esc(config.introTitoloAccento)}</span>`
            : ''
        }</h1>`
      : '',
    config.intro.trim() ? paragrafi(config.intro, stileParagrafo(COLORI.testoChiaro, 16)) : '',
  ]
    .filter(Boolean)
    .join('\n            ')

  const blocchiIndice = indice(config.indice)
  const cta = pulsante(config.ctaIndiceLabel, config.ctaIndiceHref, { allineamento: 'center' })

  if (!contenuto && !blocchiIndice && !cta) return ''

  return `
        <tr>
          <td class="content-padding" style="padding:34px 40px 8px;">
            ${contenuto}
            ${blocchiIndice ? `${divisore(COLORI.testo, '22px 0 20px')}\n            ${blocchiIndice}${divisore(COLORI.bordo, '2px 0 22px')}` : ''}
            ${cta ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0 0 8px;">${cta}\n            </td></tr></table>` : ''}
          </td>
        </tr>`
}

// ─── Blocchi ────────────────────────────────────────────────────────────────

function linkBlocco(blocco: BloccoNewsletter): string {
  const link = [
    linkFreccia(blocco.ctaLabel, blocco.ctaHref),
    linkFreccia(blocco.cta2Label, blocco.cta2Href, COLORI.testo),
  ].filter(Boolean)
  if (!link.length) return ''
  return `
                  <p style="margin:14px 0 0; line-height:2.2;">${link.join('&nbsp;&nbsp;&nbsp;&nbsp;')}</p>`
}

// Card evento: foto a piena larghezza, data impilata a sinistra, badge della
// categoria e luogo sopra il titolo. È il formato del calendario mensile.
function bloccoEvento(blocco: BloccoNewsletter): string {
  const data = blocco.mostraData ? dataImpilata(blocco.data) : null
  const foto = blocco.immagine?.trim()
    ? `
        <tr>
          <td style="padding:0;">${immagine(blocco.immagine.trim(), blocco.immagineAlt || blocco.titolo, 600)}</td>
        </tr>`
    : ''

  const celleData = data
    ? `
                <td class="stack" width="92" valign="top" style="width:92px; padding:0 16px 0 0;">
                  <p style="margin:0; font-family:${FONT_TITOLI}; font-size:12.5px; font-weight:700; letter-spacing:.12em; color:${COLORI.accento};">${data.mese}</p>
                  <p style="margin:0; font-family:${FONT_TITOLI}; font-size:42px; font-weight:800; line-height:1; color:${COLORI.testo};">${data.giorno}</p>
                  <p style="margin:2px 0 0; font-family:${FONT_TESTO}; font-size:12px; color:${COLORI.grigio};">${data.anno}</p>
                </td>`
    : ''

  const meta = [
    blocco.etichetta.trim()
      ? `<span style="display:inline-block; padding:3px 9px; background-color:${COLORI.badge}; font-family:${FONT_TITOLI}; font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:${COLORI.testo};">${esc(blocco.etichetta)}</span>`
      : '',
    blocco.luogo.trim()
      ? `<span style="font-family:${FONT_TESTO}; font-size:12.5px; color:${COLORI.testoChiaro};">${esc(blocco.luogo)}</span>`
      : '',
  ].filter(Boolean)

  return `${foto}
        <tr>
          <td class="content-padding" style="padding:18px 40px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>${celleData}
                <td class="stack" valign="top">
                  ${meta.length ? `<p style="margin:0 0 8px;">${meta.join('&nbsp;&nbsp;')}</p>` : ''}
                  <h2 style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:24px; font-weight:800; line-height:1.15; text-transform:uppercase; color:${COLORI.testo};">${esc(blocco.titolo)}</h2>
                  ${paragrafi(blocco.testo, stileParagrafo(COLORI.testoChiaro))}${linkBlocco(blocco)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td class="content-padding" style="padding:0 40px 18px;">${divisore()}</td></tr>`
}

// Card news: fondo chiaro, foto piccola a lato, data e categoria in rosso.
function bloccoNews(blocco: BloccoNewsletter): string {
  const foto = blocco.immagine?.trim()
    ? `
                <td class="stack" width="130" valign="top" style="width:130px; padding:0 16px 0 0;">
                  ${immagine(blocco.immagine.trim(), blocco.immagineAlt || blocco.titolo, 130)}
                </td>`
    : ''

  const meta = [
    blocco.mostraData ? formatDataItaliana(blocco.data).toUpperCase() : '',
    blocco.etichetta.trim().toUpperCase(),
  ].filter(Boolean)

  // Pulsante e link affiancati come nella newsletter mensile, ma solo se
  // l'etichetta del pulsante è corta: con un «Prenota il tuo provino» accanto
  // a «Leggi tutto» il link andrebbe a capo sulla freccia. Oltre i 18
  // caratteri il link passa sotto, senza che nessuno debba accorgersene.
  const bottone = pulsante(blocco.ctaLabel, blocco.ctaHref)
  const secondo = linkFreccia(blocco.cta2Label, blocco.cta2Href, COLORI.testo)
  const affiancati = !!bottone && !!secondo && blocco.ctaLabel.trim().length <= 18
  const azioni = affiancati
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">${bottone}</td><td valign="middle" style="padding:0 0 0 18px; white-space:nowrap;">${secondo}</td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${
        bottone ? `<tr><td>${bottone}</td></tr>` : ''
      }${secondo ? `<tr><td style="padding:${bottone ? '16px' : '4px'} 0 0;">${secondo}</td></tr>` : ''}</table>`

  return `
        <tr>
          <td class="content-padding" style="padding:0 40px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORI.sfondo}" style="background-color:${COLORI.sfondo};">
              <tr>
                <td class="content-padding-small" style="padding:18px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>${foto}
                      <td class="stack" valign="top">
                        ${meta.length ? `<p style="margin:0 0 6px; font-family:${FONT_TITOLI}; font-size:11.5px; font-weight:700; letter-spacing:.11em; text-transform:uppercase; color:${COLORI.accento};">${esc(meta.join(' · '))}</p>` : ''}
                        <h2 style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:21px; font-weight:800; line-height:1.15; text-transform:uppercase; color:${COLORI.testo};">${esc(blocco.titolo)}</h2>
                        ${paragrafi(blocco.testo, stileParagrafo(COLORI.testoChiaro, 14.5))}
                        ${azioni}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
}

// Blocco scuro: l'annuncio che deve staccare dal resto (Passaparola, promo).
function bloccoEvidenza(blocco: BloccoNewsletter): string {
  const punti = blocco.punti.filter((p) => p.trim())
  const elenco = punti.length
    ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;">
                    ${punti
                      .map(
                        (punto, i) => `<tr>
                      <td width="26" valign="top" style="width:26px; font-family:${FONT_TITOLI}; font-size:15px; font-weight:700; color:${COLORI.accento}; padding:0 0 10px;">${i + 1}.</td>
                      <td valign="top" style="font-family:${FONT_TESTO}; font-size:15px; line-height:1.65; color:${COLORI.testoScuroSfondo}; padding:0 0 10px;">${esc(punto)}</td>
                    </tr>`
                      )
                      .join('\n                    ')}
                  </table>`
    : ''

  return `
        <tr>
          <td class="content-padding" style="padding:8px 40px 26px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORI.scuro}" style="background-color:${COLORI.scuro};">
              <tr>
                <td class="content-padding-small" style="padding:28px 26px;">
                  ${blocco.etichetta.trim() ? `<p style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:12px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:${COLORI.accento};">${esc(blocco.etichetta)}</p>` : ''}
                  <h2 style="margin:0 0 12px; font-family:${FONT_TITOLI}; font-size:30px; font-weight:800; line-height:1.08; text-transform:uppercase; color:#FFFFFF;">${esc(blocco.titolo)}${
                    blocco.titoloAccento.trim()
                      ? `<br /><span style="color:${COLORI.accento};">${esc(blocco.titoloAccento)}</span>`
                      : ''
                  }</h2>
                  ${paragrafi(blocco.testo, stileParagrafo(COLORI.testoScuroSfondo))}
                  ${elenco}
                  ${blocco.nota.trim() ? `${divisore('rgba(255,255,255,.18)', '14px 0 12px')}\n                  <p style="margin:0 0 14px; font-family:${FONT_TITOLI}; font-size:12.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#CFCFCF;">${esc(blocco.nota)}</p>` : ''}
                  ${pulsante(blocco.ctaLabel, blocco.ctaHref, { chiaro: true, allineamento: 'center' })}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
}

// Blocco semplice: foto grande e testo, per servizi e pagine del sito.
function bloccoTesto(blocco: BloccoNewsletter): string {
  const foto = blocco.immagine?.trim()
    ? `
        <tr>
          <td style="padding:0;">${immagine(blocco.immagine.trim(), blocco.immagineAlt || blocco.titolo, 600)}</td>
        </tr>`
    : ''

  const meta = [
    blocco.etichetta.trim().toUpperCase(),
    blocco.mostraData ? formatDataItaliana(blocco.data).toUpperCase() : '',
  ].filter(Boolean)

  return `${foto}
        <tr>
          <td class="content-padding" style="padding:20px 40px 24px;">
            ${meta.length ? `<p style="margin:0 0 8px; font-family:${FONT_TITOLI}; font-size:11.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:${COLORI.accento};">${esc(meta.join(' · '))}</p>` : ''}
            <h2 style="margin:0 0 10px; font-family:${FONT_TITOLI}; font-size:24px; font-weight:800; line-height:1.15; text-transform:uppercase; color:${COLORI.testo};">${esc(blocco.titolo)}</h2>
            ${paragrafi(blocco.testo, stileParagrafo(COLORI.testoChiaro))}${linkBlocco(blocco)}
          </td>
        </tr>
        <tr><td class="content-padding" style="padding:0 40px 18px;">${divisore()}</td></tr>`
}

function bloccoHtml(blocco: BloccoNewsletter): string {
  switch (blocco.layout) {
    case 'evento':
      return bloccoEvento(blocco)
    case 'news':
      return bloccoNews(blocco)
    case 'evidenza':
      return bloccoEvidenza(blocco)
    default:
      return bloccoTesto(blocco)
  }
}

function intestazioneSezione(sezione: Sezione): string {
  if (!sezione.eyebrow.trim() && !sezione.titolo.trim()) return ''
  return `
        <tr>
          <td class="content-padding" style="padding:26px 40px 14px;">
            ${sezione.eyebrow.trim() ? `<p style="margin:0 0 6px; font-family:${FONT_TITOLI}; font-size:12.5px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:${COLORI.accento};">${esc(sezione.eyebrow)}</p>` : ''}
            ${sezione.titolo.trim() ? `<h2 style="margin:0; font-family:${FONT_TITOLI}; font-size:32px; font-weight:800; line-height:1.05; text-transform:uppercase; color:${COLORI.testo};">${esc(sezione.titolo)}</h2>` : ''}
          </td>
        </tr>`
}

function codaSezione(sezione: Sezione): string {
  const link = linkFreccia(sezione.linkLabel, sezione.linkHref)
  if (!link) return ''
  return `
        <tr>
          <td class="content-padding" align="center" style="padding:16px 40px 22px;">${link}</td>
        </tr>`
}

// ─── Chiusura e footer ──────────────────────────────────────────────────────

function chiusura(config: ConfigNewsletter): string {
  const link = linkFreccia(config.chiusuraLinkLabel, config.chiusuraLinkHref)
  if (!config.chiusuraTesto.trim() && !link) return ''
  return `
        <tr>
          <td class="content-padding" align="center" bgcolor="${COLORI.sfondo}" style="padding:26px 40px; background-color:${COLORI.sfondo};">
            ${config.chiusuraTesto.trim() ? `<p style="margin:0 0 12px; font-family:${FONT_TESTO}; font-size:14.5px; line-height:1.6; color:${COLORI.testo};">${esc(config.chiusuraTesto)}</p>` : ''}
            ${link}
          </td>
        </tr>`
}

function footer(config: ConfigNewsletter): string {
  const social = [
    config.instagramUrl.trim() ? linkSemplice('Instagram', config.instagramUrl) : '',
    config.facebookUrl.trim() ? linkSemplice('Facebook', config.facebookUrl) : '',
  ].filter(Boolean)

  const contatti = [config.footerTelefono.trim(), config.footerEmail.trim()].filter(Boolean).join(' · ')

  return `
        <tr>
          <td class="content-padding" align="center" style="padding:28px 40px 34px; border-top:1px solid ${COLORI.bordo};">
            ${config.footerNota.trim() ? `<p style="margin:0 0 16px; font-family:${FONT_TESTO}; font-size:13.5px; line-height:1.6; color:${COLORI.testoChiaro};">${esc(config.footerNota)}</p>` : ''}
            ${config.footerRagioneSociale.trim() ? `<p style="margin:0 0 2px; font-family:${FONT_TITOLI}; font-size:14px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:${COLORI.testo};">${esc(config.footerRagioneSociale)}</p>` : ''}
            ${config.footerIndirizzo.trim() ? `<p style="margin:0 0 2px; font-family:${FONT_TESTO}; font-size:13px; line-height:1.6; color:${COLORI.testoChiaro};">${esc(config.footerIndirizzo)}</p>` : ''}
            ${contatti ? `<p style="margin:0 0 16px; font-family:${FONT_TESTO}; font-size:13px; line-height:1.6; color:${COLORI.testoChiaro};">${esc(contatti)}</p>` : ''}
            ${social.length ? `<p style="margin:0 0 18px; line-height:2.4;">${social.join('&nbsp;&nbsp;&nbsp;&nbsp;')}</p>` : ''}
            ${config.footerMotivo.trim() ? `<p style="margin:0; font-family:${FONT_TESTO}; font-size:11.5px; line-height:1.6; color:#777777;">${esc(config.footerMotivo)}</p>` : ''}
          </td>
        </tr>`
}

// ─── Documento ──────────────────────────────────────────────────────────────

export function costruisciNewsletter(config: ConfigNewsletter): string {
  // Le sezioni si compongono da sole: i blocchi vengono raggruppati per tipo
  // nell'ordine fisso della newsletter mensile, e ogni gruppo porta la sua
  // intestazione e il suo link di coda. Le frecce ▲▼ nel CRM riordinano i
  // blocchi dentro la loro sezione.
  const sezioni = ORDINE_SEZIONI.map((layout) => {
    const blocchi = config.blocchi.filter((b) => b.layout === layout)
    if (!blocchi.length) return ''
    const sezione = config.sezioni[layout]
    return `${intestazioneSezione(sezione)}
${blocchi.map(bloccoHtml).join('\n')}${codaSezione(sezione)}`
  })
    .filter(Boolean)
    .join('\n')

  const hero = config.heroImmagine.trim()
    ? `
        <tr>
          <td style="padding:0;">${immagine(config.heroImmagine.trim(), config.heroAlt || 'Tennis Club Ambrosiano', 600)}</td>
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
      a.cta-chiaro:hover { background-color: ${COLORI.badge} !important; }

      @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .content-padding { padding-left: 22px !important; padding-right: 22px !important; }
        .content-padding-small { padding-left: 16px !important; padding-right: 16px !important; }
        .heading { font-size: 28px !important; }
        /* Celle affiancate (data evento, foto news, indice) una sopra l'altra */
        .stack { display: block !important; width: 100% !important; padding: 0 0 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORI.sfondo};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
      ${esc(config.preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORI.sfondo};">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:${COLORI.carta};">${testata(config)}${hero}${apertura(config)}
${sezioni}${chiusura(config)}${footer(config)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}
