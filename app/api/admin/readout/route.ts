import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const countTables = [
  'organizations',
  'companies',
  'user_profiles',
  'organization_memberships',
  'board_sessions',
  'uploaded_documents',
  'decisions',
  'follow_ups',
  'referral_requests',
  'reminders',
  'subscriptions',
  'usage_packages',
] as const

async function tableCount(table: string) {
  const service = serviceClient()
  const { count, error } = await service
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (error) return { table, count: 0, error: error.message }
  return { table, count: count ?? 0 }
}

async function scopedCount(
  table: string,
  apply?: (query: any) => any
) {
  const service = serviceClient()
  let query = service
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (apply) {
    query = apply(query)
  }

  const { count, error } = await query
  return { count: count ?? 0, error: error?.message ?? null }
}

export async function GET() {
  const user = await requireSuperAdmin()
  if (isAuthError(user)) return user

  const counts = await Promise.all(countTables.map(tableCount))
  const service = serviceClient()

  const { data: sessions } = await service
    .from('board_sessions')
    .select('id, status, session_type, closure_recommendation, created_at, company_id')
    .order('created_at', { ascending: false })
    .limit(10)

  const companyIds = [...new Set((sessions ?? []).map((session) => session.company_id).filter(Boolean))]
  const { data: companies } = companyIds.length
    ? await service
      .from('companies')
      .select('id, name')
      .in('id', companyIds)
    : { data: [] }

  const companiesById = new Map((companies ?? []).map((company) => [company.id, company.name]))

  const { data: users } = await service
    .from('user_profiles')
    .select('id, email, full_name, is_super_admin, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const now = new Date().toISOString()
  const [
    openSessions,
    dueReminders,
    failedReminders,
    pendingDocuments,
    failedDocuments,
    activeSubscriptions,
    activeUsagePackages,
  ] = await Promise.all([
    scopedCount('board_sessions', (query) => query.in('status', ['open', 'in_review', 'awaiting_founder'])),
    scopedCount('reminders', (query) => query.eq('status', 'scheduled').lte('remind_at', now)),
    scopedCount('reminders', (query) => query.eq('status', 'failed')),
    scopedCount('uploaded_documents', (query) => query.in('status', ['uploaded', 'processing'])),
    scopedCount('uploaded_documents', (query) => query.eq('status', 'failed')),
    scopedCount('subscriptions', (query) => query.in('status', ['trialing', 'active', 'past_due'])),
    scopedCount('usage_packages', (query) => query.eq('status', 'active')),
  ])

  return NextResponse.json({
    counts,
    operational_queues: {
      open_sessions: openSessions.count,
      due_reminders: dueReminders.count,
      failed_reminders: failedReminders.count,
      pending_documents: pendingDocuments.count,
      failed_documents: failedDocuments.count,
      active_subscriptions: activeSubscriptions.count,
      active_usage_packages: activeUsagePackages.count,
      errors: [
        openSessions.error,
        dueReminders.error,
        failedReminders.error,
        pendingDocuments.error,
        failedDocuments.error,
        activeSubscriptions.error,
        activeUsagePackages.error,
      ].filter(Boolean),
    },
    recent_sessions: (sessions ?? []).map((session) => ({
      ...session,
      company_name: companiesById.get(session.company_id) ?? null,
    })),
    recent_users: users ?? [],
  })
}
