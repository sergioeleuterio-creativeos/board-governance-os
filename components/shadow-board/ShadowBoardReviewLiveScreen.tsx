'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AdvisorMark, Meter, PageHeader, Panel, SectionTitle, StatusPill } from './ui'
import { formatClosure, formatStance, formatStatus } from '@/lib/shadow-board/display-labels'

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

type AgentConversation = {
  id: string
  from_advisor_key: string
  to_advisor_key: string
  relationship: 'agreement' | 'opposition' | 'neutrality'
  transcript: unknown
  summary: string | null
  conflicts: unknown
  agreements: unknown
  created_at: string
}

type BoardPackResponse = {
  company: { id: string; name: string } | null
  board_pack: {
    id: string
    status: string
    executive_summary: string | null
    decision_candidates: unknown
  } | null
  board_session: {
    id: string
    status: string
    closure_recommendation: string | null
    closure_summary: string | null
  } | null
  agent_reviews: AgentReview[]
  agent_conversations: AgentConversation[]
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

function relationshipTone(relationship: AgentConversation['relationship']): 'positive' | 'critical' | 'caution' {
  if (relationship === 'agreement') return 'positive'
  if (relationship === 'opposition') return 'critical'
  return 'caution'
}

function relationshipLabel(relationship: AgentConversation['relationship']) {
  if (relationship === 'agreement') return 'acordo'
  if (relationship === 'opposition') return 'oposicao'
  return 'neutralidade'
}

function advisorNameFromKey(key: string, reviews: AgentReview[]) {
  return reviews.find((review) => review.advisor_key === key)?.advisor_name ?? key
}

export function ShadowBoardReviewLiveScreen() {
  const [readout, setReadout] = useState<BoardPackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [deepDivingKey, setDeepDivingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  async function generateChallenges() {
    setGenerating(true)
    setError('')
    setNotice('')

    const response = await fetch('/api/shadow-board/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const payload = await response.json().catch(() => null) as ErrorResponse | { closure_summary?: string } | null

    if (!response.ok) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel gerar a rodada de desafios.')
      setGenerating(false)
      return
    }

    setNotice(payload && 'closure_summary' in payload && payload.closure_summary
      ? payload.closure_summary
      : 'Rodada de desafios gerada e registrada na memoria.')
    await loadReview()
    setGenerating(false)
  }

  async function closeSession() {
    setClosing(true)
    setError('')
    setNotice('')

    const response = await fetch('/api/shadow-board/session/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const payload = await response.json().catch(() => null) as ErrorResponse | {
      decisions_presented?: number
      conflicts_identified?: number
    } | null

    if (!response.ok) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel encerrar a sessao.')
      setClosing(false)
      return
    }

    const decisionsPresented = payload && 'decisions_presented' in payload ? payload.decisions_presented ?? 0 : 0
    const conflictsIdentified = payload && 'conflicts_identified' in payload ? payload.conflicts_identified ?? 0 : 0
    setNotice(`Sessao encerrada com ${decisionsPresented} decisoes apresentadas e ${conflictsIdentified} conflitos registrados em ata.`)
    await loadReview()
    setClosing(false)
  }

  async function deepDiveAdvisor(advisorKey: string) {
    setDeepDivingKey(advisorKey)
    setError('')
    setNotice('')

    const response = await fetch('/api/shadow-board/deep-dive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisor_key: advisorKey }),
    })
    const payload = await response.json().catch(() => null) as ErrorResponse | {
      advisor_key?: string
    } | null

    if (!response.ok) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel aprofundar o advisor.')
      setDeepDivingKey(null)
      return
    }

    setNotice('Aprofundamento registrado na memoria da sessao.')
    await loadReview()
    setDeepDivingKey(null)
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
        description="Seis lentes de governanca revisam de forma independente, com sintese e recomendacao de fechamento do Board Brain."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-gold"
              onClick={generateChallenges}
              disabled={generating || loading || !readout?.board_pack}
            >
              {generating ? 'Gerando...' : 'Gerar desafios'}
            </button>
            <button
              type="button"
              className="btn-chamber"
              onClick={closeSession}
              disabled={closing || loading || !readout?.board_session || readout.board_session.status === 'closed'}
            >
              {closing ? 'Encerrando...' : 'Encerrar sessao'}
            </button>
          </div>
        }
      />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      {notice && (
        <Panel>
          <p className="sb-muted">{notice}</p>
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
                    <StatusPill tone={stanceTone(review.stance)}>{review.stance ? formatStance(review.stance) : formatStatus(review.status)}</StatusPill>
                    <button
                      type="button"
                      className="btn-chamber-muted"
                      onClick={() => void deepDiveAdvisor(review.advisor_key)}
                      disabled={deepDivingKey === review.advisor_key || review.advisor_key === 'board_brain'}
                    >
                      {deepDivingKey === review.advisor_key ? 'Aprofundando...' : 'Aprofundar'}
                    </button>
                  </div>
                  <p>{review.perspective ?? 'Analise em fila.'}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="sb-code">Perguntas</p>
                      {asArray(review.strategic_questions).slice(0, 3).map((question, index) => (
                        <p key={`${review.id}-q-${index}`}>{textFromItem(question)}</p>
                      ))}
                    </div>
                    <div>
                      <p className="sb-code">Recomendacoes</p>
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
              <span className="sb-code">Confianca</span>
              <strong className="sb-big-number text-brass">{confidence}</strong>
            </div>
            <Meter value={confidence} tone={confidence >= 70 ? 'positive' : 'caution'} />
          </div>
          <p className="sb-serif-callout mt-6">
            {boardBrain?.perspective ?? readout?.board_pack?.executive_summary ?? 'A sintese do Board Brain aguarda uma governance run.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {boardBrain?.closure_recommendation && <StatusPill>{formatClosure(boardBrain.closure_recommendation)}</StatusPill>}
            {readout?.board_session?.closure_recommendation && <StatusPill tone="positive">{formatClosure(readout.board_session.closure_recommendation)}</StatusPill>}
            {readout?.board_pack?.status && <StatusPill>{formatStatus(readout.board_pack.status)}</StatusPill>}
          </div>
          {readout?.board_session?.closure_summary && (
            <p className="sb-muted mt-4">{readout.board_session.closure_summary}</p>
          )}
          <div className="mt-6 grid gap-2">
            <Link href="/decisions" className="btn-gold">Revisar candidatos de decisao</Link>
            <Link href="/board-pack" className="btn-chamber">Abrir Board Pack</Link>
            <Link href="/governance-run" className="btn-chamber-muted">Rodar novamente</Link>
          </div>
        </Panel>
      </section>

      <Panel tone="chamber">
        <SectionTitle
          label="Rodadas de desafio"
          action={<StatusPill>{readout?.agent_conversations?.length ?? 0} conversas</StatusPill>}
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {(readout?.agent_conversations ?? []).map((conversation) => (
            <article key={conversation.id} className="sb-review-card">
              <div className="flex items-start gap-3">
                <AdvisorMark
                  code={advisorCodes[conversation.from_advisor_key] ?? 'AD'}
                  color={advisorColors[conversation.from_advisor_key] ?? '#8A8478'}
                />
                <AdvisorMark
                  code={advisorCodes[conversation.to_advisor_key] ?? 'AD'}
                  color={advisorColors[conversation.to_advisor_key] ?? '#8A8478'}
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3>
                    {advisorNameFromKey(conversation.from_advisor_key, readout?.agent_reviews ?? [])}
                    {' x '}
                    {advisorNameFromKey(conversation.to_advisor_key, readout?.agent_reviews ?? [])}
                  </h3>
                  <StatusPill tone={relationshipTone(conversation.relationship)}>
                    {relationshipLabel(conversation.relationship)}
                  </StatusPill>
                </div>
                <p>{conversation.summary ?? 'Conversa registrada sem resumo.'}</p>
                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="sb-code">Conflitos</p>
                    {asArray(conversation.conflicts).slice(0, 2).map((conflict, index) => (
                      <p key={`${conversation.id}-c-${index}`}>{textFromItem(conflict)}</p>
                    ))}
                    {!asArray(conversation.conflicts).length && <p className="sb-muted">Sem conflito material nesta rodada.</p>}
                  </div>
                  <div>
                    <p className="sb-code">Acordos</p>
                    {asArray(conversation.agreements).slice(0, 2).map((agreement, index) => (
                      <p key={`${conversation.id}-a-${index}`}>{textFromItem(agreement)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!loading && !readout?.agent_conversations?.length && (
            <p className="sb-muted">Gere a rodada de desafios para registrar oposicoes, acordos e pontos neutros entre advisors.</p>
          )}
        </div>
      </Panel>
    </div>
  )
}
