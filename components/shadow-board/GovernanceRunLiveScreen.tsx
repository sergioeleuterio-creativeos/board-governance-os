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
  assumptions: unknown
  risks: unknown
  kpis: unknown
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
  decision_candidates: unknown
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

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function valueFrom(item: Record<string, unknown> | string, keys: string[], fallback = '') {
  if (typeof item === 'string') return item

  for (const key of keys) {
    const value = stringValue(item[key])
    if (value) return value
  }

  return fallback
}

function firstSentence(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  const sentence = trimmed.match(/^[^.!?]+[.!?]/)?.[0]
  return sentence ?? trimmed
}

function limitText(value: string, maxWords = 28) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function diagnosisSummary(readout: GovernanceRunReadout | null, lastRun: RunResponse | null) {
  const raw = lastRun?.output.run.summary
    ?? readout?.latest_business_plan?.diagnosis
    ?? readout?.latest_run?.executive_summary
    ?? ''

  return limitText(firstSentence(raw), 34)
}

function decisionQuestionFrom(readout: GovernanceRunReadout | null) {
  const priorities = asArray(readout?.latest_board_pack?.priority_ranking ?? readout?.latest_business_plan?.priorities)
  const firstPriority = priorities[0]
  const question = firstPriority ? valueFrom(firstPriority, ['decision_question']) : ''
  if (question) return question

  const decisions = asArray(readout?.latest_board_pack?.decision_candidates)
  const firstDecision = decisions[0]
  const title = firstDecision ? valueFrom(firstDecision, ['title']) : ''
  if (title) return `Decidir: ${title}`

  const strategicQuestions = asArray(readout?.latest_board_pack?.strategic_questions)
  const firstQuestion = strategicQuestions[0]
  return firstQuestion ? valueFrom(firstQuestion, []) : 'Definir qual decisao deve sair da proxima reuniao de board.'
}

function priorityCards(readout: GovernanceRunReadout | null) {
  const source = asArray(readout?.latest_board_pack?.priority_ranking ?? readout?.latest_business_plan?.priorities)

  return source.slice(0, 5).map((item, index) => ({
    rank: valueFrom(item, ['rank'], String(index + 1)),
    title: valueFrom(item, ['priority', 'title', 'workstream'], `Prioridade ${index + 1}`),
    reason: valueFrom(item, ['why_now', 'rationale'], 'Selecionada por impacto esperado na decisao do ciclo.'),
    evidence: valueFrom(item, ['evidence', 'proof_point'], 'Evidencia ainda precisa ser explicitada com fonte e indicador.'),
    gap: valueFrom(item, ['evidence_gap'], 'Fechar fonte, indicador, responsavel e data de revisao.'),
    owner: valueFrom(item, ['owner_suggestion', 'owner_label'], 'Fundador/CEO'),
    question: valueFrom(item, ['decision_question'], ''),
  }))
}

function workstreamRows(readout: GovernanceRunReadout | null) {
  return asArray(readout?.latest_business_plan?.workstreams).slice(0, 5).map((item, index) => ({
    title: valueFrom(item, ['workstream', 'priority', 'title'], `Frente ${index + 1}`),
    owner: valueFrom(item, ['owner_suggestion', 'owner_label'], 'Fundador/CEO'),
    cadence: valueFrom(item, ['cadence'], 'Revisao semanal'),
    proof: valueFrom(item, ['proof_point', 'evidence'], 'Prova de avanco a definir'),
  }))
}

