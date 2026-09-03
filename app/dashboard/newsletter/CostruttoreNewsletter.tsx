'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  costruisciNewsletter,
  formatDataItaliana,
  ETICHETTE_LAYOUT,
  LAYOUT_BLOCCO,
  ORDINE_SEZIONI,
  type BloccoNewsletter,
  type ConfigNewsletter,
  type LayoutBlocco,
  type Sezione,
} from '@/lib/newsletter-template'
import {
  ETICHETTE_TIPO,
  TIPI_VOCE,
  type ContenutiSito,
  type TipoVoce,
  type VoceSito,
} from '@/lib/newsletter-contenuti'
import { registraNewsletterGenerata, ricaricaContenutiSito } from './actions'

// Costruttore della newsletter: sceglie le voci dal sito, le trasforma in
// blocchi editabili e genera l'HTML (lib/newsletter-template.ts).
//
// Tutto in un solo componente client perche' e' un unico foglio di lavoro:
// spostare una voce fra i passi non deve passare dal server, e l'anteprima
// deve aggiornarsi mentre si scrive. Il server serve solo per rileggere il
// feed del sito e per il registro operatori (vedi actions.ts).
//
// Due scelte che rendono il template "replicabile senza pensarci":
//  - il tipo di contenuto decide l'impaginazione del blocco (un evento
//    diventa una card con la data grande, una news una card su fondo chiaro,
//    la promo un blocco scuro), e resta cambiabile a mano;
//  - le sezioni non si montano: i blocchi vengono raggruppati per tipo
//    nell'ordine fisso della newsletter mensile, con intestazioni e link di
//    coda gia' scritti (vedi ORDINE_SEZIONI nel template).
//
// Il testo di un blocco NON e' un campo libero riempito a mano: nasce dai
// capoversi della pagina del sito, spuntati uno per uno. Se poi viene
// modificato, la composizione automatica si ferma (testoManuale) per non
// cancellare quanto scritto, ed esiste un pulsante per tornare al sito.

const CHIAVE_BOZZA = 'tca-newsletter-bozza-v2'

type Fonte = { testo: string; etichetta: string; scelta: boolean }

type Blocco = {
  voceId: string
  tipo: TipoVoce
  layout: LayoutBlocco
  etichetta: string
  luogo: string
  titolo: string
  titoloAccento: string
  data: string | null
  mostraData: boolean
  fonti: Fonte[]
  testoManuale: string | null
  punti: string
  nota: string
  immagine: string
  immagineAlt: string
  ctaLabel: string
  ctaHref: string
  cta2Label: string
  cta2Href: string
}

type Impostazioni = {
  oggetto: string
  preheader: string
  tagline: string
  ctaTestataLabel: string
  ctaTestataHref: string
  heroImmagine: string
  heroAlt: string
  introEyebrow: string
  introTitolo: string
  introTitoloAccento: string
  intro: string
  indice: { titolo: string; testo: string }[]
  ctaIndiceLabel: string
  ctaIndiceHref: string
  sezioni: Record<LayoutBlocco, Sezione>
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
}

type Bozza = { impostazioni: Impostazioni; blocchi: Blocco[] }

// Valori di partenza: sono quelli della newsletter mensile del Club, così una
// newsletter nuova è già impaginata e servono solo i contenuti. Restano tutti
// modificabili nel passo 3.
function impostazioniIniziali(sito: string): Impostazioni {
  const oggi = new Date()
  const mese = formatDataItaliana(oggi.toISOString()).split(' ').slice(1).join(' ')
  return {
    oggetto: `Cosa succede al TCA — ${mese}`,
    preheader: 'Eventi in calendario, ultime news dal Club e iniziative in corso.',
    tagline: 'Eventi, news, help desk e servizi del Club — tutto in una pagina.',
    ctaTestataLabel: 'Vai a Club Life',
    ctaTestataHref: `${sito}/club-life`,
    heroImmagine: '',
    heroAlt: 'Il Tennis Club Ambrosiano',
    introEyebrow: 'Il Club',
    introTitolo: 'Cosa succede',
    introTitoloAccento: 'al TCA',
    intro:
      'Ciao! In questa newsletter trovi i prossimi eventi in calendario, le ultime news dal Club e le iniziative in corso. Tutto questo — e molto altro — vive ogni giorno nella pagina Club Life, la bacheca del Club per soci e famiglie.',
    indice: [
      { titolo: 'Eventi', testo: 'Tornei, clinic e serate del Club.' },
      { titolo: 'News', testo: 'Le ultime notizie e i racconti dal TCA.' },
      { titolo: 'Help desk', testo: 'Guide rapide su certificati, prenotazioni e pagamenti.' },
      { titolo: 'Servizi e partner', testo: 'Preparatori, pickleball, feste e tutti i servizi del Club.' },
    ],
    ctaIndiceLabel: 'Scopri Club Life',
    ctaIndiceHref: `${sito}/club-life`,
    sezioni: {
      // Il blocco scuro porta la sua etichetta dentro di sé (come il
      // Passaparola nella newsletter di settembre): niente intestazione.
      evidenza: { eyebrow: '', titolo: '', linkLabel: '', linkHref: '' },
      evento: {
        eyebrow: 'In calendario',
        titolo: 'Prossimi eventi',
        linkLabel: 'Tutti gli eventi',
        linkHref: `${sito}/eventi`,
      },
      news: {
        eyebrow: 'News dal Club',
        titolo: 'Le ultime notizie',
        linkLabel: 'Tutte le news',
        linkHref: `${sito}/club-life#news`,
      },
      testo: { eyebrow: 'Dal Club', titolo: 'Servizi e pagine', linkLabel: '', linkHref: '' },
    },
    chiusuraTesto:
      'Eventi, news, help desk e servizi: trovi tutto aggiornato in tempo reale su Club Life.',
    chiusuraLinkLabel: 'Vai a Club Life',
    chiusuraLinkHref: `${sito}/club-life`,
    footerNota:
      'Non perderti nulla: su Club Life trovi sempre eventi, news, help desk e servizi del Club aggiornati.',
    footerRagioneSociale: 'Tennis Club Ambrosiano SSD a r.l.',
    footerIndirizzo: 'Via Feltre 33, 20134 Milano',
    footerTelefono: '+39 02 2641 4392',
    footerEmail: 'info@tcambrosiano.com',
    instagramUrl: 'https://www.instagram.com/clubambrosiano',
    facebookUrl: 'https://www.facebook.com/tcambrosiano',
    footerMotivo:
      'Hai ricevuto questa email perché sei socio/a del TC Ambrosiano. Per gestire le preferenze di comunicazione scrivi a info@tcambrosiano.com.',
  }
}

