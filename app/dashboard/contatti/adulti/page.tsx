import { ContattiSezione } from '../ContattiSezione'

export const dynamic = 'force-dynamic'

export default function ContattiAdultiPage({
  searchParams,
}: {
  searchParams: { filtro?: string; q?: string }
}) {
  return (
    <ContattiSezione
      gruppo="adulti"
      titolo="Enquiries Adulti"
      permesso="contatti-adulti"
      basePath="/dashboard/contatti/adulti"
      searchParams={searchParams}
    />
  )
}
