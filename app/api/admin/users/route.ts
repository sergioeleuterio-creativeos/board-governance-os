import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  locale: string
  timezone: string
  is_super_admin: boolean
  status: string
  created_at: string
  updated_at: string
}

type MembershipRow = {
  user_id: string
  organization_id?: string
  company_id?: string
  role: string
  status: string
}

type NamedRow = {
  id: string
  name: string
  slug?: string | null
}

function groupByUser<T extends { user_id: string }>(rows: T[] | null) {
  const grouped = new Map<string, T[]>()

  for (const row of rows ?? []) {
    const current = grouped.get(row.user_id) ?? []
    current.push(row)
    grouped.set(row.user_id, current)
  }

  return grouped
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: profiles, error: profileError } = await service
    .from('user_profiles')
    .select('id, email, full_name, locale, timezone, is_super_admin, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const userIds = (profiles ?? []).map((profile: ProfileRow) => profile.id)
  const [
    organizationMembershipsResult,
    companyMembershipsResult,
    organizationsResult,
    companiesResult,
    authUsersResult,
  ] = await Promise.all([
    userIds.length
      ? service
        .from('organization_memberships')
        .select('user_id, organization_id, role, status')
        .in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service
        .from('company_memberships')
        .select('user_id, company_id, role, status')
        .in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
    service
      .from('organizations')
      .select('id, name, slug')
      .order('name', { ascending: true }),
    service
      .from('companies')
      .select('id, name, slug')
      .order('name', { ascending: true }),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (organizationMembershipsResult.error) {
    return NextResponse.json({ error: organizationMembershipsResult.error.message }, { status: 500 })
  }

  if (companyMembershipsResult.error) {
    return NextResponse.json({ error: companyMembershipsResult.error.message }, { status: 500 })
  }

  if (organizationsResult.error) {
    return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  }

  if (companiesResult.error) {
    return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  }

  if (authUsersResult.error) {
    return NextResponse.json({ error: authUsersResult.error.message }, { status: 500 })
  }

  const organizationsById = new Map(
    ((organizationsResult.data ?? []) as NamedRow[]).map((organization) => [organization.id, organization])
  )
  const companiesById = new Map(
    ((companiesResult.data ?? []) as NamedRow[]).map((company) => [company.id, company])
  )
  const orgMembershipsByUser = groupByUser((organizationMembershipsResult.data ?? []) as MembershipRow[])
  const companyMembershipsByUser = groupByUser((companyMembershipsResult.data ?? []) as MembershipRow[])
  const authUsersById = new Map(authUsersResult.data.users.map((user) => [user.id, user]))

  const users = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const authUser = authUsersById.get(profile.id)
    const organization_memberships = (orgMembershipsByUser.get(profile.id) ?? []).map((membership) => ({
      organization_id: membership.organization_id ?? null,
      organization_name: membership.organization_id
        ? organizationsById.get(membership.organization_id)?.name ?? 'Organizacao sem nome'
        : null,
      role: membership.role,
      status: membership.status,
    }))
    const company_memberships = (companyMembershipsByUser.get(profile.id) ?? []).map((membership) => ({
      company_id: membership.company_id ?? null,
      company_name: membership.company_id
        ? companiesById.get(membership.company_id)?.name ?? 'Empresa sem nome'
        : null,
      role: membership.role,
      status: membership.status,
    }))

    return {
      id: profile.id,
      email: profile.email ?? authUser?.email ?? null,
      full_name: profile.full_name,
      locale: profile.locale,
      timezone: profile.timezone,
      is_super_admin: profile.is_super_admin,
      status: profile.status,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      auth_created_at: authUser?.created_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      organization_memberships,
      company_memberships,
    }
  })

  return NextResponse.json({
    users,
    organizations: organizationsResult.data ?? [],
  })
}
