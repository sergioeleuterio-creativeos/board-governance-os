'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AdvisorMark, Meter, PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type AgentReview = {
  id: string
  advisor_key: string
  advisor_name: string
  status: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: unknown
  recommendations: unknown
  closure_recommendation: string | null
}

type BoardPackResponse = {
  company: { id: string; name: string } | null
  board_pack: {
    id: string
    status: string
    executive_summary: string | null
    decision_candidates: unknown
  } | null
  agent_reviews: AgentReview[]
}

type ErrorResponse = {
  error?: string
}

const advisorColors: Record<string, string> = {
  board_brain: '#C4922F',
  finance: '#3E6B4F',
  operator: '#4A5A6A',
  growth: '#2F6E6A',
  risk: '#A23B2D',
  customer: '#7A4E63',
  talent: '#85702F',
}

const advisorCodes: Record<string, string> = {
  board_brain: 'BB',
  finance: 'FN',
  operator: 'OP',
  growth: 'GR',
  risk: 'RK',
  customer: 'CU',
  talent: 'TL',
}

function isBoardPackResponse(payload: BoardPackResponse | ErrorResponse | null): payload is BoardPackResponse {
  return !!payload && 'agent_reviews' in payload
}

function asArray(value: unknown): Array<Record<string, unknown> | string> {
  return Array.isArray(value) ? value : []
}

function textFromItem(item: Record<string, unknown> | string) {
  if (typeof item === 'string') return item
  return [item.title, item.detail, item.description, item.priority].filter(Boolean).join(' - ')
}

function stanceTone(stance: string | null): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (stance === 'oppose') return 'critical'
  if (stance === 'needs_more_data' || stance === 'neutral') return 'caution'
  if (stance === 'support' || stance === 'support_with_conditions') return 'positive'
  return 'neutral'
}

export function ShadowBoardReviewLiveScreen() {
  const [readout, setReadout] = useState<BoardPackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const boardBrain = readout?.agent_reviews.find((review) => review.advisor_key === 'board_brain') ?? null
  const advisors = readout?.agent_reviews.filter((review) => review.advisor_key !== 'board_brain') ?? []
  const confidence = useMemo(() => {
    const values = (readout?.agent_reviews ?? [])
      .map((review) => review.confidence_score)
      .filter((value): value is number => typeof value === 'number')
    if (!values.length) return 0
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [readout])
  const aligned = advisors.filter((review) => review.stance === 'support' || review.stance === 'support_with_conditions').length
  const dissent = advisors.filter((review) => review.stance === 'oppose').length

  async function loadReview() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/board-pack/latest', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as BoardPackResponse | ErrorResponse | null

    if (!response.ok || !isBoardPackResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar o Shadow Board Review.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  useEffect(() => {
    void loadReview()
  }, [])

  if (!loading && !readout?.board_pack) {
    return (
      <div className="space-y-6">
        <Panel tone="chamber">
          <SectionTitle label="Shadow Board Review" />
          <p className="sb-serif-callout">Nenhum board pack esta em review ainda.</p>
          <Link href="/governance-run" className="btn-gold mt-4">Rodar Board Brain</Link>
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="05 - Shadow Board Review"
        title={readout?.company?.name ? `${readout.company.name} em sessao` : 'Board Pack em sessao'}
        description="Seis lentes de governanca revisam de forma independente, com sintese e recomendacao de closure do Board Brain."
      />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel tone="chamber">
          <SectionTitle label="Analise dos advisors" />
          <div className="grid gap-3">
            {(advisors.length ? advisors : readout?.agent_reviews ?? []).map((review) => (
              <article key={review.id} className="sb-review-card">
                <AdvisorMark
                  code={advisorCodes[review.advisor_key] ?? 'AD'}
                  color={advisorColors[review.advisor_key] ?? '#8A8478'}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3>{review.advisor_name}</h3>
                    <StatusPill tone={stanceTone(review.stance)}>{review.stance ?? review.status}</StatusPill>
                  </div>
                  <p>{review.perspective ?? 'Analysis queued.'}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="sb-code">Questions</p>
                      {asArray(review.strategic_questions).slice(0, 3).map((question, index) => (
                        <p key={`${review.id}-q-${index}`}>{textFromItem(question)}</p>
                      ))}
                    </div>
                    <div>
                      <p className="sb-code">Recommendations</p>
                      {asArray(review.recommendations).slice(0, 3).map((recommendation, index) => (
                        <p key={`${review.id}-r-${index}`}>{textFromItem(recommendation)}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {loading && <p className="sb-muted">Carregando advisors...</p>}
          </div>
        </Panel>

        <Panel tone="chamber" className="sb-synthesis">
          <AdvisorMark code="BB" color="#C4922F" size="lg" />
          <p className="sb-eyebrow mt-5">Board Brain - recomendacao sintetizada</p>
          <h2>{aligned} alinhados - {dissent} dissentimento registrado</h2>
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="sb-code">Confidence</span>
              <strong className="sb-big-number text-brass">{confidence}</strong>
            </div>
            <Meter value={confidence} tone={confidence >= 70 ? 'positive' : 'caution'} />
          </div>
          <p className="sb-serif-callout mt-6">
            {boardBrain?.perspective ?? readout?.board_pack?.executive_summary ?? 'Board Brain synthesis is waiting for a governance run.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {boardBrain?.closure_recommendation && <StatusPill>{boardBrain.closure_recommendation}</StatusPill>}
            {readout?.board_pack?.status && <StatusPill>{readout.board_pack.status}</StatusPill>}
          </div>
          <div className="mt-6 grid gap-2">
            <Link href="/decisions" className="btn-gold">Revisar candidatos de decisao</Link>
            <Link href="/board-pack" className="btn-chamber">Open board pack</Link>
            <Link href="/governance-run" className="btn-chamber-muted">Rodar novamente</Link>
          </div>
        </Panel>
      </section>
    </div>
  )
}