// Il tipo di contenuto decide l'impaginazione: è la regola che rende la
// newsletter sempre uguale a sé stessa senza che nessuno debba scegliere.
const LAYOUT_PER_TIPO: Record<TipoVoce, LayoutBlocco> = {
  evento: 'evento',
  news: 'news',
  promo: 'evidenza',
  servizio: 'testo',
  pagina: 'testo',
}

// I capoversi disponibili per una voce: la sintesi (quella che si legge in
// elenco sul sito) più i capoversi del corpo della pagina. La sintesi è
// spuntata di default: è il minimo di un blocco, e su molte voci è anche
// l'unico testo esistente.
function fontiDaVoce(voce: VoceSito): Fonte[] {
  const fonti: Fonte[] = []
  if (voce.sintesi) fonti.push({ testo: voce.sintesi, etichetta: 'Sintesi', scelta: true })
  voce.paragrafi.forEach((p, i) => {
    fonti.push({ testo: p, etichetta: `Capoverso ${i + 1}`, scelta: false })
  })
  if (!fonti.length) fonti.push({ testo: voce.titolo, etichetta: 'Titolo', scelta: true })
  return fonti
}

// I due link di un blocco seguono il formato della newsletter mensile: su un
// evento «Dettagli» porta alla pagina e il secondo link alle iscrizioni; su
// una news il pulsante è la CTA scritta in TinaCMS e accanto c'è «Leggi
// tutto». Così non c'è nulla da incollare a mano.
function linkDaVoce(voce: VoceSito, layout: LayoutBlocco) {
  const ctaPropria = voce.ctaLabel && voce.ctaHref ? { label: voce.ctaLabel, href: voce.ctaHref } : null

  if (layout === 'evento') {
    return {
      ctaLabel: 'Dettagli',
      ctaHref: voce.url,
      cta2Label: ctaPropria && ctaPropria.href !== voce.url ? ctaPropria.label : '',
      cta2Href: ctaPropria && ctaPropria.href !== voce.url ? ctaPropria.href : '',
    }
  }

  if (layout === 'news') {
    return {
      ctaLabel: ctaPropria?.label ?? '',
      ctaHref: ctaPropria?.href ?? '',
      cta2Label: 'Leggi tutto',
      cta2Href: voce.url,
    }
  }

  return {
    ctaLabel: ctaPropria?.label ?? 'Scopri di più',
    ctaHref: ctaPropria?.href ?? voce.url,
    cta2Label: '',
    cta2Href: '',
  }
}

function bloccoDaVoce(voce: VoceSito): Blocco {
  const layout = LAYOUT_PER_TIPO[voce.tipo]
  const link = linkDaVoce(voce, layout)
  return {
    voceId: voce.id,
    tipo: voce.tipo,
    layout,
    etichetta: voce.categoria ?? ETICHETTE_TIPO[voce.tipo],
    luogo: voce.luogo ?? '',
    titolo: voce.titolo,
    titoloAccento: '',
    data: voce.data,
    mostraData: !!voce.data && (voce.tipo === 'news' || voce.tipo === 'evento'),
    fonti: fontiDaVoce(voce),
    testoManuale: null,
    punti: '',
    nota: voce.tipo === 'promo' ? voce.note ?? '' : '',
    immagine: voce.immagine ?? '',
    immagineAlt: voce.immagineAlt ?? voce.titolo,
    ...link,
  }
}

function testoBlocco(blocco: Blocco): string {
  if (blocco.testoManuale !== null) return blocco.testoManuale
  return blocco.fonti
    .filter((f) => f.scelta)
    .map((f) => f.testo)
    .join('\n\n')
}

