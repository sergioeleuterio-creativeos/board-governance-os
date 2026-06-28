import 'server-only'
import { createClient } from '@supabase/supabase-js'

export type AuditEvent =
  | 'auth.login'
  | 'auth.logout'
  | 'ai.generate'
  | 'governance.run'
  | 'company.create'
  | 'company.update'

export interface AuditPayload {
  user_id?: string | null
  event: AuditEvent
  module?: string | null
  company_id?: string | null
  metadata?: Record<string, unknown>
  ip?: string | null
  user_agent?: string | null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export function auditLog(payload: AuditPayload): void {
  getServiceClient().from('audit_log').insert({
    user_id: payload.user_id ?? null,
    event: payload.event,
    module: payload.module ?? null,
    company_id: payload.company_id ?? null,
    metadata: payload.metadata ?? {},
    ip: payload.ip ?? null,
    user_agent: payload.user_agent ?? null,
  }).then(({ error }) => {
    if (error) console.error('[audit] Failed to write audit log:', error.message)
  })
}
