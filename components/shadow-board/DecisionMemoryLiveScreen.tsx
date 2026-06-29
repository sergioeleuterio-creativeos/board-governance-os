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

export function DecisionMemoryLiveScreen() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = decisions.find((decision) => decision.id === selectedId) ?? decisions[0] ?? null
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
    setSavingId(null)
    await loadDecisions()
  }

  useEffect(() => {
    void loadDecisions()
  }, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <PageHeader
          eyebrow="06 - Decision Memory"
          title="Decision ledger"
          description="Registros permanentes com rationale, tradeoffs, owners e review dates."
        />

        {(error || notice) && (
          <Panel>
            {error && <p className="sb-error">{error}</p>}
            {notice && <p className="sb-muted">{notice}</p>}
          </Panel>
        )}

        <Panel>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusPill>All {decisions.length}</StatusPill>
            <StatusPill tone="positive">Approved {metrics.approved}</StatusPill>
            <StatusPill tone="caution">Review {metrics.review}</StatusPill>
            <StatusPill tone="critical">Rejected {metrics.rejected}</StatusPill>
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
                  detail={`${decision.status} - ${decision.closure_recommendation ?? 'sem closure'} - review ${dateLabel(decision.review_date)}`}
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
            <p className="sb-code">{selected.id.slice(0, 8)} - Decision record</p>
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
                onClick={() => void updateDecision(selected.id, { status: 'approved' })}
                disabled={savingId === selected.id}
              >
                Approve
              </button>
            </div>

            <DossierSection number="Rationale" title="Why this decision was made">
              <p>{selected.rationale || 'Rationale ainda nao registrado.'}</p>
            </DossierSection>
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel>
                <p className="sb-code">Owner</p>
                <p className="font-semibold">{selected.owner_label || selected.owner || 'Sem owner'}</p>
              </Panel>
              <Panel>
                <p className="sb-code">Review date</p>
                <p className="font-semibold">{dateLabel(selected.review_date)}</p>
              </Panel>
            </div>
            <DossierSection number="Tradeoffs" title="Accepted tradeoffs">
              <ul className="sb-clean-list">
                {jsonList(selected.tradeoffs).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </DossierSection>
            <DossierSection number="Conditions" title="Conditions and expected outcome">
              <p>{selected.expected_outcome || 'Expected outcome ainda nao registrado.'}</p>
              <ul className="sb-clean-list mt-3">
                {jsonList(selected.conditions).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </DossierSection>
          </>
        )}
      </Panel>
    </div>
  )
}
