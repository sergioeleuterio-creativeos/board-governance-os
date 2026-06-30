'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type AIOpsEvent = {
  id: string
  company_name: string | null
  event_type: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
  signal: {
    used_fallback?: boolean
    fallback_reason?: string | null
    provider?: string | null
    model?: string | null
    attempted_provider?: string | null
    attempted_model?: string | null
  }
}

type NotificationEvent = {
  id: string
  company_name: string | null
  event_type: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
  signal: {
    status: string
    recipient_count: number
    error?: string | null
  }
}

type AIOpsResponse = {
  totals: {
    ai_events: number
    ai_fallbacks: number
    ai_errors: number
    notification_events: number
    notification_failures: number
  }
  ai_events: AIOpsEvent[]
  notification_events: NotificationEvent[]
}

type AIHealthResponse = {
  provider: string
  ok: boolean
  results: Array<{
    provider: string
    model: string
    purposes: string[]
    ok: boolean
    label?: string
    error?: string
  }>
  error?: string
}

type ErrorResponse = {
  error?: string
}

function isAIOpsResponse(payload: AIOpsResponse | ErrorResponse | null): payload is AIOpsResponse {
  return !!payload && 'ai_events' in payload && 'notification_events' in payload
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    'governance.run_completed': 'Rodada de governanca',
    'shadow_board.challenge_rounds_generated': 'Desafios entre advisors',
    'shadow_board.agent_deep_dive_created': 'Aprofundamento de advisor',
    'ai.health_check': 'Teste de IA',
    'notification.board_pack_ready': 'Email: board pack pronto',
    'notification.session_closed': 'Email: sessao encerrada',
    'notification.referral_triage': 'Email: triagem de conexao',
  }
  return labels[type] ?? type
}

function providerLabel(event: AIOpsEvent) {
  const provider = event.signal.provider ?? event.signal.attempted_provider ?? 'sem provedor'
  const model = event.signal.model ?? event.signal.attempted_model ?? 'sem modelo'
  return `${provider} - ${model}`
}

function notificationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    sent: 'enviado',
    failed: 'falhou',
    skipped: 'nao enviado',
  }
  return labels[status] ?? status
}

export function AdminAIClient() {
  const [readout, setReadout] = useState<AIOpsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [healthNotice, setHealthNotice] = useState('')

  const metrics = useMemo(() => {
    const totals = readout?.totals
    return [
      ['Chamadas observadas', String(totals?.ai_events ?? 0), 'rodadas, desafios e deep dives'],
      ['Contingencias', String(totals?.ai_fallbacks ?? 0), 'resposta deterministica usada'],
      ['Erros de IA', String(totals?.ai_errors ?? 0), 'exigem inspecao'],
      ['Falhas de email', String(totals?.notification_failures ?? 0), 'notificacoes nao entregues'],
    ] as const
  }, [readout])

  async function loadAIOps() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/ai', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as AIOpsResponse | ErrorResponse | null

    if (!response.ok || !isAIOpsResponse(payload)) {
      const message = payload && 'error' in payload ? payload.error : undefined
      setError(message ?? 'Nao foi possivel carregar operacao de IA.')
      setLoading(false)
      return
    }

    setReadout(payload)
    setLoading(false)
  }

  async function runHealthCheck() {
    setChecking(true)
    setError('')
    setHealthNotice('')

    const response = await fetch('/api/admin/ai/health', { method: 'POST' })
    const payload = await response.json().catch(() => null) as AIHealthResponse | null
    const passed = response.ok && payload?.ok === true

    if (!payload) {
      setError('Nao foi possivel testar a IA.')
    } else {
      const models = payload.results?.map((result) => result.model).filter(Boolean).join(', ') || 'sem modelo'
      setHealthNotice(passed
        ? `IA ativa: ${payload.provider} (${models}).`
        : `Teste de IA falhou: ${payload.results?.find((result) => !result.ok)?.error ?? payload.error ?? 'erro desconhecido'}.`
      )
    }

    setChecking(false)
    await loadAIOps()
  }

  useEffect(() => {
    void loadAIOps()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="IA e notificacoes"
        description="Contingencias, erros de modelo e emails operacionais em um so painel."
        action={(
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => void runHealthCheck()} disabled={checking}>
              {checking ? 'Testando...' : 'Testar IA'}
            </button>
            <button className="btn-secondary" type="button" onClick={() => void loadAIOps()}>Atualizar</button>
          </div>
        )}
      />

      {error && <Panel><p className="sb-error">{error}</p></Panel>}
      {healthNotice && <Panel><p className="sb-code">{healthNotice}</p></Panel>}

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
        <SectionTitle label="Eventos de IA" />
        <div className="space-y-3">
          {(readout?.ai_events ?? []).slice(0, 40).map((event) => (
            <article key={event.id} className="sb-row-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="sb-code">{event.company_name ?? 'sem empresa'} - {dateLabel(event.created_at)}</p>
                  <h3 className="sb-row-title">{eventLabel(event.event_type)}</h3>
                  <p className="sb-muted mt-1">{providerLabel(event)}</p>
                  {event.signal.fallback_reason && <p className="sb-error mt-2">{event.signal.fallback_reason}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={event.signal.used_fallback ? 'caution' : 'positive'}>
                    {event.signal.used_fallback ? 'contingencia' : 'modelo ativo'}
                  </StatusPill>
                  {event.entity_type && <StatusPill>{event.entity_type}</StatusPill>}
                </div>
              </div>
            </article>
          ))}
          {!loading && !(readout?.ai_events ?? []).length && <p className="sb-muted">Nenhum evento de IA encontrado.</p>}
        </div>
      </Panel>

      <Panel>
        <SectionTitle label="Notificacoes operacionais" />
        <div className="space-y-3">
          {(readout?.notification_events ?? []).slice(0, 40).map((event) => (
            <article key={event.id} className="sb-row-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="sb-code">{event.company_name ?? 'sem empresa'} - {dateLabel(event.created_at)}</p>
                  <h3 className="sb-row-title">{eventLabel(event.event_type)}</h3>
                  <p className="sb-muted mt-1">{event.signal.recipient_count} destinatarios</p>
                  {event.signal.error && <p className="sb-error mt-2">{event.signal.error}</p>}
                </div>
                <StatusPill tone={event.signal.status === 'sent' ? 'positive' : event.signal.status === 'failed' ? 'critical' : 'neutral'}>
                  {notificationStatusLabel(event.signal.status)}
                </StatusPill>
              </div>
            </article>
          ))}
          {!loading && !(readout?.notification_events ?? []).length && <p className="sb-muted">Nenhuma notificacao operacional registrada.</p>}
        </div>
      </Panel>
    </div>
  )
}
