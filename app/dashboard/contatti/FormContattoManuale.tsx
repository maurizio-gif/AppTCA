'use client'

import { useState, useTransition } from 'react'
import { creaContattoManuale } from './actions'

// Stesse attivita' e stessa regola di classificazione del form del sito
// (vedi ATTIVITA_LABELS e gruppoDa in src/lib/leadForm.client.js su
// WebSite-TCA): basta un'attivita' adulti perche' il gruppo sia adulti,
// junior solo se le attivita' scelte sono tutte junior. Nessuna attivita'
// scelta -> adulti, come sul sito.
const ATTIVITA_OPZIONI = [
  { id: 'tennis', label: 'Tennis Adulti' },
  { id: 'padel', label: 'Padel' },
  { id: 'prep', label: 'Preparazione Atletica' },
  { id: 'scuola', label: 'Scuola Tennis (bambini)' },
  { id: 'agonistica', label: 'Agonistica Tennis' },
  { id: 'camps', label: 'Summer Camps' },
  { id: 'membership', label: 'Membership / Abbonamento' },
] as const

const JUNIOR_IDS = ['scuola', 'agonistica', 'camps']
const ADULTI_IDS = ['tennis', 'padel', 'prep', 'membership']

function gruppoDa(ids: string[]): 'adulti' | 'junior' {
  const haAdulti = ids.some((id) => ADULTI_IDS.includes(id))
  const haJunior = ids.some((id) => JUNIOR_IDS.includes(id))
  return haJunior && !haAdulti ? 'junior' : 'adulti'
}

const TIPI_RICHIESTA = [
  { valore: 'messaggio', etichetta: 'Messaggio / richiesta generica' },
  { valore: 'richiamami', etichetta: 'Richiamata telefonica' },
  { valore: 'appuntamento in sede', etichetta: 'Visita in sede' },
] as const

type TipoRichiesta = (typeof TIPI_RICHIESTA)[number]['valore']

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

// Form per il lead arrivato per telefono: stessi campi del form "Contattaci"
// del sito, compilati dalla segreteria mentre parla con la persona invece
// che da lei stessa. Vedi creaContattoManuale per cosa succede al salvataggio
// (privacy/marketing nascono già accettati, utm marca la provenienza).
export function FormContattoManuale({ onFatto, onAnnulla }: { onFatto: () => void; onAnnulla: () => void }) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [cellulare, setCellulare] = useState('')
  const [attivitaScelte, setAttivitaScelte] = useState<string[]>([])
  const [tipoRichiesta, setTipoRichiesta] = useState<TipoRichiesta>('messaggio')
  const [data, setData] = useState('')
  const [ora, setOra] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const richiedeData = tipoRichiesta !== 'messaggio'

  function toggleAttivita(id: string) {
    setAttivitaScelte((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function salva() {
    setErrore(null)
    if (!nome.trim()) {
      setErrore('Il nome è obbligatorio.')
      return
    }
    if (!isValidEmail(email)) {
      setErrore('Inserisci un’email valida: senza email non si collega a nessuna persona in anagrafica.')
      return
    }
    if (richiedeData && !data) {
      setErrore('Scegli il giorno della richiamata o della visita.')
      return
    }

    const etichette = ATTIVITA_OPZIONI.filter((a) => attivitaScelte.includes(a.id)).map((a) => a.label)

    startTransition(async () => {
      const risultato = await creaContattoManuale({
        nome: nome.trim(),
        cognome: cognome.trim() || null,
        email: email.trim(),
        cellulare: cellulare.trim() || null,
        gruppoAttivita: gruppoDa(attivitaScelte),
        attivita: etichette,
        tipoRichiesta,
        dataRichiesta: richiedeData ? data : null,
        oraRichiesta: richiedeData ? ora.trim() || null : null,
        motivo: motivo.trim() || null,
      })
      if (risultato.ok) {
        onFatto()
      } else {
        setErrore(risultato.errore)
      }
    })
  }

  return (
    <div className="login-card agenda-form">
      {errore && <p className="error-banner">{errore}</p>}

      <p className="gestione-meta">
        Consenso privacy e marketing registrati come accettati: chi chiama ha già parlato con voi, non con un modulo.
      </p>

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor="cm-nome">Nome</label>
          <input id="cm-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="cm-cognome">Cognome</label>
          <input id="cm-cognome" type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cm-email">Email</label>
          <input id="cm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="cm-cellulare">Cellulare</label>
          <input id="cm-cellulare" type="tel" value={cellulare} onChange={(e) => setCellulare(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Attività di interesse</label>
        <div className="agenda-form-checks">
          {ATTIVITA_OPZIONI.map((a) => (
            <label key={a.id} className="filtro-checkbox">
              <input type="checkbox" checked={attivitaScelte.includes(a.id)} onChange={() => toggleAttivita(a.id)} />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor="cm-tipo">Tipo di richiesta</label>
          <select
            id="cm-tipo"
            className="filter-select"
            value={tipoRichiesta}
            onChange={(e) => setTipoRichiesta(e.target.value as TipoRichiesta)}
          >
            {TIPI_RICHIESTA.map((t) => (
              <option key={t.valore} value={t.valore}>
                {t.etichetta}
              </option>
            ))}
          </select>
        </div>

        {richiedeData && (
          <>
            <div className="field">
              <label htmlFor="cm-data">Giorno</label>
              <input id="cm-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="cm-ora">Ora (vuoto = tutto il giorno)</label>
              <input id="cm-ora" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="field">
        <label htmlFor="cm-motivo">Nota / motivo della richiesta</label>
        <textarea
          id="cm-motivo"
          className="gestione-note"
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Cosa ha chiesto al telefono…"
        />
      </div>

      <div className="pipeline-azioni">
        <button type="button" className="btn" disabled={isPending} onClick={salva}>
          {isPending ? 'Salvataggio…' : 'Salva contatto'}
        </button>
        <button type="button" className="btn-ghost btn-small" disabled={isPending} onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </div>
  )
}