function evidenceGaps(readout: GovernanceRunReadout | null) {
  const assumptions = asArray(readout?.latest_business_plan?.assumptions)
  const gapsFromPriorities = priorityCards(readout).map(priority => priority.gap)
  const gapsFromAssumptions = assumptions.map(item => valueFrom(item, ['detail', 'title']))

  return [...gapsFromAssumptions, ...gapsFromPriorities]
    .filter(Boolean)
    .slice(0, 4)
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
  const priorities = priorityCards(readout)
  const conciseDiagnosis = diagnosisSummary(readout, lastRun)
  const decisionQuestion = decisionQuestionFrom(readout)
  const workstreamPlan = workstreamRows(readout)
  const gaps = evidenceGaps(readout)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="03 - Governance Run"
        title="Governance Run"
        description="Transforme a Company Brain em uma tese curta de decisao, prioridades justificadas e pauta para o board."
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
        <SectionTitle label="Comece aqui" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-[#E4DED2] bg-[#FBFAF7] p-4">
            <p className="sb-code">1 - O Brain entendeu</p>
            <p className="mt-3 text-lg font-semibold text-[#1F1B16]">{conciseDiagnosis || (loading ? 'Carregando diagnostico...' : 'Ainda sem diagnostico.')}</p>
          </div>
          <div className="rounded-md border border-[#E4DED2] bg-[#FBFAF7] p-4">
            <p className="sb-code">2 - A abordagem</p>
            <p className="mt-3 text-lg font-semibold text-[#1F1B16]">
              Filtrar o problema em poucas prioridades, testar evidencia minima e separar o que vira decisao do que fica como follow-up.
            </p>
          </div>
          <div className="rounded-md border border-[#E4DED2] bg-[#FBFAF7] p-4">
            <p className="sb-code">3 - Levar ao board</p>
            <p className="mt-3 text-lg font-semibold text-[#1F1B16]">{limitText(decisionQuestion, 30)}</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <SectionTitle label="Diagnostico executivo" />
            <p className="sb-serif-callout">{conciseDiagnosis || (loading ? 'Carregando diagnostico...' : 'Nenhuma governance run gerada ainda.')}</p>
            <div className="mt-5 rounded-md border border-[#E4DED2] bg-white p-4">
              <p className="sb-code">Decisao que precisa sair</p>
              <p className="mt-2 font-semibold text-[#1F1B16]">{decisionQuestion}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {readout?.latest_session?.status && <StatusPill>{formatStatus(readout.latest_session.status)}</StatusPill>}
              {readout?.latest_session?.closure_recommendation && <StatusPill>{formatClosure(readout.latest_session.closure_recommendation)}</StatusPill>}
            </div>
          </div>
          <div>
            <SectionTitle label="Prioridades escolhidas" />
            <div className="grid gap-3">
              {priorities.map((priority) => (
                <div className="rounded-md border border-[#E4DED2] bg-white p-4" key={`${priority.rank}-${priority.title}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="sb-code">P{priority.rank}</p>
                      <h2 className="sb-row-title mt-1">{priority.title}</h2>
                    </div>
                    <StatusPill>{limitText(priority.owner, 4)}</StatusPill>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="sb-code">Por que entrou</p>
                      <p className="sb-muted mt-1">{limitText(priority.reason, 22)}</p>
                    </div>
                    <div>
                      <p className="sb-code">Evidencia</p>
                      <p className="sb-muted mt-1">{limitText(priority.evidence, 22)}</p>
                    </div>
                    <div>
                      <p className="sb-code">Falta fechar</p>
                      <p className="sb-muted mt-1">{limitText(priority.gap, 22)}</p>
                    </div>
                  </div>
                  {priority.question && (
                    <p className="mt-3 border-t border-[#E4DED2] pt-3 font-semibold text-[#1F1B16]">{priority.question}</p>
                  )}
                </div>
              ))}
              {!loading && !priorities.length && (
                <p className="sb-muted">Nenhuma prioridade gerada ainda.</p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <SectionTitle label="Workstreams derivados" />
          <div className="sb-table">
            <div className="sb-table-head">
              <span>Frente</span><span>Dono</span><span>Cadencia</span><span>Prova</span>
            </div>
            {workstreamPlan.map((item) => (
              <div className="sb-table-row" key={item.title}>
                <span>{item.title}</span>
                <span>{item.owner}</span>
                <span>{item.cadence}</span>
                <span>{limitText(item.proof, 12)}</span>
              </div>
            ))}
            {!loading && !workstreams.length && (
              <div className="sb-table-row">
                <span>Nenhum workstream gerado ainda.</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
              </div>
            )}
          </div>
        </Panel>
        <Panel>
          <SectionTitle label="Evidencias antes de aprovar" />
          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <div className="rounded-md border border-[#E4DED2] bg-white p-3" key={`${gap}-${index}`}>
                <p className="sb-code">E{index + 1}</p>
                <p className="sb-muted mt-1">{limitText(gap, 20)}</p>
              </div>
            ))}
            {!loading && !gaps.length && <p className="sb-muted">Nenhuma lacuna de evidencia registrada.</p>}
          </div>
        </Panel>
      </section>

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
