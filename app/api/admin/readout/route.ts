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
] as const

async function tableCount(table: string) {
  const service = serviceClient()
  const { count, error } = await service
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (error) return { table, count: 0, error: error.message }
  return { table, count: count ?? 0 }
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

  return NextResponse.json({
    counts,
    recent_sessions: (sessions ?? []).map((session) => ({
      ...session,
      company_name: companiesById.get(session.company_id) ?? null,
    })),
    recent_users: users ?? [],
  })
}
