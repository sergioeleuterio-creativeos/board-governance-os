'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'
import { formatClosure, formatStatus } from '@/lib/shadow-board/display-labels'

type StatusTone = 'positive' | 'critical' | 'caution' | 'neutral'

type AdminSession = {
  id: string
  company_name: string
  organization_name: string
  governance_cycle_title: string | null
  session_type: string
  status: string
  opened_at: string | null
  expires_at: string | null
  closed_at: string | null
  closure_recommendation: string | null
  closure_summary: string | null
  usage_units_consumed: number
  created_at: string
}

type SessionsResponse = {
  sessions: AdminSession[]
}

type ErrorResponse = {
  error?: string
}

const sessionStatuses = ['draft', 'open', 'in_review', 'awaiting_founder', 'closed', 'expired', 'cancelled'] as const
const closureOptions = [
  '',
  'commit',
  'commit_with_conditions',
  'defer',
  'reject',
  'request_more_data',
  'escalate_human_review',
] as const

function isSessionsResponse(payload: SessionsResponse | ErrorResponse | null): payload is SessionsResponse {
  return !!payload && 'sessions' in payload
}

function statusTone(status: string): StatusTone {
  if (status === 'closed') return 'positive'
  if (['expired', 'cancelled'].includes(status)) return 'critical'
  if (['open', 'in_review', 'awaiting_founder'].includes(status)) return 'caution'
  return 'neutral'
}

function dateLabel(value: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function windowLabel(session: AdminSession) {
  if (session.closed_at) return `Fechada ${dateLabel(session.closed_at)}`
  if (session.expires_at) return `Expira ${dateLabel(session.expires_at)}`
  if (session.opened_at) return `Aberta ${dateLabel(session.opened_at)}`
  return `Criada ${dateLabel(session.created_at)}`
}

export function AdminSessionsClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const open = sessions.filter((session) => ['open', 'in_review', 'awaiting_founder'].includes(session.status)).length
    const closed = sessions.filter((session) => session.status === 'closed').length
    const withoutClosure = sessions.filter((session) => !session.closure_recommendation).length

    return [
      ['Sessoes', String(sessions.length), `${open} abertas`],
      ['Fechadas', String(closed), 'com memoria registrada'],
      ['Sem fechamento', String(withoutClosure), 'precisam recomendacao'],
    ] as const
  }, [sessions])

  async function loadSessions() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/sessions', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as SessionsResponse | ErrorResponse | null

    if (!response.ok || !isSessionsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar sessoes.')
      setLoading(false)
      return
    }

    setSessions(payload.sessions)
    setLoading(false)
  }

  async function updateSession(sessionId: string, updates: Record<string, string | number | null>) {
    setSavingSessionId(sessionId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar a sessao.')
      setSavingSessionId(null)
      return
    }

    setNotice('Sessao atualizada.')
    setSavingSessionId(null)
    await loadSessions()
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin - Sessoes"
        title="Monitor de board sessions"
        description="Acompanhamento ao vivo de status, consumo, janela de revisao e recomendacao de fechamento."
        action={<button className="btn-secondary" type="button" onClick={() => void loadSessions()}>Atualizar</button>}
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value, detail]) => (
          <Panel key={label}>
            <p className="sb-code">{label}</p>
            <p className="sb-big-number">{loading ? '-' : value}</p>
            <p className="sb-muted">{detail}</p>
          </Panel>
        ))}
      </section>

      <Panel>
        <SectionTitle label="Sessoes" />
        <div className="sb-table sb-admin-sessions-table">
          <div className="sb-table-head">
            <span>Sessao</span>
            <span>Empresa</span>
            <span>Status</span>
            <span>Closure</span>
            <span>Janela</span>
            <span>Acoes</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando sessoes...</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhuma sessao encontrada.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {sessions.map((session) => (
            <div className="sb-table-row" key={session.id}>
              <span>
                <strong>{session.id.slice(0, 8)}</strong>
                <small>{formatStatus(session.session_type)}</small>
                <small>{session.governance_cycle_title ?? 'Ciclo sem titulo'}</small>
              </span>
              <span>
                {session.company_name}
                <small>{session.organization_name}</small>
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={session.status}
                  onChange={(event) => void updateSession(session.id, { status: event.target.value })}
                  disabled={savingSessionId === session.id}
                >
                  {sessionStatuses.map((status) => (
                    <option key={status} value={status}>{formatStatus(status)}</option>
                  ))}
                </select>
                <StatusPill tone={statusTone(session.status)}>{formatStatus(session.status)}</StatusPill>
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={session.closure_recommendation ?? ''}
                  onChange={(event) => void updateSession(session.id, { closure_recommendation: event.target.value })}
                  disabled={savingSessionId === session.id}
                >
                  {closureOptions.map((closure) => (
                    <option key={closure || 'empty'} value={closure}>{formatClosure(closure)}</option>
                  ))}
                </select>
                <small>{session.closure_summary ?? 'Sem resumo de fechamento'}</small>
              </span>
              <span>
                {windowLabel(session)}
                <small>{session.usage_units_consumed} unidades</small>
              </span>
              <span className="sb-row-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => void updateSession(session.id, { status: 'closed' })}
                  disabled={savingSessionId === session.id || session.status === 'closed'}
                >
                  Fechar
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => void updateSession(session.id, { status: 'awaiting_founder' })}
                  disabled={savingSessionId === session.id}
                >
                  Aguardar fundador
                </button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
