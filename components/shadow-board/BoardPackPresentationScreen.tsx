'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StatusPill } from './ui'

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
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
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

function PresentationSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="sb-presentation-section">
      <p className="sb-code">{number}</p>
      <h2>{title}</h2>
      {children}
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
          <PresentationSection number="01" title="Perguntas de conselho">
            {asArray(boardPack.strategic_questions).map((question, index) => (
              <p key={`${textFrom(question)}-${index}`}><strong>Q{index + 1}</strong> {textFrom(question)}</p>
            ))}
          </PresentationSection>

          <PresentationSection number="02" title="Financeiro">
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

          <PresentationSection number="03" title="Mapa de riscos">
            {asArray(boardPack.risk_map).map((risk, index) => <p key={`${textFrom(risk)}-${index}`}>{textFrom(risk)}</p>)}
          </PresentationSection>

          <PresentationSection number="04" title="Advisor reports">
            {readout.agent_reviews.map((review) => (
              <article key={review.id} className="sb-presentation-advisor">
                <h3>{review.advisor_name}</h3>
                <p>{review.perspective}</p>
                <p className="sb-muted">Risco {review.risk_score ?? '-'} / Confianca {review.confidence_score ?? '-'}</p>
              </article>
            ))}
          </PresentationSection>

          <PresentationSection number="05" title="Decisoes candidatas">
            {asArray(boardPack.decision_candidates).map((decision, index) => (
              <p key={`${textFrom(decision)}-${index}`}><strong>D{index + 1}</strong> {textFrom(decision)}</p>
            ))}
          </PresentationSection>
        </div>
      )}
    </main>
  )
}
