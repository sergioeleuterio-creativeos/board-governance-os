'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { MetricCard, PageHeader, Panel, SectionTitle, StatusPill } from './ui'
import { formatClosure, formatStatus } from '@/lib/shadow-board/display-labels'

type LatestGovernanceRun = {
  id: string
  title: string
  period: string | null
  risk_score: number | null
  confidence_score: number | null
  executive_summary: string | null
  status: string
  created_at: string
}

type LatestBusinessPlan = {
  id: string
  diagnosis: string | null
  completeness_score: number | null
  quality_score: number | null
  workstreams: unknown
  priorities: unknown
  status: string
  updated_at: string
}

type LatestBoardPack = {
  id: string
  version: number
  status: string
  executive_summary: string | null
  strategic_questions: unknown
  priority_ranking: unknown
  created_at: string
}

type GovernanceRunReadout = {
  company: { id: string; name: string } | null
  latest_run: LatestGovernanceRun | null
  latest_business_plan: LatestBusinessPlan | null
  latest_board_pack: LatestBoardPack | null
  latest_session: {
    id: string
    status: string
    closure_recommendation: string | null
    closure_summary: string | null
    created_at: string
  } | null
}

type ErrorResponse = {
  error?: string
}

type RunResponse = {
  provider: string
  model: string
  ai?: {
    used_fallback?: boolean
    fallback_reason?: string | null
    attempted_provider?: string
    attempted_model?: string
  }
  governance_cycle_id: string
  persistence: {
    businessPlanId: string
    boardPackId: string
    boardSessionId: string
    decisionId: string
    agentReviewsCreated: number
    followUpsCreated: number
    closureRecommendation: string
  }
  output: {
    run: {
      title: string
      summary: string
      risk_score: number
      confidence_score: number
    }
  }
}

type MetricTone = 'positive' | 'critical' | 'caution' | 'neutral'

type GovernanceMetric = {
  label: string
  value: string
  detail: string
  tone: MetricTone
}

function isReadout(payload: GovernanceRunReadout | ErrorResponse | null): payload is GovernanceRunReadout {
  return !!payload && 'latest_run' in payload
}

function isRunResponse(payload: RunResponse | ErrorResponse | null): payload is RunResponse {
  return !!payload && 'persistence' in payload && 'output' in payload
}

function asArray(value: unknown): Array<Record<string, unknown> | string> {
  return Array.isArray(value) ? value : []
}

function textFromItem(item: Record<string, unknown> | string) {
  if (typeof item === 'string') return item
  return [item.priority, item.workstream, item.title, item.rationale, item.proof_point].filter(Boolean).join(' - ')
}

