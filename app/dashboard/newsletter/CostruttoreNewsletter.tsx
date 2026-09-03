'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  costruisciNewsletter,
  formatDataItaliana,
  ETICHETTE_LAYOUT,
  LAYOUT_BLOCCO,
  type BloccoNewsletter,
  type ConfigNewsletter,
  type LayoutBlocco,
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
// spostare una voce fra i tre passi non deve passare dal server, e l'anteprima
// deve aggiornarsi mentre si scrive. Il server serve solo per rileggere il
// feed del sito e per il registro operatori (vedi actions.ts).
//
// Il testo di un blocco NON e' un campo libero riempito a mano: nasce dai
// capoversi della pagina del sito, spuntati uno per uno. Chi compone decide
// quanto prendere; se poi modifica il testo, la composizione automatica si
// ferma (testoManuale) per non cancellargli sotto le mani quello che ha
// scritto, ed esiste un pulsante per tornare al testo del sito.

const CHIAVE_BOZZA = 'tca-newsletter-bozza-v1'

const FIRMA_DEFAULT =
  'Tennis Club Ambrosiano SSD a r.l. — Via Feltre 33, 20134 Milano — P.IVA IT06869300159'
const DISISCRIZIONE_DEFAULT =
  'Ricevi questa email perché sei iscritto alle comunicazioni del Tennis Club Ambrosiano.'

type Fonte = { testo: string; etichetta: string; scelta: boolean }

type Blocco = {
  voceId: string
  tipo: TipoVoce
  layout: LayoutBlocco
  etichetta: string
  titolo: string
  data: string | null
  mostraData: boolean
  fonti: Fonte[]
  testoManuale: string | null
  immagine: string
  immagineAlt: string
  ctaLabel: string
  ctaHref: string
}

type Testata = {
  oggetto: string
  preheader: string
  titolo: string
  sottotitolo: string
  intro: string
  ctaFinaleLabel: string
  ctaFinaleHref: string
  chiusura: string
  firma: string
  mostraDisiscrizione: boolean
  testoDisiscrizione: string
}

type Bozza = { testata: Testata; blocchi: Blocco[] }

function testataIniziale(urlSito: string): Testata {
  const oggi = new Date()
  const mese = formatDataItaliana(oggi.toISOString()).split(' ').slice(1).join(' ')
  return {
    oggetto: `Tennis Club Ambrosiano — le novità di ${mese}`,
    preheader: 'Le novità del Club: news, eventi e promozioni in corso.',
    titolo: 'Le novità del Club',
    sottotitolo: `Newsletter · ${mese}`,
    intro: '',
    ctaFinaleLabel: 'Vai al sito',
    ctaFinaleHref: urlSito,
    chiusura: '',
    firma: FIRMA_DEFAULT,
    mostraDisiscrizione: true,
    testoDisiscrizione: DISISCRIZIONE_DEFAULT,
  }
}

// I capoversi disponibili per una voce: la sintesi (quella che si legge in
// elenco sul sito) piu' i capoversi del corpo della pagina. La sintesi e'
// spuntata di default: e' il minimo sindacale di un blocco, e su molte voci
// e' anche l'unico testo esistente.
function fontiDaVoce(voce: VoceSito): Fonte[] {
  const fonti: Fonte[] = []
  if (voce.sintesi) fonti.push({ testo: voce.sintesi, etichetta: 'Sintesi', scelta: true })
  voce.paragrafi.forEach((p, i) => {
    fonti.push({ testo: p, etichetta: `Capoverso ${i + 1}`, scelta: false })
  })
  if (!fonti.length) fonti.push({ testo: voce.titolo, etichetta: 'Titolo', scelta: true })
  return fonti
}

