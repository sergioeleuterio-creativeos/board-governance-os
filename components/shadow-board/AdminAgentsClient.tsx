'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type AdherenceScore = {
  total: number
  scope_fidelity: number
  evidence_discipline: number
  board_level_relevance: number
  closure_contribution: number
  missing_requirements: string[]
}

type AgentReview = {
  id: string
  company_name: string | null
  advisor_key: string
  advisor_name: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  closure_recommendation: string | null
  created_at: string
  adherence: AdherenceScore
}

type SummaryRow = {
  advisor_key: string
  average_adherence: number
  reviews_scored: number
  latest_review_at: string | null
}

type SourceRow = {
  name: string
  url: string
  use: string
}

type CaseRow = {
  id: string
  title: string
  sourceInstitution: string
  boardProblem: string
  advisorStress: string[]
}

type AgentsResponse = {
  overall_average: number
  summary: SummaryRow[]
  reviews: AgentReview[]
  sources: SourceRow[]
  case_library: CaseRow[]
}

type ErrorResponse = {
  error?: string
}

function isAgentsResponse(payload: AgentsResponse | ErrorResponse | null): payload is AgentsResponse {
  return !!payload && 'reviews' in payload && 'summary' in payload
}

function scoreTone(score: number): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (score >= 75) return 'positive'
  if (score >= 55) return 'caution'
  if (score > 0) return 'critical'
  return 'neutral'
}

function dateLabel(value: string | null) {
  if (!value) return 'sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function AdminAgentsClient() {
  const [readout, setReadout] = useState<AgentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const metrics = useMemo(() => {
    const reviews = readout?.reviews ?? []
    const weak = reviews.filter((review) => review.adherence.total < 55).length
    const withMissing = reviews.filter((review) => review.adherence.missing_requirements.length).length
    return [
      ['Aderencia media', String(readout?.overall_average ?? 0), 'score rubricado'],
      ['Analises avaliadas', String(reviews.length), 'ultimas revisoes'],
      ['Abaixo de 55', String(weak), 'precisam reforco'],
      ['Com lacunas', String(withMissing), 'evidencia ou recomendacao'],
    ] as const
  }, [readout])

  async function loadAgents() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/agents', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as AgentsResponse | ErrorResponse | null

    if (!response.ok || !isAgentsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar aderencia dos agentes.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  useEffect(() => {
    void loadAgents()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Aderencia dos advisors"
        description="Qualidade das analises contra rubricas de governanca, evidencias e recomendacao final."
        action={<button className="btn-secondary" type="button" onClick={() => void loadAgents()}>Atualizar</button>}
      />

      {error && <Panel><p className="sb-error">{error}</p></Panel>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <SectionTitle label="Aderencia por advisor" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(readout?.summary ?? []).map((row) => (
            <article key={row.advisor_key} className="sb-advisor-row">
              <span className="sb-file-type">{row.average_adherence}</span>
              <div>
                <p className="font-semibold">{row.advisor_key}</p>
                <p className="sb-muted">{row.reviews_scored} reviews - {dateLabel(row.latest_review_at)}</p>
              </div>
              <StatusPill tone={scoreTone(row.average_adherence)}>{row.average_adherence >= 75 ? 'bom' : 'atenção'}</StatusPill>
            </article>
          ))}
          {!loading && !(readout?.summary ?? []).length && <p className="sb-muted">Nenhum agent review encontrado.</p>}
        </div>
      </Panel>

      <Panel>
        <SectionTitle label="Ultimos reviews avaliados" />
        <div className="space-y-3">
          {(readout?.reviews ?? []).slice(0, 18).map((review) => (
            <article key={review.id} className="sb-row-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="sb-code">{review.company_name ?? 'sem empresa'} - {dateLabel(review.created_at)}</p>
                  <h3 className="sb-row-title">{review.advisor_name}</h3>
                  <p className="sb-muted mt-1">{review.perspective?.slice(0, 280) || 'Sem perspectiva registrada.'}</p>
                  {!!review.adherence.missing_requirements.length && (
                    <p className="sb-error mt-2">{review.adherence.missing_requirements.join(' ')}</p>
                  )}
                </div>
                <div className="grid min-w-[240px] gap-2 text-sm">
                  <StatusPill tone={scoreTone(review.adherence.total)}>total {review.adherence.total}</StatusPill>
                  <span>Scope {review.adherence.scope_fidelity}</span>
                  <span>Evidencia {review.adherence.evidence_discipline}</span>
                  <span>Board {review.adherence.board_level_relevance}</span>
                  <span>Closure {review.adherence.closure_contribution}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionTitle label="Fontes de treinamento" />
          <div className="space-y-3">
            {(readout?.sources ?? []).map((source) => (
              <article key={source.name} className="sb-advisor-row">
                <span className="sb-file-type">SRC</span>
                <div>
                  <p className="font-semibold">{source.name}</p>
                  <p className="sb-muted">{source.use}</p>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle label="Case library" />
          <div className="space-y-3">
            {(readout?.case_library ?? []).map((caseItem) => (
              <article key={caseItem.id} className="sb-row-card">
                <p className="sb-code">{caseItem.sourceInstitution}</p>
                <h3 className="sb-row-title">{caseItem.title}</h3>
                <p className="sb-muted mt-1">{caseItem.boardProblem}</p>
                <p className="sb-muted mt-2">Stress: {caseItem.advisorStress.join(', ')}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}
