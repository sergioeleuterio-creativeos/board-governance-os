import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type AuditEventRow = {
  id: string
  company_id: string | null
  event_type: string
  entity_type: string | null
  entity_id: string | null
  metadata: unknown
  created_at: string
}

type CompanyRow = {
  id: string
  name: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function boolValue(value: unknown) {
  return value === true ? true : value === false ? false : null
}

function aiSignalFrom(event: AuditEventRow) {
  const metadata = asRecord(event.metadata)
  const diagnostics = asRecord(metadata.ai_diagnostics)
  const usedFallback = boolValue(metadata.used_fallback)
    ?? boolValue(metadata.challenge_used_fallback)
    ?? boolValue(diagnostics.used_fallback)
    ?? false
  const fallbackReason = stringValue(metadata.fallback_reason)
    ?? stringValue(metadata.challenge_error)
    ?? stringValue(metadata.error)
    ?? stringValue(diagnostics.fallback_reason)
  const attemptedProvider = stringValue(diagnostics.attempted_provider) ?? stringValue(metadata.provider)
  const attemptedModel = stringValue(diagnostics.attempted_model) ?? stringValue(metadata.model)

  return {
    used_fallback: usedFallback,
    fallback_reason: fallbackReason,
    provider: stringValue(metadata.provider) ?? attemptedProvider,
    model: stringValue(metadata.model) ?? attemptedModel,
    attempted_provider: attemptedProvider,
    attempted_model: attemptedModel,
  }
}

function notificationSignalFrom(event: AuditEventRow) {
  const metadata = asRecord(event.metadata)
  return {
    status: stringValue(metadata.notification_status) ?? 'unknown',
    recipient_count: typeof metadata.recipient_count === 'number' ? metadata.recipient_count : 0,
    error: stringValue(metadata.error),
  }
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const observedEventTypes = [
    'governance.run_completed',
    'shadow_board.challenge_rounds_generated',
    'shadow_board.agent_deep_dive_created',
    'notification.board_pack_ready',
    'notification.session_closed',
    'notification.referral_triage',
  ]

  const { data: events, error } = await service
    .from('audit_events')
    .select('id, company_id, event_type, entity_type, entity_id, metadata, created_at')
    .in('event_type', observedEventTypes)
    .order('created_at', { ascending: false })
    .limit(120)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const eventRows = (events ?? []) as AuditEventRow[]
  const companyIds = [...new Set(eventRows.map((event) => event.company_id).filter(Boolean))] as string[]
  const { data: companies, error: companyError } = companyIds.length
    ? await service.from('companies').select('id, name').in('id', companyIds)
    : { data: [], error: null }

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

  const companiesById = new Map(((companies ?? []) as CompanyRow[]).map((company) => [company.id, company.name]))
  const aiEvents = eventRows
    .filter((event) => !event.event_type.startsWith('notification.'))
    .map((event) => ({
      ...event,
      company_name: event.company_id ? companiesById.get(event.company_id) ?? 'Empresa sem nome' : null,
      signal: aiSignalFrom(event),
    }))
  const notificationEvents = eventRows
    .filter((event) => event.event_type.startsWith('notification.'))
    .map((event) => ({
      ...event,
      company_name: event.company_id ? companiesById.get(event.company_id) ?? 'Empresa sem nome' : null,
      signal: notificationSignalFrom(event),
    }))

  return NextResponse.json({
    totals: {
      ai_events: aiEvents.length,
      ai_fallbacks: aiEvents.filter((event) => event.signal.used_fallback).length,
      ai_errors: aiEvents.filter((event) => event.signal.fallback_reason).length,
      notification_events: notificationEvents.length,
      notification_failures: notificationEvents.filter((event) => event.signal.status === 'failed').length,
    },
    ai_events: aiEvents,
    notification_events: notificationEvents,
  })
}