function bloccoDaVoce(voce: VoceSito): Blocco {
  return {
    voceId: voce.id,
    tipo: voce.tipo,
    // Con una foto propria vale la pena mostrarla grande; le voci senza foto
    // (eventi, servizi, promo) partono a solo testo: una foto si aggiunge poi
    // dalla galleria, se serve.
    layout: voce.immagine ? 'grande' : 'solo-testo',
    etichetta: voce.categoria ?? ETICHETTE_TIPO[voce.tipo],
    titolo: voce.titolo,
    data: voce.data,
    mostraData: !!voce.data && (voce.tipo === 'news' || voce.tipo === 'evento'),
    fonti: fontiDaVoce(voce),
    testoManuale: null,
    immagine: voce.immagine ?? '',
    immagineAlt: voce.immagineAlt ?? voce.titolo,
    ctaLabel: voce.ctaLabel ?? 'Leggi sul sito',
    ctaHref: voce.ctaHref ?? voce.url,
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
  const [testata, setTestata] = useState<Testata>(() => testataIniziale(contenutiIniziali.sito))
  const [blocchi, setBlocchi] = useState<Blocco[]>([])
  const [bozzaLetta, setBozzaLetta] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [anteprimaMobile, setAnteprimaMobile] = useState(false)

  // Filtri del passo 1
  const [tipiAttivi, setTipiAttivi] = useState<TipoVoce[]>([...TIPI_VOCE])
  const [ricerca, setRicerca] = useState('')
  const [da, setDa] = useState('')
  const [a, setA] = useState('')
  const [soloConFoto, setSoloConFoto] = useState(false)

  const vociPerId = useMemo(() => new Map(contenuti.voci.map((v) => [v.id, v])), [contenuti.voci])

  // Ripresa del lavoro in corso: una newsletter si compone in piu' riprese e
  // un ricaricamento della pagina non deve azzerarla. Le voci nel frattempo
  // depubblicate sul sito vengono lasciate cadere, con un avviso: meglio un
  // blocco in meno che un blocco che rimanda a una pagina che non c'e' piu'.
  useEffect(() => {
    try {
      const salvato = localStorage.getItem(CHIAVE_BOZZA)
      if (salvato) {
        const bozza = JSON.parse(salvato) as Bozza
        if (bozza?.testata && Array.isArray(bozza.blocchi)) {
          const validi = bozza.blocchi.filter((b) => vociPerId.has(b.voceId))
          setTestata({ ...testataIniziale(contenutiIniziali.sito), ...bozza.testata })
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
      // vuoto, che e' esattamente lo stato di una newsletter nuova.
    }
    setBozzaLetta(true)
    // Solo al montaggio: la bozza si legge una volta sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!bozzaLetta) return
    try {
      localStorage.setItem(CHIAVE_BOZZA, JSON.stringify({ testata, blocchi } satisfies Bozza))
    } catch {
      // Storage non disponibile: si continua senza salvataggio.
    }
  }, [testata, blocchi, bozzaLetta])

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

  function spostaBlocco(indice: number, direzione: -1 | 1) {
    setBlocchi((precedenti) => {
      const destinazione = indice + direzione
      if (destinazione < 0 || destinazione >= precedenti.length) return precedenti
      const copia = [...precedenti]
      ;[copia[indice], copia[destinazione]] = [copia[destinazione], copia[indice]]
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

  const config: ConfigNewsletter = useMemo(
    () => ({
      oggetto: testata.oggetto,
      preheader: testata.preheader,
      titolo: testata.titolo,
      sottotitolo: testata.sottotitolo,
      intro: testata.intro,
      blocchi: blocchi.map(
        (b): BloccoNewsletter => ({
          id: b.voceId,
          layout: b.layout,
          etichetta: b.etichetta,
          titolo: b.titolo,
          data: b.data,
          mostraData: b.mostraData,
          testo: testoBlocco(b),
          immagine: b.immagine || null,
          immagineAlt: b.immagineAlt,
          ctaLabel: b.ctaLabel,
          ctaHref: b.ctaHref,
        })
      ),
      ctaFinaleLabel: testata.ctaFinaleLabel,
      ctaFinaleHref: testata.ctaFinaleHref,
      chiusura: testata.chiusura,
      logoUrl: `${contenuti.sito}/tca-logo-esteso.png`,
      urlSito: contenuti.sito,
      firma: testata.firma,
      mostraDisiscrizione: testata.mostraDisiscrizione,
      testoDisiscrizione: testata.testoDisiscrizione,
    }),
    [testata, blocchi, contenuti.sito]
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
    void registraNewsletterGenerata(testata.oggetto, blocchi.length)
  }

  function scaricaHtml() {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `newsletter-${new Date().toISOString().slice(0, 10)}.html`
    link.click()
    URL.revokeObjectURL(url)
    void registraNewsletterGenerata(testata.oggetto, blocchi.length)
  }

  function svuota() {
    if (!confirm('Svuoti la newsletter in corso? I blocchi scelti e i testi modificati vanno persi.')) return
    setBlocchi([])
    setTestata(testataIniziale(contenuti.sito))
    setAvviso(null)
    setErrore(null)
  }

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
                      {voce.immagine && !voce.immagineEmailSafe && (
                        <span className="nl-warn" title="Formato non visibile in molti programmi di posta">
                          foto in formato non adatto alle email
                        </span>
                      )}
                    </div>
                    <p className="nl-voce-titolo">{voce.titolo}</p>
                    {voce.sintesi && <p className="nl-voce-sintesi">{voce.sintesi}</p>}
                    {voce.note && <p className="nl-voce-note">{voce.note}</p>}
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
        </header>

        {blocchi.length === 0 ? (
          <p className="muted">
            Nessun blocco: spunta almeno un contenuto nel passo 1 e comparirà qui, pronto da rifinire.
          </p>
        ) : (
          <ol className="nl-blocchi">
            {blocchi.map((blocco, indice) => {
              const voce = vociPerId.get(blocco.voceId)
              const fotoNonSicura = !!voce && blocco.immagine === voce.immagine && !voce.immagineEmailSafe
              return (
                <li key={blocco.voceId} className="nl-blocco">
                  <div className="nl-blocco-testa">
                    <span className={`nl-badge nl-badge-${blocco.tipo}`}>{ETICHETTE_TIPO[blocco.tipo]}</span>
                    <strong className="nl-blocco-nome">{blocco.titolo}</strong>
                    <div className="nl-blocco-ordine">
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => spostaBlocco(indice, -1)}
                        disabled={indice === 0}
                        aria-label="Sposta su"
                        title="Sposta su"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => spostaBlocco(indice, 1)}
                        disabled={indice === blocchi.length - 1}
                        aria-label="Sposta giù"
                        title="Sposta giù"
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
                    <label className="nl-campo">
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
                      <span>Etichetta sopra il titolo</span>
                      <input
                        type="text"
                        value={blocco.etichetta}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { etichetta: e.target.value })}
                      />
                    </label>

                    <label className="nl-campo nl-campo-larga">
                      <span>Titolo del blocco</span>
                      <input
                        type="text"
                        value={blocco.titolo}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { titolo: e.target.value })}
                      />
                    </label>

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
                        rows={5}
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

                  {blocco.layout !== 'solo-testo' && (
                    <div className="nl-blocco-griglia">
                      <label className="nl-campo">
                        <span>Foto</span>
                        <select
                          value={blocco.immagine}
                          onChange={(e) => aggiornaBlocco(blocco.voceId, { immagine: e.target.value })}
                        >
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
                          dall&apos;elenco, oppure lascia il blocco solo testo.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="nl-blocco-griglia">
                    <label className="nl-campo">
                      <span>Testo del pulsante (vuoto = nessun pulsante)</span>
                      <input
                        type="text"
                        value={blocco.ctaLabel}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { ctaLabel: e.target.value })}
                      />
                    </label>
                    <label className="nl-campo nl-campo-larga">
                      <span>Link del pulsante</span>
                      <input
                        type="url"
                        value={blocco.ctaHref}
                        onChange={(e) => aggiornaBlocco(blocco.voceId, { ctaHref: e.target.value })}
                      />
                    </label>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* ── Passo 3: testata e chiusura ───────────────────────────────── */}
      <section className="nl-passo">
        <header className="nl-passo-testa">
          <h2>
            <span className="nl-passo-numero">3</span> Testata e chiusura
          </h2>
        </header>

        <div className="nl-blocco-griglia">
          <label className="nl-campo nl-campo-larga">
            <span>Oggetto dell&apos;email</span>
            <input
              type="text"
              value={testata.oggetto}
              onChange={(e) => setTestata({ ...testata, oggetto: e.target.value })}
            />
          </label>
          <label className="nl-campo nl-campo-larga">
            <span>Anteprima in casella (la riga grigia sotto l&apos;oggetto)</span>
            <input
              type="text"
              value={testata.preheader}
              onChange={(e) => setTestata({ ...testata, preheader: e.target.value })}
            />
          </label>
          <label className="nl-campo">
            <span>Sopratitolo</span>
            <input
              type="text"
              value={testata.sottotitolo}
              onChange={(e) => setTestata({ ...testata, sottotitolo: e.target.value })}
            />
          </label>
          <label className="nl-campo">
            <span>Titolo grande</span>
            <input
              type="text"
              value={testata.titolo}
              onChange={(e) => setTestata({ ...testata, titolo: e.target.value })}
            />
          </label>
          <label className="nl-campo nl-campo-larga">
            <span>Testo di apertura</span>
            <textarea
              rows={3}
              value={testata.intro}
              onChange={(e) => setTestata({ ...testata, intro: e.target.value })}
            />
          </label>
          <label className="nl-campo nl-campo-larga">
            <span>Testo di chiusura</span>
            <textarea
              rows={2}
              value={testata.chiusura}
              onChange={(e) => setTestata({ ...testata, chiusura: e.target.value })}
            />
          </label>
          <label className="nl-campo">
            <span>Pulsante finale</span>
            <input
              type="text"
              value={testata.ctaFinaleLabel}
              onChange={(e) => setTestata({ ...testata, ctaFinaleLabel: e.target.value })}
            />
          </label>
          <label className="nl-campo">
            <span>Link del pulsante finale</span>
            <input
              type="url"
              value={testata.ctaFinaleHref}
              onChange={(e) => setTestata({ ...testata, ctaFinaleHref: e.target.value })}
            />
          </label>
          <label className="nl-campo nl-campo-larga">
            <span>Riga legale in fondo</span>
            <input
              type="text"
              value={testata.firma}
              onChange={(e) => setTestata({ ...testata, firma: e.target.value })}
            />
          </label>
          <label className="filtro-checkbox">
            <input
              type="checkbox"
              checked={testata.mostraDisiscrizione}
              onChange={(e) => setTestata({ ...testata, mostraDisiscrizione: e.target.checked })}
            />
            Riga «perché ricevi questa email»
          </label>
          {testata.mostraDisiscrizione && (
            <label className="nl-campo nl-campo-larga">
              <span>Testo della riga</span>
              <input
                type="text"
                value={testata.testoDisiscrizione}
                onChange={(e) => setTestata({ ...testata, testoDisiscrizione: e.target.value })}
              />
            </label>
          )}
        </div>
        <p className="nl-nota">
          Il link per disiscriversi lo aggiunge la piattaforma di invio: non va scritto qui.
        </p>
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