export function CostruttoreNewsletter({ contenutiIniziali }: { contenutiIniziali: ContenutiSito }) {
  const [contenuti, setContenuti] = useState(contenutiIniziali)
  const [impostazioni, setImpostazioni] = useState<Impostazioni>(() =>
    impostazioniIniziali(contenutiIniziali.sito)
  )
  const [blocchi, setBlocchi] = useState<Blocco[]>([])
  const [bozzaLetta, setBozzaLetta] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [anteprimaMobile, setAnteprimaMobile] = useState(false)
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false)

  // Filtri del passo 1
  const [tipiAttivi, setTipiAttivi] = useState<TipoVoce[]>([...TIPI_VOCE])
  const [ricerca, setRicerca] = useState('')
  const [da, setDa] = useState('')
  const [a, setA] = useState('')
  const [soloConFoto, setSoloConFoto] = useState(false)

  const vociPerId = useMemo(() => new Map(contenuti.voci.map((v) => [v.id, v])), [contenuti.voci])

  // Ripresa del lavoro in corso: una newsletter si compone in più riprese e un
  // ricaricamento della pagina non deve azzerarla. Le voci nel frattempo
  // depubblicate vengono lasciate cadere, con un avviso: meglio un blocco in
  // meno che un blocco che rimanda a una pagina che non c'è più.
  useEffect(() => {
    try {
      const salvato = localStorage.getItem(CHIAVE_BOZZA)
      if (salvato) {
        const bozza = JSON.parse(salvato) as Bozza
        if (bozza?.impostazioni && Array.isArray(bozza.blocchi)) {
          const iniziali = impostazioniIniziali(contenutiIniziali.sito)
          const validi = bozza.blocchi.filter((b) => vociPerId.has(b.voceId))
          setImpostazioni({
            ...iniziali,
            ...bozza.impostazioni,
            sezioni: { ...iniziali.sezioni, ...(bozza.impostazioni.sezioni ?? {}) },
            indice: bozza.impostazioni.indice ?? iniziali.indice,
          })
          setBlocchi(validi)
          if (validi.length < bozza.blocchi.length) {
            setAvviso(
              `${bozza.blocchi.length - validi.length} blocco/i della bozza non c'è più sul sito ed è stato rimosso.`
            )
          }
        }
      }
    } catch {
      // Bozza illeggibile (formato vecchio, storage pieno): si riparte da
      // vuoto, che è esattamente lo stato di una newsletter nuova.
    }
    setBozzaLetta(true)
    // Solo al montaggio: la bozza si legge una volta sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!bozzaLetta) return
    try {
      localStorage.setItem(CHIAVE_BOZZA, JSON.stringify({ impostazioni, blocchi } satisfies Bozza))
    } catch {
      // Storage non disponibile: si continua senza salvataggio.
    }
  }, [impostazioni, blocchi, bozzaLetta])

  const selezionati = useMemo(() => new Set(blocchi.map((b) => b.voceId)), [blocchi])

  const vociFiltrate = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    const dataDa = da ? new Date(`${da}T00:00:00`).getTime() : null
    const dataA = a ? new Date(`${a}T23:59:59`).getTime() : null

    return contenuti.voci.filter((voce) => {
      if (!tipiAttivi.includes(voce.tipo)) return false
      if (soloConFoto && !voce.immagine) return false
      if (q && !`${voce.titolo} ${voce.categoria ?? ''} ${voce.sintesi}`.toLowerCase().includes(q)) return false
      if (dataDa || dataA) {
        if (!voce.data) return false
        const t = new Date(voce.data).getTime()
        if (dataDa && t < dataDa) return false
        if (dataA && t > dataA) return false
      }
      return true
    })
  }, [contenuti.voci, tipiAttivi, ricerca, da, a, soloConFoto])

  function alternaVoce(voce: VoceSito) {
    setBlocchi((precedenti) =>
      precedenti.some((b) => b.voceId === voce.id)
        ? precedenti.filter((b) => b.voceId !== voce.id)
        : [...precedenti, bloccoDaVoce(voce)]
    )
  }

  function aggiornaBlocco(voceId: string, modifica: Partial<Blocco>) {
    setBlocchi((precedenti) => precedenti.map((b) => (b.voceId === voceId ? { ...b, ...modifica } : b)))
  }

  // Le frecce spostano il blocco dentro la sua sezione: l'ordine fra sezioni
  // è fisso (vedi ORDINE_SEZIONI), quindi scambiare con un blocco di un'altra
  // sezione non produrrebbe nessun effetto visibile nell'email.
  function spostaBlocco(voceId: string, direzione: -1 | 1) {
    setBlocchi((precedenti) => {
      const blocco = precedenti.find((b) => b.voceId === voceId)
      if (!blocco) return precedenti
      const stessaSezione = precedenti.filter((b) => b.layout === blocco.layout)
      const posizione = stessaSezione.indexOf(blocco)
      const vicino = stessaSezione[posizione + direzione]
      if (!vicino) return precedenti
      const copia = [...precedenti]
      const i = copia.indexOf(blocco)
      const j = copia.indexOf(vicino)
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  function alternaFonte(voceId: string, indice: number) {
    setBlocchi((precedenti) =>
      precedenti.map((b) => {
        if (b.voceId !== voceId) return b
        const fonti = b.fonti.map((f, i) => (i === indice ? { ...f, scelta: !f.scelta } : f))
        // Tornando a spuntare i capoversi si ricompone il testo dal sito:
        // altrimenti la spunta sembrerebbe non fare nulla.
        return { ...b, fonti, testoManuale: null }
      })
    )
  }

  // I blocchi in anteprima seguono l'ordine delle sezioni: è lo stesso ordine
  // in cui il template li impagina, così l'elenco del passo 2 e l'email si
  // leggono nello stesso verso.
  const blocchiOrdinati = useMemo(
    () =>
      ORDINE_SEZIONI.flatMap((layout) => blocchi.filter((b) => b.layout === layout)).concat(
        blocchi.filter((b) => !ORDINE_SEZIONI.includes(b.layout))
      ),
    [blocchi]
  )

  const config: ConfigNewsletter = useMemo(
    () => ({
      oggetto: impostazioni.oggetto,
      preheader: impostazioni.preheader,
      logoUrl: `${contenuti.sito}/logos/tca-logo-esteso.png`,
      tagline: impostazioni.tagline,
      ctaTestataLabel: impostazioni.ctaTestataLabel,
      ctaTestataHref: impostazioni.ctaTestataHref,
      heroImmagine: impostazioni.heroImmagine,
      heroAlt: impostazioni.heroAlt,
      introEyebrow: impostazioni.introEyebrow,
      introTitolo: impostazioni.introTitolo,
      introTitoloAccento: impostazioni.introTitoloAccento,
      intro: impostazioni.intro,
      indice: impostazioni.indice,
      ctaIndiceLabel: impostazioni.ctaIndiceLabel,
      ctaIndiceHref: impostazioni.ctaIndiceHref,
      blocchi: blocchiOrdinati.map(
        (b): BloccoNewsletter => ({
          id: b.voceId,
          layout: b.layout,
          etichetta: b.etichetta,
          luogo: b.luogo,
          titolo: b.titolo,
          titoloAccento: b.titoloAccento,
          data: b.data,
          mostraData: b.mostraData,
          testo: testoBlocco(b),
          punti: b.punti
            .split('\n')
            .map((p) => p.trim())
            .filter(Boolean),
          nota: b.nota,
          immagine: b.immagine || null,
          immagineAlt: b.immagineAlt,
          ctaLabel: b.ctaLabel,
          ctaHref: b.ctaHref,
          cta2Label: b.cta2Label,
          cta2Href: b.cta2Href,
        })
      ),
      sezioni: impostazioni.sezioni,
      chiusuraTesto: impostazioni.chiusuraTesto,
      chiusuraLinkLabel: impostazioni.chiusuraLinkLabel,
      chiusuraLinkHref: impostazioni.chiusuraLinkHref,
      footerNota: impostazioni.footerNota,
      footerRagioneSociale: impostazioni.footerRagioneSociale,
      footerIndirizzo: impostazioni.footerIndirizzo,
      footerTelefono: impostazioni.footerTelefono,
      footerEmail: impostazioni.footerEmail,
      instagramUrl: impostazioni.instagramUrl,
      facebookUrl: impostazioni.facebookUrl,
      footerMotivo: impostazioni.footerMotivo,
      urlSito: contenuti.sito,
    }),
    [impostazioni, blocchiOrdinati, contenuti.sito]
  )

  const html = useMemo(() => costruisciNewsletter(config), [config])

  async function ricarica() {
    setInCorso(true)
    setErrore(null)
    setAvviso(null)
    const esito = await ricaricaContenutiSito()
    setInCorso(false)
    if (!esito.ok) {
      setErrore(esito.errore)
      return
    }
    setContenuti(esito.contenuti)
    const idAttivi = new Set(esito.contenuti.voci.map((v) => v.id))
    setBlocchi((precedenti) => {
      const validi = precedenti.filter((b) => idAttivi.has(b.voceId))
      if (validi.length < precedenti.length) {
        setAvviso(`${precedenti.length - validi.length} blocco/i non è più pubblicato sul sito ed è stato rimosso.`)
      }
      return validi
    })
  }

  async function copiaHtml() {
    setErrore(null)
    try {
      await navigator.clipboard.writeText(html)
      setAvviso('HTML copiato: incollalo nell’editor «codice HTML» della piattaforma di invio.')
    } catch {
      setErrore('Il browser non ha permesso la copia automatica: usa «Scarica .html».')
      return
    }
    void registraNewsletterGenerata(impostazioni.oggetto, blocchi.length)
  }

  function scaricaHtml() {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `newsletter-${new Date().toISOString().slice(0, 10)}.html`
    link.click()
    URL.revokeObjectURL(url)
    void registraNewsletterGenerata(impostazioni.oggetto, blocchi.length)
  }

  function svuota() {
    if (!confirm('Svuoti la newsletter in corso? I blocchi scelti e i testi modificati vanno persi.')) return
    setBlocchi([])
    setImpostazioni(impostazioniIniziali(contenuti.sito))
    setAvviso(null)
    setErrore(null)
  }

  function campoImpostazione(
    etichetta: string,
    chiave: keyof Impostazioni,
    opzioni?: { larga?: boolean; righe?: number; tipo?: 'text' | 'url' }
  ) {
    const valore = impostazioni[chiave]
    if (typeof valore !== 'string') return null
    return (
      <label className={`nl-campo${opzioni?.larga ? ' nl-campo-larga' : ''}`}>
        <span>{etichetta}</span>
        {opzioni?.righe ? (
          <textarea
            rows={opzioni.righe}
            value={valore}
            onChange={(e) => setImpostazioni({ ...impostazioni, [chiave]: e.target.value })}
          />
        ) : (
          <input
            type={opzioni?.tipo ?? 'text'}
            value={valore}
            onChange={(e) => setImpostazioni({ ...impostazioni, [chiave]: e.target.value })}
          />
        )}
      </label>
    )
  }

  function aggiornaSezione(layout: LayoutBlocco, modifica: Partial<Sezione>) {
    setImpostazioni({
      ...impostazioni,
      sezioni: { ...impostazioni.sezioni, [layout]: { ...impostazioni.sezioni[layout], ...modifica } },
    })
  }

  const selettoreFoto = (valore: string, onChange: (v: string) => void, voce?: VoceSito) => (
    <select value={valore} onChange={(e) => onChange(e.target.value)}>
      <option value="">Nessuna foto</option>
      {voce?.immagine && (
        <option value={voce.immagine}>
          Foto della pagina{voce.immagineEmailSafe ? '' : ' (formato non adatto)'}
        </option>
      )}
      {contenuti.immagini.map((immagine) => (
        <option key={immagine.url} value={immagine.url}>
          {immagine.nome}
        </option>
      ))}
    </select>
  )

  return (
    <div className="nl">
      {errore && <p className="error-banner">{errore}</p>}
      {avviso && <p className="nl-avviso">{avviso}</p>}

      {/* ── Passo 1: scelta dei contenuti ─────────────────────────────── */}
      <section className="nl-passo">
        <header className="nl-passo-testa">
          <h2>
            <span className="nl-passo-numero">1</span> Contenuti dal sito
          </h2>
          <div className="nl-passo-azioni">
            <span className="nl-conteggio">
              {blocchi.length} scelti su {contenuti.voci.length}
            </span>
            <button type="button" className="btn btn-small btn-ghost" onClick={ricarica} disabled={inCorso}>
              {inCorso ? 'Ricarico…' : 'Ricarica dal sito'}
            </button>
          </div>
        </header>

        <div className="nl-filtri">
          <div className="nl-filtri-tipi">
            {TIPI_VOCE.map((tipo) => (
              <label key={tipo} className={`nl-chip${tipiAttivi.includes(tipo) ? ' is-attivo' : ''}`}>
                <input
                  type="checkbox"
                  checked={tipiAttivi.includes(tipo)}
                  onChange={() =>
                    setTipiAttivi((precedenti) =>
                      precedenti.includes(tipo) ? precedenti.filter((t) => t !== tipo) : [...precedenti, tipo]
                    )
                  }
                />
                {ETICHETTE_TIPO[tipo]}
                <span className="nl-chip-num">{contenuti.voci.filter((v) => v.tipo === tipo).length}</span>
              </label>
            ))}
          </div>

          <div className="nl-filtri-riga">
            <label className="nl-campo nl-campo-cerca">
              <span>Cerca nel titolo</span>
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="es. padel, provini, camp…"
              />
            </label>
            <label className="nl-campo">
              <span>Dal</span>
              <input type="date" value={da} onChange={(e) => setDa(e.target.value)} />
            </label>
            <label className="nl-campo">
              <span>Al</span>
              <input type="date" value={a} onChange={(e) => setA(e.target.value)} />
            </label>
            <label className="filtro-checkbox">
              <input type="checkbox" checked={soloConFoto} onChange={(e) => setSoloConFoto(e.target.checked)} />
              Solo voci con foto
            </label>
          </div>
        </div>

        {vociFiltrate.length === 0 ? (
          <p className="muted">Nessun contenuto con questi filtri.</p>
        ) : (
          <ul className="nl-elenco">
            {vociFiltrate.map((voce) => {
              const scelta = selezionati.has(voce.id)
              return (
                <li key={voce.id} className={`nl-voce${scelta ? ' is-scelta' : ''}`}>
                  <label className="nl-voce-spunta">
                    <input type="checkbox" checked={scelta} onChange={() => alternaVoce(voce)} />
                  </label>
                  <div className="nl-voce-corpo">
                    <div className="nl-voce-meta">
                      <span className={`nl-badge nl-badge-${voce.tipo}`}>{ETICHETTE_TIPO[voce.tipo]}</span>
                      {voce.categoria && <span className="nl-voce-cat">{voce.categoria}</span>}
                      {voce.data && <span className="nl-voce-data">{formatDataItaliana(voce.data)}</span>}
                      {voce.luogo && <span className="nl-voce-cat">{voce.luogo}</span>}
                      {voce.immagine && !voce.immagineEmailSafe && (
                        <span className="nl-warn" title="Formato non visibile in molti programmi di posta">
                          foto in formato non adatto alle email
                        </span>
                      )}
                    </div>
                    <p className="nl-voce-titolo">{voce.titolo}</p>
                    {voce.sintesi && <p className="nl-voce-sintesi">{voce.sintesi}</p>}
                    <a href={voce.url} target="_blank" rel="noopener noreferrer" className="nl-voce-link">
                      Apri sul sito ↗
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Passo 2: blocchi dell'email ───────────────────────────────── */}
      <section className="nl-passo">
        <header className="nl-passo-testa">
          <h2>
            <span className="nl-passo-numero">2</span> Blocchi dell&apos;email
          </h2>
          <span className="nl-conteggio">l&apos;ordine delle sezioni è fisso: evidenza, eventi, news, altro</span>
        </header>

        {blocchi.length === 0 ? (
          <p className="muted">
            Nessun blocco: spunta almeno un contenuto nel passo 1 e comparirà qui, già impaginato secondo il suo
            tipo.
          </p>
        ) : (
          <ol className="nl-blocchi">
            {blocchiOrdinati.map((blocco) => {
              const voce = vociPerId.get(blocco.voceId)
              const fotoNonSicura = !!voce && blocco.immagine === voce.immagine && !voce.immagineEmailSafe
              const primoDellaSezione =
                blocchiOrdinati.find((b) => b.layout === blocco.layout)?.voceId === blocco.voceId
              const ultimoDellaSezione =
                [...blocchiOrdinati].reverse().find((b) => b.layout === blocco.layout)?.voceId === blocco.voceId
              return (
                <li key={blocco.voceId} className="nl-blocco">
                  <div className="nl-blocco-testa">
                    <span className={`nl-badge nl-badge-${blocco.tipo}`}>{ETICHETTE_TIPO[blocco.tipo]}</span>
                    <strong className="nl-blocco-nome">{blocco.titolo}</strong>
                    <div className="nl-blocco-ordine">
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => spostaBlocco(blocco.voceId, -1)}
                        disabled={primoDellaSezione}
                        aria-label="Sposta su"
                        title="Sposta su (dentro la sua sezione)"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => spostaBlocco(blocco.voceId, 1)}
                        disabled={ultimoDellaSezione}
                        aria-label="Sposta giù"
                        title="Sposta giù (dentro la sua sezione)"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => setBlocchi((p) => p.filter((b) => b.voceId !== blocco.voceId))}
                      >
                        Togli
                      </button>
                    </div>
                  </div>

                  <div className="nl-blocco-griglia">
                    <label className="nl-campo nl-campo-larga">
                      <span>Impaginazione</span>
                      <select
                        value={blocco.layout}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { layout: e.target.value as LayoutBlocco })}
                      >
                        {LAYOUT_BLOCCO.map((layout) => (
                          <option key={layout} value={layout}>
                            {ETICHETTE_LAYOUT[layout]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="nl-campo">
                      <span>Etichetta (categoria)</span>
                      <input
                        type="text"
                        value={blocco.etichetta}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { etichetta: e.target.value })}
                      />
                    </label>

                    {blocco.layout === 'evento' && (
                      <label className="nl-campo">
                        <span>Luogo</span>
                        <input
                          type="text"
                          value={blocco.luogo}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { luogo: e.target.value })}
                        />
                      </label>
                    )}

                    <label className="nl-campo nl-campo-larga">
                      <span>Titolo del blocco</span>
                      <input
                        type="text"
                        value={blocco.titolo}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { titolo: e.target.value })}
                      />
                    </label>

                    {blocco.layout === 'evidenza' && (
                      <label className="nl-campo nl-campo-larga">
                        <span>Seconda riga del titolo (in rosso)</span>
                        <input
                          type="text"
                          value={blocco.titoloAccento}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { titoloAccento: e.target.value })}
                        />
                      </label>
                    )}

                    {blocco.data && (
                      <label className="filtro-checkbox">
                        <input
                          type="checkbox"
                          checked={blocco.mostraData}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { mostraData: e.target.checked })}
                        />
                        Mostra la data ({formatDataItaliana(blocco.data)})
                      </label>
                    )}
                  </div>

                  <div className="nl-blocco-testo">
                    <p className="nl-etichetta">Testo preso dalla pagina del sito</p>
                    <ul className="nl-fonti">
                      {blocco.fonti.map((fonte, i) => (
                        <li key={i}>
                          <label className={`nl-fonte${fonte.scelta ? ' is-scelta' : ''}`}>
                            <input
                              type="checkbox"
                              checked={fonte.scelta}
                              onChange={() => alternaFonte(blocco.voceId, i)}
                            />
                            <span className="nl-fonte-etichetta">{fonte.etichetta}</span>
                            <span className="nl-fonte-testo">{fonte.testo}</span>
                          </label>
                        </li>
                      ))}
                    </ul>

                    <label className="nl-campo nl-campo-larga">
                      <span>
                        Testo che finisce nell&apos;email
                        {blocco.testoManuale !== null && <em className="nl-nota"> — modificato a mano</em>}
                      </span>
                      <textarea
                        rows={4}
                        value={testoBlocco(blocco)}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { testoManuale: e.target.value })}
                      />
                    </label>
                    {blocco.testoManuale !== null && (
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => aggiornaBlocco(blocco.voceId, { testoManuale: null })}
                      >
                        Ripristina il testo del sito
                      </button>
                    )}
                  </div>

                  {blocco.layout === 'evidenza' && (
                    <div className="nl-blocco-griglia">
                      <label className="nl-campo nl-campo-larga">
                        <span>Elenco numerato (una riga per punto, vuoto = nessun elenco)</span>
                        <textarea
                          rows={3}
                          value={blocco.punti}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { punti: e.target.value })}
                        />
                      </label>
                      <label className="nl-campo nl-campo-larga">
                        <span>Riga in evidenza sotto l&apos;elenco</span>
                        <input
                          type="text"
                          value={blocco.nota}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { nota: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {blocco.layout !== 'evidenza' && (
                    <div className="nl-blocco-griglia">
                      <label className="nl-campo">
                        <span>Foto</span>
                        {selettoreFoto(
                          blocco.immagine,
                          (v) => aggiornaBlocco(blocco.voceId, { immagine: v }),
                          voce
                        )}
                      </label>

                      <label className="nl-campo">
                        <span>Descrizione della foto (alt)</span>
                        <input
                          type="text"
                          value={blocco.immagineAlt}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { immagineAlt: e.target.value })}
                        />
                      </label>

                      {blocco.immagine && (
                        <div className="nl-foto-anteprima">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={blocco.immagine} alt="" />
                        </div>
                      )}

                      {fotoNonSicura && (
                        <p className="nl-warn nl-warn-blocco">
                          Questa foto è in un formato che molti programmi di posta non mostrano: scegline un&apos;altra
                          dall&apos;elenco, oppure togli la foto.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="nl-blocco-griglia">
                    <label className="nl-campo">
                      <span>Pulsante / primo link</span>
                      <input
                        type="text"
                        value={blocco.ctaLabel}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { ctaLabel: e.target.value })}
                      />
                    </label>
                    <label className="nl-campo nl-campo-larga">
                      <span>Link</span>
                      <input
                        type="url"
                        value={blocco.ctaHref}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { ctaHref: e.target.value })}
                      />
                    </label>
                    {blocco.layout !== 'evidenza' && (
                      <>
                        <label className="nl-campo">
                          <span>Secondo link (vuoto = nessuno)</span>
                          <input
                            type="text"
                            value={blocco.cta2Label}
                            onChange={(e) => aggiornaBlocco(blocco.voceId, { cta2Label: e.target.value })}
                          />
                        </label>
                        <label className="nl-campo nl-campo-larga">
                          <span>Link del secondo</span>
                          <input
                            type="url"
                            value={blocco.cta2Href}
                            onChange={(e) => aggiornaBlocco(blocco.voceId, { cta2Href: e.target.value })}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* ── Passo 3: testata, sezioni, footer ─────────────────────────── */}
      <section className="nl-passo">
        <header className="nl-passo-testa">
          <h2>
            <span className="nl-passo-numero">3</span> Oggetto e apertura
          </h2>
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => setMostraImpostazioni((m) => !m)}
          >
            {mostraImpostazioni ? 'Nascondi il resto' : 'Testata, sezioni e footer'}
          </button>
        </header>

        <div className="nl-blocco-griglia">
          {campoImpostazione("Oggetto dell'email", 'oggetto', { larga: true })}
          {campoImpostazione('Anteprima in casella (la riga sotto l’oggetto)', 'preheader', { larga: true })}
          {campoImpostazione('Sopratitolo', 'introEyebrow')}
          {campoImpostazione('Titolo grande', 'introTitolo')}
          {campoImpostazione('Seconda riga del titolo (in rosso)', 'introTitoloAccento')}
          <label className="nl-campo">
            <span>Foto di apertura</span>
            {selettoreFoto(impostazioni.heroImmagine, (v) => setImpostazioni({ ...impostazioni, heroImmagine: v }))}
          </label>
          {impostazioni.heroImmagine && (
            <div className="nl-foto-anteprima">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={impostazioni.heroImmagine} alt="" />
            </div>
          )}
          {campoImpostazione('Testo di apertura', 'intro', { larga: true, righe: 3 })}
        </div>

        {mostraImpostazioni && (
          <>
            <p className="nl-etichetta nl-sub">Testata nera</p>
            <div className="nl-blocco-griglia">
              {campoImpostazione('Riga sotto il logo', 'tagline', { larga: true })}
              {campoImpostazione('Link della testata', 'ctaTestataLabel')}
              {campoImpostazione('Indirizzo del link', 'ctaTestataHref', { tipo: 'url' })}
            </div>

            <p className="nl-etichetta nl-sub">Indice numerato</p>
            <div className="nl-blocco-griglia">
              {impostazioni.indice.map((voce, i) => (
                <div className="nl-indice-voce" key={i}>
                  <label className="nl-campo">
                    <span>Voce {String(i + 1).padStart(2, '0')}</span>
                    <input
                      type="text"
                      value={voce.titolo}
                      onChange={(e) => {
                        const indice = [...impostazioni.indice]
                        indice[i] = { ...indice[i], titolo: e.target.value }
                        setImpostazioni({ ...impostazioni, indice })
                      }}
                    />
                  </label>
                  <label className="nl-campo">
                    <span>Descrizione</span>
                    <input
                      type="text"
                      value={voce.testo}
                      onChange={(e) => {
                        const indice = [...impostazioni.indice]
                        indice[i] = { ...indice[i], testo: e.target.value }
                        setImpostazioni({ ...impostazioni, indice })
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() =>
                      setImpostazioni({
                        ...impostazioni,
                        indice: impostazioni.indice.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Togli
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() =>
                  setImpostazioni({ ...impostazioni, indice: [...impostazioni.indice, { titolo: '', testo: '' }] })
                }
              >
                + Aggiungi voce
              </button>
              {campoImpostazione('Pulsante sotto l’indice', 'ctaIndiceLabel')}
              {campoImpostazione('Link del pulsante', 'ctaIndiceHref', { tipo: 'url' })}
            </div>

            <p className="nl-etichetta nl-sub">Intestazioni delle sezioni</p>
            {ORDINE_SEZIONI.map((layout) => (
              <div className="nl-blocco-griglia" key={layout}>
                <label className="nl-campo">
                  <span>{ETICHETTE_LAYOUT[layout].split(' (')[0]} — sopratitolo</span>
                  <input
                    type="text"
                    value={impostazioni.sezioni[layout].eyebrow}
                    onChange={(e) => aggiornaSezione(layout, { eyebrow: e.target.value })}
                  />
                </label>
                <label className="nl-campo">
                  <span>Titolo della sezione</span>
                  <input
                    type="text"
                    value={impostazioni.sezioni[layout].titolo}
                    onChange={(e) => aggiornaSezione(layout, { titolo: e.target.value })}
                  />
                </label>
                <label className="nl-campo">
                  <span>Link di coda</span>
                  <input
                    type="text"
                    value={impostazioni.sezioni[layout].linkLabel}
                    onChange={(e) => aggiornaSezione(layout, { linkLabel: e.target.value })}
                  />
                </label>
                <label className="nl-campo">
                  <span>Indirizzo del link</span>
                  <input
                    type="url"
                    value={impostazioni.sezioni[layout].linkHref}
                    onChange={(e) => aggiornaSezione(layout, { linkHref: e.target.value })}
                  />
                </label>
              </div>
            ))}

            <p className="nl-etichetta nl-sub">Chiusura e footer</p>
            <div className="nl-blocco-griglia">
              {campoImpostazione('Fascia di chiusura', 'chiusuraTesto', { larga: true })}
              {campoImpostazione('Link della fascia', 'chiusuraLinkLabel')}
              {campoImpostazione('Indirizzo del link', 'chiusuraLinkHref', { tipo: 'url' })}
              {campoImpostazione('Nota del footer', 'footerNota', { larga: true })}
              {campoImpostazione('Ragione sociale', 'footerRagioneSociale')}
              {campoImpostazione('Indirizzo', 'footerIndirizzo')}
              {campoImpostazione('Telefono', 'footerTelefono')}
              {campoImpostazione('Email', 'footerEmail')}
              {campoImpostazione('Instagram', 'instagramUrl', { tipo: 'url' })}
              {campoImpostazione('Facebook', 'facebookUrl', { tipo: 'url' })}
              {campoImpostazione('Perché ricevi questa email', 'footerMotivo', { larga: true, righe: 2 })}
            </div>
            <p className="nl-nota">
              Il link per disiscriversi lo aggiunge la piattaforma di invio: non va scritto qui.
            </p>
          </>
        )}
      </section>

      {/* ── Anteprima e consegna ──────────────────────────────────────── */}
      <section className="nl-passo">
        <header className="nl-passo-testa">
          <h2>Anteprima</h2>
          <div className="nl-passo-azioni">
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={() => setAnteprimaMobile((m) => !m)}
            >
              {anteprimaMobile ? 'Vedi da computer' : 'Vedi da telefono'}
            </button>
            <button type="button" className="btn btn-small" onClick={copiaHtml} disabled={blocchi.length === 0}>
              Copia HTML
            </button>
            <button type="button" className="btn btn-small" onClick={scaricaHtml} disabled={blocchi.length === 0}>
              Scarica .html
            </button>
            <button type="button" className="btn btn-small btn-danger" onClick={svuota}>
              Svuota
            </button>
          </div>
        </header>

        <div className={`nl-anteprima${anteprimaMobile ? ' is-mobile' : ''}`}>
          <iframe title="Anteprima newsletter" srcDoc={html} />
        </div>
      </section>
    </div>
  )
}
