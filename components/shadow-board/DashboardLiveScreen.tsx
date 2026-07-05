'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AdvisorMark, MetricCard, Panel, RowCard, SectionTitle, StatusPill } from './ui'
import { DashboardHeader } from './DashboardHeader'
import { formatClosure, formatStatus, formatStance } from '@/lib/shadow-board/display-labels'

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
  follow_ups?: Array<{
    id: string
    title: string
    action: string | null
    status: string
    priority: string
    due_date: string | null
    owner_label: string | null
  }>
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
      label: 'Risco ativo',
      value: metricValue(readout?.metrics.risk_index ?? null, '0'),
      detail: readout?.metrics.risk_index === null ? '/ 100 - sem leitura' : '/ 100',
      tone: (readout?.metrics.risk_index ?? 0) >= 70 ? 'critical' : 'caution',
    },
    {
      label: 'Confiança do contexto',
      value: metricValue(readout?.metrics.plan_confidence ?? null, '0'),
      detail: readout?.metrics.plan_confidence === null ? '/ 100 - pendente' : '/ 100',
      tone: (readout?.metrics.plan_confidence ?? 0) >= 70 ? 'positive' : 'neutral',
    },
    {
      label: 'Decisões abertas',
      value: String(readout?.metrics.open_decisions ?? 0),
      detail: `${readout?.decisions_awaiting.length ?? 0} aguardando voce`,
      tone: 'neutral',
    },
    {
      label: 'Follow-ups atrasados',
      value: String(readout?.metrics.overdue_follow_ups ?? 0),
      detail: 'criticos se nao forem resolvidos',
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
          <SectionTitle label="Setup do workspace" />
          <p className="sb-serif-callout">Crie ou alimente a primeira empresa para transformar o dashboard em leitura operacional.</p>
          <Link href="/company/intake" className="btn-primary mt-4">Iniciar intake</Link>
        </Panel>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="sb-principle">
          <p className="sb-eyebrow">Próxima ação</p>
          <p>
            {readout?.needs_company
              ? 'Conte o que está acontecendo para montar o primeiro contexto da empresa.'
              : readout?.decisions_awaiting.length
                ? 'Há decisões abertas para revisar, aprovar, adiar ou transformar em tarefas.'
                : 'Comece por uma sessão consultiva para diagnosticar o problema, ou leve uma escolha concreta para uma sessão de board.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/company/intake" className="btn-primary">Contar o que está acontecendo</Link>
            <Link href="/rooms" className="btn-secondary">Escolher sessão</Link>
          </div>
        </Panel>

        <Panel>
          <SectionTitle label="Tipo de ajuda" />
          <div className="grid gap-3">
            <Link href="/rooms" className="sb-help-choice">
              <strong>Preciso entender o problema</strong>
              <span>Diagnóstico, conselho consultivo, plano, workstreams e KPIs.</span>
            </Link>
            <Link href="/rooms" className="sb-help-choice">
              <strong>Preciso decidir</strong>
              <span>Board pack, trade-offs, recomendação, decisão, memória e follow-ups.</span>
            </Link>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        {metrics.map(metric => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel>
          <SectionTitle label="Decisões aguardando você" action={<Link href="/decisions" className="sb-text-link">Ver todas</Link>} />
          <div className="space-y-3">
            {loading && <p className="sb-muted">Carregando decisoes...</p>}
            {!loading && readout?.decisions_awaiting.map(item => (
              <RowCard
                key={item.id}
                code={item.id.slice(0, 8)}
                title={item.title || 'Decisao sem titulo'}
                detail={`${formatStatus(item.status)} - ${formatClosure(item.closure_recommendation)} - ${item.owner_label ?? 'sem responsavel'}`}
                tag={formatStatus(item.risk_level ?? item.status)}
                tone={decisionTone(item.risk_level)}
              />
            ))}
            {!loading && !readout?.decisions_awaiting.length && (
              <p className="sb-muted">Nenhuma decisão aguardando aprovação. Use uma sessão consultiva para formular o problema ou uma sessão de board para revisar uma escolha concreta.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Memória recente" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="sb-code">ULTIMOS 90 DIAS</p>
                <p className="sb-big-number">{readout?.cadence.closed_decisions_90d ?? 0}</p>
                <p className="sb-muted">Decisões encerradas</p>
              </div>
              <div>
                <p className="sb-code">CONTEXTO REGISTRADO</p>
                <p className="sb-big-number">{readout?.cadence.memory_updates_90d ?? 0}</p>
                <p className="sb-muted">Memórias e documentos</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Status do Shadow Board" />
            <div className="grid gap-2">
              {(readout?.advisors ?? []).map(adv => (
                <div key={adv.advisor_key} className="sb-advisor-row">
                  <AdvisorMark code={adv.code} color={adv.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{adv.name}</p>
                    <p className="sb-muted truncate">
                      {adv.stance ? formatStance(adv.stance) : adv.scope}
                      {adv.confidence_score ? ` - ${adv.confidence_score}% confianca` : ''}
                    </p>
                  </div>
                  <span className="sb-code" style={{ color: advisorStatusColor(adv.status) }}>{formatStatus(adv.status)}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle label="Tarefas em aberto" action={<Link href="/follow-ups" className="sb-text-link">Ver todas</Link>} />
            <div className="grid gap-3">
              {(readout?.follow_ups ?? []).slice(0, 3).map(item => (
                <RowCard
                  key={item.id}
                  code={item.priority}
                  title={item.title}
                  detail={`${item.owner_label ?? 'sem responsável'} - ${item.due_date ?? 'sem prazo'}`}
                  tag={formatStatus(item.status)}
                  tone={item.priority === 'critical' || item.priority === 'high' ? 'caution' : 'neutral'}
                />
              ))}
              {!loading && !(readout?.follow_ups ?? []).length && (
                <p className="sb-muted">Nenhuma tarefa aberta. A próxima sessão pode gerar plano, decisões e responsáveis.</p>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}
