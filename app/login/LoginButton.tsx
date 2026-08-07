'use client'

import { useFormStatus } from 'react-dom'

// Disabilita il pulsante mentre la Server Action e' in corso: senza,
// un secondo tap prima del redirect (rete lenta, nessun feedback visivo)
// lancia un'altra submission del form e quindi un altro giro di login,
// duplicando le voci "Accesso riuscito" nel log operatori.
export function LoginButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="btn btn-block" disabled={pending}>
      {pending ? 'Accesso in corso…' : 'Accedi'}
    </button>
  )
}
