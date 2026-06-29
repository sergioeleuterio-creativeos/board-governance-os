'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader, Panel, SectionTitle, StatusPill } from './ui'

type AuditEvent = {
  id: string
  created_at: string
  organization_name: string | null
  company_name: string | null
  actor_label: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  metadata: unknown
}

type AuditResponse = {
  events: AuditEvent[]
}

type ErrorResponse = {
  error?: string
}

function isAuditResponse(payload: AuditResponse | ErrorResponse | null): payload is AuditResponse {
  return !!payload && 'events' in payload
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function eventTone(eventType: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (/(failed|error|rejected|cancelled)/i.test(eventType)) return 'critical'
  if (/(created|sent|approved|closed|completed)/i.test(eventType)) return 'positive'
  if (/(updated|scheduled|generated|requested)/i.test(eventType)) return 'caution'
  return 'neutral'
}

function metadataPreview(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 0).slice(0, 240)
  } catch {
    return 'metadata indisponivel'
  }
}

export function AdminAuditClient() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [eventFilter, setEventFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const grouped = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) counts.set(event.event_type, (counts.get(event.event_type) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [events])

  async function loadEvents() {
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (eventFilter.trim()) params.set('event_type', eventFilter.trim())
    if (entityFilter.trim()) params.set('entity_type', entityFilter.trim())

    const response = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as AuditResponse | ErrorResponse | null

    if (!response.ok || !isAuditResponse(payload)) {
      const errorMessage = payload && 'error' in payload ? payload.error : undefined
      setError(errorMessage ?? 'Nao foi possivel carregar eventos.')
      setLoading(false)
      return
    }

    setEvents(payload.events)
    setLoading(false)
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacoes"
        title="Audit trail"
        description="Historico operacional de sessoes, documentos, decisoes, notificacoes, usuarios e billing."
        action={<button className="btn-secondary" type="button" onClick={() => void loadEvents()}>Atualizar</button>}
      />

      {error && (
        <Panel>
          <p className="sb-error">{error}</p>
        </Panel>
      )}

      <Panel>
        <SectionTitle label="Filtros" />
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="field-label">Evento</span>
            <input className="field-input" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} placeholder="decision, reminder, shadow_board..." />
          </label>
          <label>
            <span className="field-label">Entidade</span>
            <input className="field-input" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} placeholder="decision, reminder, board_session..." />
          </label>
          <button className="btn-primary self-end" type="button" onClick={() => void loadEvents()}>Filtrar</button>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {grouped.map(([eventType, count]) => (
          <Panel key={eventType}>
            <p className="sb-code">{eventType}</p>
            <p className="sb-big-number">{count}</p>
          </Panel>
        ))}
        {!grouped.length && <Panel><p className="sb-muted">Sem eventos carregados.</p></Panel>}
      </section>

      <Panel>
        <SectionTitle label="Eventos recentes" />
        <div className="sb-table">
          <div className="sb-table-head">
            <span>Evento</span>
            <span>Contexto</span>
            <span>Ator</span>
            <span>Metadata</span>
          </div>
          {loading && (
            <div className="sb-table-row">
              <span>Carregando...</span><span>-</span><span>-</span><span>-</span>
            </div>
          )}
          {!loading && events.length === 0 && (
            <div className="sb-table-row">
              <span>Nenhum evento encontrado.</span><span>-</span><span>-</span><span>-</span>
            </div>
          )}
          {events.map((event) => (
            <div className="sb-table-row" key={event.id}>
              <span>
                <StatusPill tone={eventTone(event.event_type)}>{event.event_type}</StatusPill>
                <small>{dateLabel(event.created_at)}</small>
              </span>
              <span>
                {event.company_name ?? event.organization_name ?? 'Sistema'}
                <small>{event.entity_type ?? 'sem entidade'} {event.entity_id ? `- ${event.entity_id.slice(0, 8)}` : ''}</small>
              </span>
              <span>{event.actor_label}</span>
              <span><small>{metadataPreview(event.metadata)}</small></span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
