import { ContattiSezione } from '../ContattiSezione'

export const dynamic = 'force-dynamic'

export default function ContattiJuniorPage({
  searchParams,
}: {
  searchParams: { filtro?: string; q?: string }
}) {
  return (
    <ContattiSezione
      gruppo="junior"
      titolo="Enquiries Junior"
      permesso="contatti-junior"
      basePath="/dashboard/contatti/junior"
      searchParams={searchParams}
    />
  )
}
