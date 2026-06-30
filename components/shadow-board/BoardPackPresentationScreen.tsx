'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdvisorMark, StatusPill } from './ui'
import { formatClosure } from '@/lib/shadow-board/display-labels'

type BoardPack = {
  id: string
  version: number
  status: string
  executive_summary: string | null
  strategic_questions: unknown
  risk_map: unknown
  priority_ranking: unknown
  meeting_agenda: unknown
  decision_candidates: unknown
  export_payload: unknown
}

type AgentReview = {
  id: string
  advisor_key: string
  advisor_name: string
  stance?: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions?: unknown
  recommendations: unknown
  closure_recommendation: string | null
}

type BoardPackResponse = {
  company: { id: string; name: string } | null
  board_pack: BoardPack | null
  agent_reviews: AgentReview[]
}

type ErrorResponse = {
  error?: string
}

function isBoardPackResponse(payload: BoardPackResponse | ErrorResponse | null): payload is BoardPackResponse {
  return !!payload && 'board_pack' in payload && 'agent_reviews' in payload
}

function asArray(value: unknown): Array<Record<string, unknown> | string> {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textFrom(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(textFrom).filter(Boolean).join('; ')
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return String(record.title ?? record.decision ?? record.rationale ?? record.risk ?? record.detail ?? Object.values(record).map(textFrom).filter(Boolean).join(' - '))
  }
  return String(value)
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

function fieldText(item: Record<string, unknown> | string, keys: string[], fallback = '') {
  if (typeof item === 'string') return item

  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }

  return fallback
}

function shortText(value: string, maxWords = 34) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}...`
}

function PresentationSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="sb-presentation-section">
      <aside>
        <p className="sb-code">{number}</p>
        <h2>{title}</h2>
      </aside>
      <div>{children}</div>
    </section>
  )
}

export function BoardPackPresentationScreen() {
  const [readout, setReadout] = useState<BoardPackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/board-pack/latest', { cache: 'no-store' })
      const payload = await response.json().catch(() => null) as BoardPackResponse | ErrorResponse | null
      if (!response.ok || !isBoardPackResponse(payload)) {
        const message = payload && 'error' in payload ? payload.error : undefined
        setError(message ?? 'Nao foi possivel carregar o board pack.')
        setLoading(false)
        return
      }
      setReadout(payload)
      setLoading(false)
    }
    void load()
  }, [])

  const boardPack = readout?.board_pack
  const payload = asRecord(boardPack?.export_payload)
  const financialReport = asRecord(payload.financial_report)

  return (
    <main className="sb-presentation">
      <header className="sb-presentation-hero">
        <div>
          <p className="sb-code">Board Governance OS</p>
          <h1>{readout?.company?.name ?? 'Board Pack'}</h1>
          <p>{boardPack?.executive_summary ?? (loading ? 'Carregando board pack...' : 'Nenhum board pack encontrado.')}</p>
        </div>
        <div className="sb-presentation-actions">
          <StatusPill>{boardPack?.status ?? 'preview'}</StatusPill>
          <Link href="/board-pack" className="btn-secondary">Voltar</Link>
          <button type="button" className="btn-primary" onClick={() => window.print()}>Imprimir</button>
        </div>
      </header>

      {error && <p className="sb-error">{error}</p>}
      {!loading && !boardPack && <Link href="/governance-run" className="btn-primary">Rodar Board Brain</Link>}

      {boardPack && (
        <div className="sb-presentation-pages">
          <PresentationSection number="01" title="Sumario executivo">
            <p className="sb-presentation-lead">{boardPack.executive_summary}</p>
          </PresentationSection>

          <PresentationSection number="02" title="Perguntas estrategicas">
            {asArray(boardPack.strategic_questions).map((question, index) => (
              <article className="sb-presentation-line" key={`${textFrom(question)}-${index}`}>
                <span>Q{index + 1}</span>
                <p>{textFrom(question)}</p>
              </article>
            ))}
          </PresentationSection>

          <PresentationSection number="03" title="Relatorios financeiros">
            {Object.entries(financialReport).map(([section, rows]) => (
              <div key={section} className="sb-presentation-table">
                <h3>{section}</h3>
                {asArray(rows).map((row, index) => {
                  const record = asRecord(row)
                  return (
                    <p key={`${section}-${index}`}>
                      <strong>{String(record.metric ?? record.line_item ?? `Item ${index + 1}`)}</strong>
                      <span>{String(record.value ?? '-')}</span>
                      <em>{String(record.board_note ?? record.note ?? '')}</em>
                    </p>
                  )
                })}
              </div>
            ))}
          </PresentationSection>

          <PresentationSection number="04" title="Mapa de riscos">
            {asArray(boardPack.risk_map).map((risk, index) => (
              <article className="sb-presentation-line" key={`${textFrom(risk)}-${index}`}>
                <span>R{index + 1}</span>
                <p>{textFrom(risk)}</p>
              </article>
            ))}
          </PresentationSection>

          <PresentationSection number="05" title="Relatorios dos advisors">
            <div className="sb-presentation-advisor-grid">
              {readout.agent_reviews.map((review) => (
              <article key={review.id} className="sb-presentation-advisor">
                <div className="flex items-center gap-3">
                  <AdvisorMark
                    code={advisorCodes[review.advisor_key] ?? 'AD'}
                    color={advisorColors[review.advisor_key] ?? '#8A8478'}
                    size="sm"
                  />
                  <div>
                    <h3>{review.advisor_name}</h3>
                    <p className="sb-muted">Risco {review.risk_score ?? '-'} / Confianca {review.confidence_score ?? '-'}</p>
                  </div>
                </div>
                <p>{shortText(review.perspective ?? 'Analise em processamento.', 30)}</p>
                <div>
                  <p className="sb-code">Recomendacao-chave</p>
                  <p>{shortText(fieldText(asArray(review.recommendations)[0] ?? '', ['title', 'detail', 'description'], textFrom(asArray(review.recommendations)[0])), 22)}</p>
                </div>
                {review.closure_recommendation && <StatusPill>{formatClosure(review.closure_recommendation)}</StatusPill>}
              </article>
              ))}
            </div>
          </PresentationSection>

          <PresentationSection number="06" title="Agenda da reuniao">
            <div className="sb-presentation-agenda">
              {asArray(boardPack.meeting_agenda).map((agendaItem, index) => (
                <article key={`${textFrom(agendaItem)}-${index}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{fieldText(agendaItem, ['title', 'topic', 'detail', 'description'], textFrom(agendaItem))}</p>
                </article>
              ))}
              {!asArray(boardPack.meeting_agenda).length && <p className="sb-muted">Nenhuma agenda registrada.</p>}
            </div>
          </PresentationSection>

          <PresentationSection number="07" title="Candidatos de decisao">
            {asArray(boardPack.decision_candidates).map((decision, index) => (
              <article className="sb-presentation-line" key={`${textFrom(decision)}-${index}`}>
                <span>D{index + 1}</span>
                <p>{textFrom(decision)}</p>
              </article>
            ))}
          </PresentationSection>
        </div>
      )}
    </main>
  )
}
