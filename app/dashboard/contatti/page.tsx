import { redirect } from 'next/navigation'

// Le enquiries sono divise in due sezioni con permessi distinti
// (contatti-adulti / contatti-junior, vedi lib/auth/sezioni.ts): questa
// pagina unica non esiste piu', l'URL resta valido e porta agli Adulti.
export default function ContattiPage() {
  redirect('/dashboard/contatti/adulti')
}
