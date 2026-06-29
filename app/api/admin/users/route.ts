import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import type { CompanyRole, OrganizationRole } from '@/lib/shadow-board/domain'

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
  organization_id?: string | null
}

const organizationRoles: OrganizationRole[] = ['owner', 'admin', 'member', 'advisor_operator', 'partner_admin', 'super_admin']
const companyRoles: CompanyRole[] = ['founder', 'admin', 'member', 'viewer', 'advisor_operator']

function makeTemporaryPassword() {
  return `Bgo-${randomBytes(12).toString('base64url')}-${new Date().getFullYear()}!`
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
      .select('id, name, slug, organization_id')
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
    companies: companiesResult.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const organizationId = typeof body?.organization_id === 'string' ? body.organization_id : ''
  const companyId = typeof body?.company_id === 'string' ? body.company_id : ''
  const organizationRole = organizationRoles.includes(body?.organization_role)
    ? body.organization_role as OrganizationRole
    : 'member'
  const companyRole = companyRoles.includes(body?.company_role)
    ? body.company_role as CompanyRole
    : 'member'

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: existingUsers, error: existingError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email)
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists. Use invite or temporary password reset.' }, { status: 409 })
  }

  if (organizationId) {
    const { data: organization, error } = await service
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  let companyOrganizationId: string | null = null
  if (companyId) {
    const { data: company, error } = await service
      .from('companies')
      .select('id, organization_id')
      .eq('id', companyId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    companyOrganizationId = company.organization_id

    if (organizationId && company.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Company does not belong to selected organization' }, { status: 400 })
    }
  }

  const temporaryPassword = makeTemporaryPassword()
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName, name: fullName } : {},
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'Could not create user' }, { status: 500 })
  }

  const userId = created.user.id
  const profilePayload = {
    id: userId,
    email,
    full_name: fullName || null,
    locale: 'pt-BR',
    timezone: process.env.BOARD_GOVERNANCE_DEFAULT_TIMEZONE || 'America/Sao_Paulo',
    is_super_admin: organizationRole === 'super_admin',
    status: 'active',
  }

  const { error: profileError } = await service
    .from('user_profiles')
    .upsert(profilePayload, { onConflict: 'id' })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const membershipOrganizationId = organizationId || companyOrganizationId
  if (membershipOrganizationId) {
    const { error: membershipError } = await service
      .from('organization_memberships')
      .upsert({
        organization_id: membershipOrganizationId,
        user_id: userId,
        role: organizationRole,
        status: 'active',
        invited_by: admin.id,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,user_id' })
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  if (companyId) {
    const { error: companyMembershipError } = await service
      .from('company_memberships')
      .upsert({
        company_id: companyId,
        user_id: userId,
        role: companyRole,
        status: 'active',
      }, { onConflict: 'company_id,user_id' })
    if (companyMembershipError) return NextResponse.json({ error: companyMembershipError.message }, { status: 500 })
  }

  await service.from('audit_events').insert({
    organization_id: membershipOrganizationId,
    company_id: companyId || null,
    actor_user_id: admin.id,
    event_type: 'admin.user_created',
    entity_type: 'user_profile',
    entity_id: userId,
    metadata: {
      email,
      organization_id: membershipOrganizationId,
      organization_role: organizationRole,
      company_id: companyId || null,
      company_role: companyId ? companyRole : null,
    },
  })

  return NextResponse.json({
    user_id: userId,
    email,
    full_name: fullName || null,
    organization_id: membershipOrganizationId,
    organization_role: membershipOrganizationId ? organizationRole : null,
    company_id: companyId || null,
    company_role: companyId ? companyRole : null,
    temporary_password: temporaryPassword,
    expires_note: 'Share this once through a secure channel. User should change it after first login.',
  }, { status: 201 })
}
