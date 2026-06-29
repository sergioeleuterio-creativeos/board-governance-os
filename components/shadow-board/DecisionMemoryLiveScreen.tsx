'use client'

import { useEffect, useMemo, useState } from 'react'
import { DossierSection, PageHeader, Panel, RowCard, SectionTitle, StatusPill } from './ui'

type DecisionRecord = {
  id: string
  title: string
  decision: string | null
  status: string
  closure_recommendation: string | null
  rationale: string | null
  risks: string | null
  expected_outcome: string | null
  tradeoffs: unknown
  risk_level: string | null
  confidence_score: number | null
  conditions: unknown
  owner_label: string | null
  owner: string | null
  review_date: string | null
  metadata: unknown
  created_at: string
  updated_at: string
}

type DecisionsResponse = {
  company: { id: string; name: string } | null
  decisions: DecisionRecord[]
}

type ErrorResponse = {
  error?: string
}

const decisionStatuses = ['candidate', 'approved', 'rejected', 'deferred', 'review_due', 'closed', 'open', 'reviewing'] as const

function isDecisionsResponse(payload: DecisionsResponse | ErrorResponse | null): payload is DecisionsResponse {
  return !!payload && 'decisions' in payload
}

function toneForStatus(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (['approved', 'closed'].includes(status)) return 'positive'
  if (['rejected', 'reversed'].includes(status)) return 'critical'
  if (['candidate', 'review_due', 'reviewing', 'deferred'].includes(status)) return 'caution'
  return 'neutral'
}

