'use client'

import { useState } from 'react'
import { PersonaPicker } from '../persone/PersonaPicker'
import type { PersonaTrovata } from '../persone/ricerca-actions'
import type { DatiNuovaPersona } from './actions'

// Con chi e' l'appuntamento: una persona gia' in anagrafica, oppure una nuova
// creata al volo. Non esiste la terza opzione "nessuno" - una voce d'agenda
// senza anagrafica non si salva (vedi risolviPersona in actions.ts), perche'
// altrimenti in calendario restano righe di cui nessuno sa piu' chi fossero.
export type SceltaPersona =
  | { tipo: 'esistente'; persona: PersonaTrovata }
  | { tipo: 'nuova'; dati: DatiNuovaPersona }

const NUOVA_VUOTA: DatiNuovaPersona = { nome: '', cognome: '', email: '', cellulare: '' }

// Nome e cognome perche' e' quello che si legge in agenda; un recapito perche'
// senza la deduplicazione dell'anagrafica non ha appigli e la stessa persona
// tornerebbe dentro due volte (vedi trova_o_crea_persona).
export function sceltaPersonaCompleta(scelta: SceltaPersona | null): boolean {
  if (!scelta) return false
  if (scelta.tipo === 'esistente') return true
  const { nome, cognome, email, cellulare } = scelta.dati
  return !!nome.trim() && !!cognome.trim() && !!(email?.trim() || cellulare?.trim())
}

export function CampoPersona({
  scelta,
  onCambia,
  // Le voci d'agenda modificabili possono essere piu' d'una aperta insieme
  // (vedi TaskEntita): gli id dei campi devono restare unici nella pagina.
  idPrefisso,
}: {
  scelta: SceltaPersona | null
  onCambia: (scelta: SceltaPersona | null) => void
  idPrefisso: string
}) {
  const [creando, setCreando] = useState(false)

  if (scelta?.tipo === 'esistente') {
    return (
      <PersonaPicker
        idCampo={`${idPrefisso}-persona`}
        persona={scelta.persona}
        onScegli={(trovata) => onCambia(trovata ? { tipo: 'esistente', persona: trovata } : null)}
      />
    )
  }

  const nuova = scelta?.tipo === 'nuova' ? scelta.dati : NUOVA_VUOTA
  const aggiorna = (campo: keyof DatiNuovaPersona, valore: string) =>
    onCambia({ tipo: 'nuova', dati: { ...nuova, [campo]: valore } })

  if (!creando) {
    return (
      <>
        <PersonaPicker
          idCampo={`${idPrefisso}-persona`}
          persona={null}
          onScegli={(trovata) => onCambia(trovata ? { tipo: 'esistente', persona: trovata } : null)}
        />
        <button
          type="button"
          className="btn-ghost btn-small"
          onClick={() => {
            setCreando(true)
            onCambia({ tipo: 'nuova', dati: NUOVA_VUOTA })
          }}
        >
          + Non è in anagrafica: creala
        </button>
      </>
    )
  }

  return (
    <div className="gestione-box">
      <p className="gestione-meta">Nuova persona in anagrafica. Se esiste già con questa email, viene riconosciuta.</p>

      <div className="agenda-form-griglia">
        <div className="field">
          <label htmlFor={`${idPrefisso}-nuova-nome`}>Nome</label>
          <input
            id={`${idPrefisso}-nuova-nome`}
            type="text"
            value={nuova.nome}
            onChange={(e) => aggiorna('nome', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefisso}-nuova-cognome`}>Cognome</label>
          <input
            id={`${idPrefisso}-nuova-cognome`}
            type="text"
            value={nuova.cognome}
            onChange={(e) => aggiorna('cognome', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefisso}-nuova-email`}>Email</label>
          <input
            id={`${idPrefisso}-nuova-email`}
            type="email"
            value={nuova.email ?? ''}
            onChange={(e) => aggiorna('email', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefisso}-nuova-cellulare`}>Cellulare</label>
          <input
            id={`${idPrefisso}-nuova-cellulare`}
            type="tel"
            value={nuova.cellulare ?? ''}
            onChange={(e) => aggiorna('cellulare', e.target.value)}
          />
        </div>
      </div>

      <p className="gestione-meta">Email o cellulare: almeno uno dei due serve per non ritrovarsela doppia.</p>

      <button
        type="button"
        className="btn-ghost btn-small"
        onClick={() => {
          setCreando(false)
          onCambia(null)
        }}
      >
        Cerca invece in anagrafica
      </button>
    </div>
  )
}
