import { createSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { AnalyticsReport } from '@/components/AnalyticsReport'

export const dynamic = 'force-dynamic'

// Fuori da /dashboard: il middleware protegge solo /dashboard/:path*, quindi
// questa pagina resta accessibile senza login a chiunque abbia il token
// (vedi app/dashboard/analytics/actions.ts per come viene generato/
// revocato). Niente indicizzazione: non e' un link da far trovare su Google.
export const metadata = {
  title: 'Analytics — Shared report',
  robots: { index: false, follow: false },
}

export default async function ReportAnalyticsPubblico({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { range?: string; da?: string; a?: string; fonte?: string; confronto?: string; cda?: string; ca?: string }
}) {
  const supabase = createSupabaseServiceClient()
  const { data: link } = await supabase
    .from('report_share_links')
    .select('id')
    .eq('sezione', 'analytics')
    .eq('token', params.token)
    .is('revoked_at', null)
    .maybeSingle()

  if (!link) {
    return (
      <div className="report-pubblico-shell">
        <p className="error-banner">This link is no longer valid. Ask for a new one.</p>
      </div>
    )
  }

  return (
    <div className="report-pubblico-shell">
      <div className="analytics-page">
        <div className="page-header">
          <h1>Analytics</h1>
          <span className="richiesta-badge richiesta-neutro">Shared report · read-only</span>
        </div>

        <AnalyticsReport searchParams={searchParams} modalitaPubblica />
      </div>
    </div>
  )
}