export function GovernanceRunLiveScreen() {
  const { workspace, loading: workspaceLoading } = useWorkspace()
  const [readout, setReadout] = useState<GovernanceRunReadout | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastRun, setLastRun] = useState<RunResponse | null>(null)

  const metrics = useMemo<GovernanceMetric[]>(() => ([
    {
      label: 'Score de risco',
      value: String(lastRun?.output.run.risk_score ?? readout?.latest_run?.risk_score ?? readout?.latest_business_plan?.quality_score ?? 0),
      detail: '/ 100',
      tone: (lastRun?.output.run.risk_score ?? readout?.latest_run?.risk_score ?? 0) >= 70 ? 'critical' : 'caution',
    },
    {
      label: 'Confianca',
      value: String(lastRun?.output.run.confidence_score ?? readout?.latest_run?.confidence_score ?? readout?.latest_business_plan?.completeness_score ?? 0),
      detail: '/ 100',
      tone: (lastRun?.output.run.confidence_score ?? readout?.latest_run?.confidence_score ?? 0) >= 70 ? 'positive' : 'neutral',
    },
    {
      label: 'Board pack',
      value: readout?.latest_board_pack ? `v${readout.latest_board_pack.version}` : '-',
      detail: readout?.latest_board_pack?.status ?? 'nao gerado',
      tone: 'neutral',
    },
  ]), [lastRun, readout])

  async function loadReadout() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/governance/run', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as GovernanceRunReadout | ErrorResponse | null

    if (!response.ok || !isReadout(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar a governance run.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  async function runGovernance() {
    if (!workspace?.company?.id) {
      setError('Crie uma empresa no intake antes de rodar a governance run.')
      return
    }

    setRunning(true)
    setError('')
    setNotice('Board Brain esta preparando o pacote. Isso pode levar ate um minuto.')
    setLastRun(null)

    const response = await fetch('/api/governance/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: workspace.company.id }),
    })
    const payload = await response.json().catch(() => null) as RunResponse | ErrorResponse | null

    if (!response.ok || !isRunResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel rodar a governance run.')
      setNotice('')
      setRunning(false)
      return
    }

    setLastRun(payload)
    const fallbackNotice = payload.ai?.used_fallback
      ? ' Motor de contingencia usado porque a IA externa nao esta disponivel no momento.'
      : ''
    setNotice(`Governance run concluida.${fallbackNotice} Fechamento sugerido: ${formatClosure(payload.persistence.closureRecommendation)}.`)
    setRunning(false)
    await loadReadout()
  }

  useEffect(() => {
    void loadReadout()
  }, [])

  const workstreams = asArray(readout?.latest_business_plan?.workstreams)
  const priorities = asArray(readout?.latest_business_plan?.priorities)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="03 - Governance Run"
        title="Governance run ao vivo"
        description="Gere diagnostico, plano, Board Pack, analises dos advisors, candidatos de decisao e follow-ups a partir da Company Brain."
        action={workspace?.company?.id ? (
          <button className="btn-primary" type="button" onClick={() => void runGovernance()} disabled={running || workspaceLoading}>
            {running ? 'Rodando...' : 'Rodar Board Brain'}
          </button>
        ) : (
          <Link href="/company/intake" className="btn-primary">Iniciar intake</Link>
        )}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <Panel>
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.4fr]">
          <div>
            <SectionTitle label="Diagnostico" />
            <p className="sb-serif-callout">
              {lastRun?.output.run.summary
                ?? readout?.latest_business_plan?.diagnosis
                ?? readout?.latest_run?.executive_summary
                ?? (loading ? 'Carregando diagnostico...' : 'Nenhuma governance run gerada ainda.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {readout?.latest_session?.status && <StatusPill>{formatStatus(readout.latest_session.status)}</StatusPill>}
              {readout?.latest_session?.closure_recommendation && <StatusPill>{formatClosure(readout.latest_session.closure_recommendation)}</StatusPill>}
            </div>
          </div>
          <div>
            <SectionTitle label="Workstreams, prioridades e evidencias" />
            <div className="sb-table">
              <div className="sb-table-head">
                <span>Item</span><span>Fonte</span><span>Status</span><span>Proximo</span>
              </div>
              {[...workstreams, ...priorities].slice(0, 8).map((item, index) => (
                <div className="sb-table-row" key={`${textFromItem(item)}-${index}`}>
                  <span>{textFromItem(item) || `Item ${index + 1}`}</span>
                  <span>Board Brain</span>
                  <span>{readout?.latest_business_plan?.status ?? '-'}</span>
                  <span>Revisar</span>
                </div>
              ))}
              {!loading && !workstreams.length && !priorities.length && (
                <div className="sb-table-row">
                  <span>Nenhum plano gerado ainda.</span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {lastRun && (
        <section className="grid gap-4 md:grid-cols-3">
          <Panel>
            <p className="sb-code">Board pack</p>
            <h2 className="sb-row-title mt-3">{lastRun.persistence.boardPackId.slice(0, 8)}</h2>
          </Panel>
          <Panel>
            <p className="sb-code">Analises dos advisors</p>
            <h2 className="sb-row-title mt-3">{lastRun.persistence.agentReviewsCreated}</h2>
          </Panel>
          <Panel>
            <p className="sb-code">Follow-ups</p>
            <h2 className="sb-row-title mt-3">{lastRun.persistence.followUpsCreated}</h2>
          </Panel>
        </section>
      )}
    </div>
  )
}
