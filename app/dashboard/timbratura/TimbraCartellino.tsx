'use client'

import { useEffect, useState, useTransition } from 'react'
import { formatDateOra } from '@/lib/format'
import { registraTimbratura } from './actions'

type RigaStorico = {
  id: number
  quando: string
  tipo: string
  distanza: number
}

// Messaggi leggibili per i codici di errore standard della Geolocation API
// (GeolocationPositionError.code): senza questo l'utente vedrebbe solo un
// numero, non capirebbe cosa fare per risolvere.
function messaggioErroreGeo(errore: GeolocationPositionError): string {
  switch (errore.code) {
    case errore.PERMISSION_DENIED:
      return 'Permesso di localizzazione negato: abilitalo nelle impostazioni del browser/telefono per questo sito e riprova.'
    case errore.POSITION_UNAVAILABLE:
      return 'Posizione non disponibile: verifica che la localizzazione sia attiva sul dispositivo e riprova.'
    case errore.TIMEOUT:
      return 'Richiesta della posizione scaduta: riprova, magari con una connessione migliore.'
    default:
      return 'Non è stato possibile leggere la posizione.'
  }
}

export function TimbraCartellino({ storico }: { storico: RigaStorico[] }) {
  const [storicoLocale, setStoricoLocale] = useState(storico)
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [inCorso, setInCorso] = useState<'entrata' | 'uscita' | null>(null)

  // Dopo un timbro riuscito, registraTimbratura fa revalidatePath sulla
  // stessa route: quando arriva lo storico vero (orario/distanza esatti
  // dal server) sostituisce la riga ottimistica aggiunta subito sotto.
  useEffect(() => {
    setStoricoLocale(storico)
  }, [storico])

  // La riga piu' recente decide tutto: se e' un'entrata senza un'uscita
  // successiva, si e' "in servizio" - l'entrata resta mostrata in evidenza
  // finche' non si timbra l'uscita, che la fa sparire (si torna pronti per
  // una nuova entrata). Stessa logica di controllo usata lato server in
  // registraTimbratura: qui serve solo per decidere cosa mostrare/abilitare.
  const ultima = storicoLocale[0]
  const inServizio = ultima?.tipo === 'entrata'
  const entrataInCorso = inServizio ? ultima : null

  function timbra(tipo: 'entrata' | 'uscita') {
    if (!('geolocation' in navigator)) {
      setMessaggio({ tipo: 'errore', testo: 'Questo browser non supporta la geolocalizzazione.' })
      return
    }

    setMessaggio(null)
    setInCorso(tipo)

    navigator.geolocation.getCurrentPosition(
      (posizione) => {
        const { latitude, longitude } = posizione.coords
        startTransition(async () => {
          const risultato = await registraTimbratura(tipo, latitude, longitude)

          if (risultato.ok) {
            const quandoFormattato = formatDateOra(risultato.quando)
            setMessaggio({
              tipo: 'ok',
              testo:
                tipo === 'entrata'
                  ? `Entrata registrata alle ${quandoFormattato} (${risultato.distanza}m dal circolo).`
                  : `Uscita registrata alle ${quandoFormattato} (${risultato.distanza}m dal circolo).`,
            })
            setStoricoLocale((prev) => [
              { id: -Date.now(), quando: quandoFormattato, tipo, distanza: risultato.distanza },
              ...prev,
            ])
          } else {
            setMessaggio({ tipo: 'errore', testo: risultato.errore })
          }

          setInCorso(null)
        })
      },
      (errore) => {
        setMessaggio({ tipo: 'errore', testo: messaggioErroreGeo(errore) })
        setInCorso(null)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const disabilitaEntrata = isPending || inCorso !== null || inServizio
  const disabilitaUscita = isPending || inCorso !== null || !inServizio

  return (
    <div>
      {entrataInCorso && (
        <p className="timbra-stato">
          In servizio — entrato alle {entrataInCorso.quando}
        </p>
      )}

      {messaggio && <p className={`timbra-esito ${messaggio.tipo}`}>{messaggio.testo}</p>}

      <div className="timbra-azioni">
        <div className="timbra-azione">
          <button
            type="button"
            className={`timbra-btn${!disabilitaEntrata ? ' suggerita' : ''}`}
            disabled={disabilitaEntrata}
            onClick={() => timbra('entrata')}
          >
            {inCorso === 'entrata' ? 'Verifica posizione…' : 'Timbra entrata'}
          </button>
          {inServizio && !isPending && inCorso === null && (
            <p className="timbra-hint">Hai già timbrato l'entrata.</p>
          )}
        </div>

        <div className="timbra-azione">
          <button
            type="button"
            className={`timbra-btn${!disabilitaUscita ? ' suggerita' : ''}`}
            disabled={disabilitaUscita}
            onClick={() => timbra('uscita')}
          >
            {inCorso === 'uscita' ? 'Verifica posizione…' : 'Timbra uscita'}
          </button>
          {!inServizio && !isPending && inCorso === null && (
            <p className="timbra-hint">Devi prima timbrare l'entrata.</p>
          )}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Tipo</th>
              <th>Distanza dal circolo</th>
            </tr>
          </thead>
          <tbody>
            {storicoLocale.map((riga) => (
              <tr key={riga.id}>
                <td data-label="Quando">{riga.quando}</td>
                <td data-label="Tipo">{riga.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</td>
                <td data-label="Distanza dal circolo">{riga.distanza > 0 ? `${riga.distanza}m` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {storicoLocale.length === 0 && <p className="empty-state">Non hai ancora nessuna timbratura registrata.</p>}
      </div>
    </div>
  )
}
