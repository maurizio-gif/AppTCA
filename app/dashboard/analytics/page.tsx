import { utenteHaSezione } from '@/lib/auth/sezioni-server'
import { AnalyticsReport } from '@/components/AnalyticsReport'
import { getLinkCondiviso } from './actions'
import { ShareLinkButton } from './ShareLinkButton'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; da?: string; a?: string; fonte?: string; confronto?: string; cda?: string; ca?: string }
}) {
  if (!(await utenteHaSezione('analytics'))) {
    return <p className="error-banner">You don't have access to this section.</p>
  }

  const tokenCondiviso = await getLinkCondiviso()

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Analytics</h1>
        <ShareLinkButton tokenIniziale={tokenCondiviso} />
      </div>

      <AnalyticsReport searchParams={searchParams} />
    </div>
  )
}
