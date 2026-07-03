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
  creative_os: {
    mode: 'mock' | 'http' | 'worker'
    syncEnabled: boolean
    timeoutMs: number
    httpConfigured: boolean
    baseUrlConfigured: boolean
    apiKeyConfigured: boolean
    missing: string[]
    status: string
    sourceOfTruth: string
    boundary: string
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
    'notification.session_closed': 'Email: sessão encerrada',
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
    skipped: 'não enviado',
  }
  return labels[status] ?? status
}

function creativeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    fallback_local: 'Fallback local',
    worker_reserved: 'Worker reservado',
    needs_configuration: 'Precisa configuração',
    ready_capability_only: 'HTTP pronto, sem sync',
    ready_with_company_sync: 'HTTP pronto com sync',
  }
  return labels[status] ?? status
}

function creativeTone(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (status === 'ready_with_company_sync' || status === 'ready_capability_only') return 'positive'
  if (status === 'needs_configuration') return 'critical'
  if (status === 'worker_reserved') return 'caution'
  return 'neutral'
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
      ['Falhas de email', String(totals?.notification_failures ?? 0), 'notificações não entregues'],
    ] as const
  }, [readout])

  async function loadAIOps() {
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/ai', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as AIOpsResponse | ErrorResponse | null

    if (!response.ok || !isAIOpsResponse(payload)) {
      const message = payload && 'error' in payload ? payload.error : undefined
      setError(message ?? 'Não foi possível carregar operação de IA.')
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
      setError('Não foi possível testar a IA.')
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
        eyebrow="Operações"
        title="IA, Creative OS e notificações"
        description="Contingências, erros de modelo, conector Creative OS e emails operacionais em um só painel."
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

      <Panel>
        <SectionTitle label="Creative OS Connector" />
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={creativeTone(readout?.creative_os?.status ?? 'fallback_local')}>
                {creativeStatusLabel(readout?.creative_os?.status ?? 'fallback_local')}
              </StatusPill>
              <StatusPill>{readout?.creative_os?.mode ?? 'mock'}</StatusPill>
              <StatusPill tone={readout?.creative_os?.syncEnabled ? 'positive' : 'neutral'}>
                {readout?.creative_os?.syncEnabled ? 'sync ligado' : 'sync desligado'}
              </StatusPill>
            </div>
            <p className="sb-muted mt-3">
              {readout?.creative_os?.boundary ?? 'Board OS permanece como fonte de verdade; Creative OS entra como camada de enriquecimento.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="sb-row-card">
              <p className="sb-code">URL</p>
              <p className="font-semibold">{readout?.creative_os?.baseUrlConfigured ? 'configurada' : 'ausente'}</p>
            </article>
            <article className="sb-row-card">
              <p className="sb-code">API key</p>
              <p className="font-semibold">{readout?.creative_os?.apiKeyConfigured ? 'configurada' : 'ausente'}</p>
            </article>
            <article className="sb-row-card">
              <p className="sb-code">Timeout</p>
              <p className="font-semibold">{readout?.creative_os?.timeoutMs ?? 45000} ms</p>
            </article>
          </div>
        </div>
        {!!readout?.creative_os?.missing.length && (
          <p className="sb-error mt-4">
            Para QA HTTP, configurar: {readout.creative_os.missing.join(', ')}.
          </p>
        )}
        {readout?.creative_os?.status === 'ready_capability_only' && (
          <p className="sb-muted mt-4">
            Capabilities podem ser chamadas, mas empresas criadas no Board OS ainda não serão refletidas no Creative OS enquanto `CREATIVE_OS_SYNC_ENABLED` estiver desligado.
          </p>
        )}
      </Panel>

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
                    {event.signal.used_fallback ? 'contingência' : 'modelo ativo'}
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
        <SectionTitle label="Notificações operacionais" />
        <div className="space-y-3">
          {(readout?.notification_events ?? []).slice(0, 40).map((event) => (
            <article key={event.id} className="sb-row-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="sb-code">{event.company_name ?? 'sem empresa'} - {dateLabel(event.created_at)}</p>
                  <h3 className="sb-row-title">{eventLabel(event.event_type)}</h3>
                  <p className="sb-muted mt-1">{event.signal.recipient_count} destinatários</p>
                  {event.signal.error && <p className="sb-error mt-2">{event.signal.error}</p>}
                </div>
                <StatusPill tone={event.signal.status === 'sent' ? 'positive' : event.signal.status === 'failed' ? 'critical' : 'neutral'}>
                  {notificationStatusLabel(event.signal.status)}
                </StatusPill>
              </div>
            </article>
          ))}
          {!loading && !(readout?.notification_events ?? []).length && <p className="sb-muted">Nenhuma notificação operacional registrada.</p>}
        </div>
      </Panel>
    </div>
  )
}
