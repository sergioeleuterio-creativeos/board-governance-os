import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type ReferralRow = {
  id: string
  organization_id: string
  company_id: string
  follow_up_id: string | null
  recommended_by_agent_key: string | null
  requested_by: string | null
  context_summary: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

type NamedRow = {
  id: string
  name?: string
  email?: string | null
  full_name?: string | null
  title?: string | null
}

function mapById<T extends { id: string }>(rows: T[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: referrals, error: referralsError } = await service
    .from('referral_requests')
    .select('id, organization_id, company_id, follow_up_id, recommended_by_agent_key, requested_by, context_summary, status, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(100)

  if (referralsError) {
    return NextResponse.json({ error: referralsError.message }, { status: 500 })
  }

  const referralRows = (referrals ?? []) as ReferralRow[]
  const organizationIds = [...new Set(referralRows.map((row) => row.organization_id))]
  const companyIds = [...new Set(referralRows.map((row) => row.company_id))]
  const userIds = [...new Set(referralRows.map((row) => row.requested_by).filter(Boolean))] as string[]
  const followUpIds = [...new Set(referralRows.map((row) => row.follow_up_id).filter(Boolean))] as string[]

  const [organizationsResult, companiesResult, usersResult, followUpsResult] = await Promise.all([
    organizationIds.length
      ? service.from('organizations').select('id, name').in('id', organizationIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? service.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from('user_profiles').select('id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    followUpIds.length
      ? service.from('follow_ups').select('id, title').in('id', followUpIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (organizationsResult.error) return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  if (companiesResult.error) return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  if (usersResult.error) return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
  if (followUpsResult.error) return NextResponse.json({ error: followUpsResult.error.message }, { status: 500 })

  const organizationsById = mapById((organizationsResult.data ?? []) as NamedRow[])
  const companiesById = mapById((companiesResult.data ?? []) as NamedRow[])
  const usersById = mapById((usersResult.data ?? []) as NamedRow[])
  const followUpsById = mapById((followUpsResult.data ?? []) as NamedRow[])

  return NextResponse.json({
    referrals: referralRows.map((referral) => {
      const requestedBy = referral.requested_by ? usersById.get(referral.requested_by) : null
      return {
        ...referral,
        organization_name: organizationsById.get(referral.organization_id)?.name ?? 'Organizacao sem nome',
        company_name: companiesById.get(referral.company_id)?.name ?? 'Empresa sem nome',
        requested_by_name: requestedBy?.full_name ?? requestedBy?.email ?? null,
        follow_up_title: referral.follow_up_id ? followUpsById.get(referral.follow_up_id)?.title ?? null : null,
      }
    }),
  })
}
