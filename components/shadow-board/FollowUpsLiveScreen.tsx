'use client'

import { useEffect, useMemo, useState } from 'react'
import { MetricCard, PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type FollowUpRecord = {
  id: string
  title: string
  action: string | null
  description: string | null
  status: string
  priority: string
  due_date: string | null
  completed_at: string | null
  owner_label: string | null
  owner: string | null
  source_agent_key: string | null
  decision_id: string | null
  next_reminder_at: string | null
  next_reminder_channel: string | null
  scheduled_reminders_count: number
}

type FollowUpsResponse = {
  company: { id: string; name: string } | null
  follow_ups: FollowUpRecord[]
}

type ErrorResponse = {
  error?: string
}

const followUpStatuses = ['open', 'in_progress', 'done', 'blocked', 'cancelled'] as const

function isFollowUpsResponse(payload: FollowUpsResponse | ErrorResponse | null): payload is FollowUpsResponse {
  return !!payload && 'follow_ups' in payload
}

function dateLabel(value: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value))
}

function dueTone(item: FollowUpRecord): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (item.status === 'done') return 'positive'
  if (!item.due_date) return 'neutral'
  const today = new Date().toISOString().slice(0, 10)
  if (item.due_date < today) return 'critical'
  if (item.priority === 'urgent' || item.priority === 'high') return 'caution'
  return 'neutral'
}

function dueThisWeek(item: FollowUpRecord) {
  if (!item.due_date || item.status === 'done' || item.status === 'cancelled') return false
  const dueDate = new Date(`${item.due_date}T00:00:00`)
  const today = new Date()
  const weekAhead = new Date()
  weekAhead.setDate(today.getDate() + 7)
  return dueDate >= today && dueDate <= weekAhead
}

export function FollowUpsLiveScreen() {
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [referringId, setReferringId] = useState<string | null>(null)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const overdue = followUps.filter((item) => item.due_date && item.due_date < today && !['done', 'cancelled'].includes(item.status)).length
    const dueWeek = followUps.filter(dueThisWeek).length
    const onTrack = followUps.filter((item) => ['open', 'in_progress'].includes(item.status) && (!item.due_date || item.due_date >= today)).length
    return { overdue, dueWeek, onTrack }
  }, [followUps])

  async function loadFollowUps() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/follow-ups', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as FollowUpsResponse | ErrorResponse | null

    if (!response.ok || !isFollowUpsResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar follow-ups.')
      setLoading(false)
      return
    }

    setFollowUps(payload.follow_ups)
    setLoading(false)
  }

  async function updateFollowUp(followUpId: string, updates: Record<string, string | null>) {
    setSavingId(followUpId)
    setError('')
    setNotice('')

    const response = await fetch(`/api/follow-ups/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel atualizar o follow-up.')
      setSavingId(null)
      return
    }

    setNotice('Follow-up atualizado.')
    setSavingId(null)
    await loadFollowUps()
  }

  async function requestReferral(item: FollowUpRecord) {
    setReferringId(item.id)
    setError('')
    setNotice('')

    const response = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        follow_up_id: item.id,
        recommended_by_agent_key: item.source_agent_key,
        requested_category: item.source_agent_key === 'customer' ? 'Marketing / crescimento de clientes' : 'Fornecedor recomendado',
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel solicitar a conexao.')
      setReferringId(null)
      return
    }

    setNotice('Pedido de conexao registrado para triagem admin.')
    setReferringId(null)
  }

  async function scheduleReminder(item: FollowUpRecord) {
    if (!item.due_date) {
      setError('Defina um prazo antes de agendar lembrete.')
      return
    }

    setRemindingId(item.id)
    setError('')
    setNotice('')

    const remindAt = new Date(`${item.due_date}T12:00:00.000Z`)
    remindAt.setUTCDate(remindAt.getUTCDate() - 1)

    const response = await fetch(`/api/follow-ups/${item.id}/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'email',
        remind_at: remindAt.toISOString(),
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? 'Nao foi possivel agendar o lembrete.')
      setRemindingId(null)
      return
    }

    setNotice('Lembrete agendado.')
    setRemindingId(null)
    await loadFollowUps()
  }

  useEffect(() => {
    void loadFollowUps()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="07 - Follow-ups"
        title="Cadencia e follow-through"
        description="Cada decisao carrega responsaveis e datas. Esta tela mantem a memoria operacional viva."
      />

      {(error || notice) && (
        <Panel>
          {error && <p className="sb-error">{error}</p>}
          {notice && <p className="sb-muted">{notice}</p>}
        </Panel>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Atrasados" value={String(metrics.overdue)} detail="acoes criticas" tone={metrics.overdue ? 'critical' : 'positive'} />
        <MetricCard label="Esta semana" value={String(metrics.dueWeek)} detail="check-ins de responsavel" tone={metrics.dueWeek ? 'caution' : 'neutral'} />
        <MetricCard label="No trilho" value={String(metrics.onTrack)} detail="loops ativos" tone="positive" />
      </section>
      <Panel>
        <SectionTitle label="Tracker de follow-ups" />
        <div className="sb-table sb-followup-table">
          <div className="sb-table-head">
            <span>Follow-up</span><span>Responsavel</span><span>Prazo</span><span>Status</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando follow-ups...</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {!loading && followUps.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhum follow-up registrado ainda.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          )}
          {followUps.map(item => (
            <div className="sb-table-row" key={item.id}>
              <span>
                {item.action || item.title}
                <small>{item.description ?? item.source_agent_key ?? 'Sem detalhe'}</small>
              </span>
              <span>{item.owner_label || item.owner || 'Sem responsavel'}</span>
              <span>
                <StatusPill tone={dueTone(item)}>{dateLabel(item.due_date)}</StatusPill>
                {item.next_reminder_at && (
                  <small>Lembrete {dateLabel(item.next_reminder_at)} - {item.next_reminder_channel}</small>
                )}
              </span>
              <span>
                <select
                  className="field-input sb-compact-select"
                  value={item.status}
                  onChange={(event) => void updateFollowUp(item.id, { status: event.target.value })}
                  disabled={savingId === item.id}
                >
                  {followUpStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  className="sb-inline-link mt-2 block"
                  type="button"
                  onClick={() => void requestReferral(item)}
                  disabled={referringId === item.id}
                >
                  {referringId === item.id ? 'Registrando' : 'Solicitar conexao'}
                </button>
                <button
                  className="sb-inline-link mt-2 block"
                  type="button"
                  onClick={() => void scheduleReminder(item)}
                  disabled={remindingId === item.id || item.status === 'done' || item.status === 'cancelled'}
                >
                  {remindingId === item.id ? 'Agendando' : item.scheduled_reminders_count ? 'Novo lembrete' : 'Agendar lembrete'}
                </button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
