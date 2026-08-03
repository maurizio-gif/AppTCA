'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Solo per la sezione Adulti: separa i messaggi (da smaltire subito) dagli
// appuntamenti (gestiti quando sono stati fissati, vedi CalendarioAppuntamenti).
// Lo stato "vista" resta nell'URL cosi' e' condivisibile e sopravvive al
// tasto Indietro, stesso pattern di FiltroSelect/RicercaContatti.
export function VistaTabs({
  vista,
  contatoreMessaggi,
  contatoreAppuntamenti,
}: {
  vista: 'messaggi' | 'appuntamenti'
  contatoreMessaggi: number
  contatoreAppuntamenti: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function vai(nuovaVista: 'messaggi' | 'appuntamenti') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('vista', nuovaVista)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="vista-tabs">
      <button
        type="button"
        className={`vista-tab${vista === 'messaggi' ? ' attivo' : ''}`}
        onClick={() => vai('messaggi')}
      >
        Messaggi
        {contatoreMessaggi > 0 && <span className="vista-tab-contatore">{contatoreMessaggi}</span>}
      </button>
      <button
        type="button"
        className={`vista-tab${vista === 'appuntamenti' ? ' attivo' : ''}`}
        onClick={() => vai('appuntamenti')}
      >
        Appuntamenti
        {contatoreAppuntamenti > 0 && <span className="vista-tab-contatore">{contatoreAppuntamenti}</span>}
      </button>
    </div>
  )
}
