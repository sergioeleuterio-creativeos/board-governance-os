'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { companyContext } from '@/lib/shadow-board/demo-data'
import { AdvisorMark, MetricCard, Panel, RowCard, SectionTitle, StatusPill } from './ui'
import { DashboardHeader } from './DashboardHeader'

type DashboardDecision = {
  id: string
  title: string
  status: string
  closure_recommendation: string | null
  risk_level: string | null
  confidence_score: number | null
  review_date: string | null
  owner_label: string | null
}

type DashboardAdvisor = {
  advisor_key: string
  code: string
  name: string
  scope: string
  color: string
  status: string
  stance?: string | null
  risk_score: number | null
  confidence_score: number | null
  closure_recommendation?: string | null
}

type DashboardReadout = {
  company: { id: string; name: string; stage: string | null } | null
  needs_company: boolean
  latest_session?: {
    id: string
    status: string
    session_type: string
    closure_recommendation: string | null
  } | null
  metrics: {
    risk_index: number | null
    plan_confidence: number | null
    open_decisions: number
    overdue_follow_ups: number
  }
  decisions_awaiting: DashboardDecision[]
  cadence: {
    closed_decisions_90d: number
    memory_updates_90d: number
  }
  advisors: DashboardAdvisor[]
}

type ErrorResponse = {
  error?: string
}

function isDashboardReadout(payload: DashboardReadout | ErrorResponse | null): payload is DashboardReadout {
  return !!payload && 'metrics' in payload && 'decisions_awaiting' in payload
}

function metricValue(value: number | null, fallback = '-') {
  return typeof value === 'number' ? String(value) : fallback
}

function decisionTone(riskLevel: string | null): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (riskLevel === 'critical') return 'critical'
  if (riskLevel === 'high') return 'caution'
  if (riskLevel === 'low') return 'positive'
  return 'neutral'
}

function advisorStatusColor(status: string) {
  if (status === 'complete') return '#3E6B4F'
  if (status === 'failed') return '#A23B2D'
  if (status === 'running') return '#A8772A'
  return '#8A8478'
}

export function DashboardLiveScreen() {
  const [readout, setReadout] = useState<DashboardReadout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const metrics = useMemo(() => ([
    {
      label: 'Risk index',
      value: metricValue(readout?.metrics.risk_index ?? null, '0'),
      detail: readout?.metrics.risk_index === null ? '/ 100 - sem leitura' : '/ 100',
      tone: (readout?.metrics.risk_index ?? 0) >= 70 ? 'critical' : 'caution',
    },
    {
      label: 'Plan confidence',
      value: metricValue(readout?.metrics.plan_confidence ?? null, '0'),
      detail: readout?.metrics.plan_confidence === null ? '/ 100 - pendente' : '/ 100',
      tone: (readout?.metrics.plan_confidence ?? 0) >= 70 ? 'positive' : 'neutral',
    },
    {
      label: 'Open decisions',
      value: String(readout?.metrics.open_decisions ?? 0),
      detail: `${readout?.decisions_awaiting.length ?? 0} awaiting you`,
      tone: 'neutral',
    },
    {
      label: 'Overdue follow-ups',
      value: String(readout?.metrics.overdue_follow_ups ?? 0),
      detail: 'critical if not cleared',
      tone: (readout?.metrics.overdue_follow_ups ?? 0) > 0 ? 'caution' : 'positive',
    },
  ] as const), [readout])

  async function loadReadout() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/dashboard/readout', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as DashboardReadout | ErrorResponse | null

    if (!response.ok || !isDashboardReadout(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar o dashboard.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  useEffect(() => {
    void loadReadout()
  }, [])

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      {readout?.needs_company && (
        <Panel>
          <SectionTitle label="Workspace setup" />
          <p className="sb-serif-callout">Crie ou alimente a primeira empresa para transformar o dashboard em leitura operacional.</p>
          <Link href="/company/intake" className="btn-primary mt-4">Iniciar intake</Link>
        </Panel>
      )}

      <Panel className="sb-principle">
        <p className="sb-eyebrow">Principle</p>
        <p>{companyContext.principle}</p>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        {metrics.map(metric => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel>
          <SectionTitle label="Decisions awaiting you" action={<Link href="/decisions" className="sb-text-link">View all</Link>} />
          <div className="space-y-3">
            {loading && <p className="sb-muted">Carregando decisoes...</p>}
            {!loading && readout?.decisions_awaiting.map(item => (
              <RowCard
                key={item.id}
                code={item.id.slice(0, 8)}
                title={item.title || 'Decisao sem titulo'}
                detail={`${item.status} - ${item.closure_recommendation ?? 'sem closure'} - ${item.owner_label ?? 'sem owner'}`}
                tag={item.risk_level ?? item.status}
                tone={decisionTone(item.risk_level)}
              />
            ))}
            {!loading && !readout?.decisions_awaiting.length && (
              <p className="sb-muted">Nenhuma decisao aguardando aprovacao. Rode uma governance run para gerar candidatos.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Governance cadence" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="sb-code">LAST 90 DAYS</p>
                <p className="sb-big-number">{readout?.cadence.closed_decisions_90d ?? 0}</p>
                <p className="sb-muted">Decisions closed</p>
              </div>
              <div>
                <p className="sb-code">INPUTS LOGGED</p>
                <p className="sb-big-number">{readout?.cadence.memory_updates_90d ?? 0}</p>
                <p className="sb-muted">Memory updates</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Shadow Board status" />
            <div className="grid gap-2">
              {(readout?.advisors ?? []).map(adv => (
                <div key={adv.advisor_key} className="sb-advisor-row">
                  <AdvisorMark code={adv.code} color={adv.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{adv.name}</p>
                    <p className="sb-muted truncate">
                      {adv.stance ?? adv.scope}
                      {adv.confidence_score ? ` - ${adv.confidence_score}% confidence` : ''}
                    </p>
                  </div>
                  <span className="sb-code" style={{ color: advisorStatusColor(adv.status) }}>{adv.status}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Follow-up marketplace" />
            <p className="sb-muted">
              Requests for vetted suppliers and Creative OS referrals will be triggered from follow-ups with full decision context.
            </p>
            <button className="btn-secondary mt-4" type="button">Prepare request</button>
          </Panel>
        </div>
      </section>
    </div>
  )
}