function dateLabel(value: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function jsonList(value: unknown) {
  if (!Array.isArray(value) || !value.length) return ['Nao registrado.']
  return value.map((item) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      return [record.title, record.detail, record.description].filter(Boolean).join(': ')
    }
    return String(item)
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function futureImpactFor(decision: DecisionRecord) {
  const metadata = asRecord(decision.metadata)
  const impact = asRecord(metadata.future_impact_check)
  const related = Array.isArray(impact.related_decisions) ? impact.related_decisions : []
  return {
    riskNote: typeof impact.risk_note === 'string' ? impact.risk_note : 'Nenhuma checagem de impacto registrada ainda.',
    reviewNote: typeof impact.review_note === 'string' ? impact.review_note : '',
    related: related.map((item) => asRecord(item)),
  }
}

export function DecisionMemoryLiveScreen() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [founderNote, setFounderNote] = useState('')

  const selected = decisions.find((decision) => decision.id === selectedId) ?? decisions[0] ?? null
  const selectedImpact = selected ? futureImpactFor(selected) : null
  const metrics = useMemo(() => {
    const approved = decisions.filter((decision) => decision.status === 'approved' || decision.status === 'closed').length
    const review = decisions.filter((decision) => ['candidate', 'review_due', 'reviewing', 'deferred'].includes(decision.status)).length
    const rejected = decisions.filter((decision) => ['rejected', 'reversed'].includes(decision.status)).length
    return { approved, review, rejected }
  }, [decisions])

  async function loadDecisions() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/decisions', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as DecisionsResponse | ErrorResponse | null

    if (!response.ok || !isDecisionsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar decisoes.')
      setLoading(false)
      return
    }

    setDecisions(payload.decisions)
    setSelectedId((current) => current ?? payload.decisions[0]?.id ?? null)
    setLoading(false)
  }

  async function updateDecision(decisionId: string, updates: Record<string, string | null>) {
    setSavingId(decisionId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/decisions/${decisionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar a decisao.')
      setSavingId(null)
      return
    }

    setNotice('Decisao atualizada.')
    setFounderNote('')
    setSavingId(null)
    await loadDecisions()
  }

  async function runDecisionAction(action: 'approve' | 'approve_with_conditions' | 'defer' | 'reject' | 'request_more_data') {
    if (!selected) return
    await updateDecision(selected.id, {
      action,
      founder_note: founderNote.trim() || null,
    })
  }

  useEffect(() => {
    void loadDecisions()
  }, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <PageHeader
          eyebrow="06 - Memoria de decisoes"
          title="Livro de decisoes"
          description="Registros permanentes com racional, tradeoffs, responsaveis e datas de revisao."
        />

        {(error || notice) && (
          <Panel>
            {error && <p className="sb-error">{error}</p>}
            {notice && <p className="sb-muted">{notice}</p>}
          </Panel>
        )}

        <Panel>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusPill>Todas {decisions.length}</StatusPill>
            <StatusPill tone="positive">Aprovadas {metrics.approved}</StatusPill>
            <StatusPill tone="caution">Revisao {metrics.review}</StatusPill>
            <StatusPill tone="critical">Rejeitadas {metrics.rejected}</StatusPill>
          </div>
          <div className="space-y-3">
            {loading && <p className="sb-muted">Carregando decisoes...</p>}
            {!loading && decisions.map((decision) => (
              <button
                className="block w-full text-left"
                key={decision.id}
                type="button"
                onClick={() => setSelectedId(decision.id)}
              >
                <RowCard
                  code={decision.id.slice(0, 8)}
                  title={decision.title || 'Decisao sem titulo'}
                  detail={`${decision.status} - ${decision.closure_recommendation ?? 'sem closure'} - revisao ${dateLabel(decision.review_date)}`}
                  tag={decision.risk_level ?? decision.status}
                  tone={toneForStatus(decision.status)}
                />
              </button>
            ))}
            {!loading && decisions.length === 0 && (
              <p className="sb-muted">Nenhuma decisao registrada ainda. Rode uma governance run para criar candidatos.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel tone="dossier" className="sb-dossier">
        {!selected ? (
          <p className="sb-muted">Selecione uma decisao para revisar o registro completo.</p>
        ) : (
          <>
            <p className="sb-code">{selected.id.slice(0, 8)} - Registro de decisao</p>
            <h1>{selected.title || 'Decisao sem titulo'}</h1>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={toneForStatus(selected.status)}>{selected.status}</StatusPill>
              {selected.closure_recommendation && <StatusPill>{selected.closure_recommendation}</StatusPill>}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label>
                <span className="field-label">Status</span>
                <select
                  className="field-input"
                  value={selected.status}
                  onChange={(event) => void updateDecision(selected.id, { status: event.target.value })}
                  disabled={savingId === selected.id}
                >
                  {decisionStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn-primary self-end"
                type="button"
                onClick={() => void runDecisionAction('approve')}
                disabled={savingId === selected.id}
              >
                Aprovar
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label>
                <span className="field-label">Nota do founder</span>
                <textarea
                  className="field-input min-h-[86px] resize-y"
                  value={founderNote}
                  onChange={(event) => setFounderNote(event.target.value)}
                  placeholder="Condição, objeção, pedido de dados ou contexto para registrar junto com a decisão..."
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button className="btn-secondary" type="button" onClick={() => void runDecisionAction('approve_with_conditions')} disabled={savingId === selected.id}>
                  Aprovar com condicoes
                </button>
                <button className="btn-secondary" type="button" onClick={() => void runDecisionAction('request_more_data')} disabled={savingId === selected.id}>
                  Pedir dados
                </button>
                <button className="btn-secondary" type="button" onClick={() => void runDecisionAction('defer')} disabled={savingId === selected.id}>
                  Adiar
                </button>
                <button className="btn-secondary" type="button" onClick={() => void runDecisionAction('reject')} disabled={savingId === selected.id}>
                  Rejeitar
                </button>
              </div>
            </div>

            <DossierSection number="Racional" title="Por que esta decisao foi tomada">
              <p>{selected.rationale || 'Racional ainda nao registrado.'}</p>
            </DossierSection>
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel>
                <p className="sb-code">Responsavel</p>
                <p className="font-semibold">{selected.owner_label || selected.owner || 'Sem responsavel'}</p>
              </Panel>
              <Panel>
                <p className="sb-code">Data de revisao</p>
                <p className="font-semibold">{dateLabel(selected.review_date)}</p>
              </Panel>
            </div>
            <DossierSection number="Tradeoffs" title="Tradeoffs aceitos">
              <ul className="sb-clean-list">
                {jsonList(selected.tradeoffs).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </DossierSection>
            <DossierSection number="Condicoes" title="Condicoes e resultado esperado">
              <p>{selected.expected_outcome || 'Resultado esperado ainda nao registrado.'}</p>
              <ul className="sb-clean-list mt-3">
                {jsonList(selected.conditions).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </DossierSection>
            <DossierSection number="Impacto" title="Dependencias e impacto futuro">
              <p>{selectedImpact?.riskNote}</p>
              {selectedImpact?.reviewNote && <p className="sb-muted mt-2">{selectedImpact.reviewNote}</p>}
              <div className="mt-3 grid gap-2">
                {(selectedImpact?.related ?? []).map((decision) => (
                  <article className="sb-row-card" key={String(decision.id)}>
                    <p className="sb-code">{String(decision.relationship ?? 'future_impact')}</p>
                    <h3 className="sb-row-title">{String(decision.title ?? 'Decisao relacionada')}</h3>
                    <p className="sb-muted">
                      {String(decision.status ?? 'sem status')} - score {String(decision.overlap_score ?? 0)}
                    </p>
                  </article>
                ))}
                {!(selectedImpact?.related ?? []).length && (
                  <p className="sb-muted">A proxima acao do founder vai gerar esta checagem automaticamente.</p>
                )}
              </div>
            </DossierSection>
          </>
        )}
      </Panel>
    </div>
  )
}
