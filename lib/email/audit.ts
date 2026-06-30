import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

type NotificationAuditInput = {
  service: SupabaseClient
  organizationId: string
  companyId: string
  actorUserId?: string | null
  eventType: string
  entityType: string
  entityId: string
  status: 'sent' | 'skipped' | 'failed'
  recipientCount?: number
  error?: string | null
  metadata?: Record<string, unknown>
}

export async function recordNotificationAudit({
  service,
  organizationId,
  companyId,
  actorUserId = null,
  eventType,
  entityType,
  entityId,
  status,
  recipientCount = 0,
  error = null,
  metadata = {},
}: NotificationAuditInput) {
  try {
    const { error: auditError } = await service.from('audit_events').insert({
      organization_id: organizationId,
      company_id: companyId,
      actor_user_id: actorUserId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        ...metadata,
        notification_status: status,
        recipient_count: recipientCount,
        error,
      },
    })
    if (auditError) console.error('Notification audit failed', auditError.message)
  } catch (auditError) {
    console.error('Notification audit failed', auditError)
  }
}
