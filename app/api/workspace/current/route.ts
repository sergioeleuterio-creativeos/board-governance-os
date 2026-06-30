import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { ensureUserWorkspace } from '@/lib/shadow-board/bootstrap'

type OrganizationMembershipRow = {
  organization_id: string
  role: string
}

type CompanyMembershipRow = {
  company_id: string
  role: string
}

type CompanyRow = {
  id: string
  organization_id: string
  name: string
  slug: string
  status: string
  industry: string | null
  stage: string | null
  revenue_range: string | null
  default_locale: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

function preferOperationalCompany(companies: CompanyRow[]) {
  return companies.find((company) => company.metadata?.training_pack !== true) ?? companies[0] ?? null
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const bootstrap = await ensureUserWorkspace(user)
  const service = serviceClient()
  const { data: profile, error: profileError } = await service
    .from('user_profiles')
    .select('id, email, full_name, is_super_admin, status, locale, timezone')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { data: organizationMemberships, error: membershipError } = await service
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  const primaryOrganizationId = ((organizationMemberships ?? []) as OrganizationMembershipRow[])[0]?.organization_id
    ?? bootstrap.organization?.id
  const { data: organization, error: organizationError } = primaryOrganizationId
    ? await service
      .from('organizations')
      .select('id, name, slug, default_locale, status, owner_user_id')
      .eq('id', primaryOrganizationId)
      .maybeSingle()
    : { data: null, error: null }

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 })
  }

  const { data: companyMemberships, error: companyMembershipError } = await service
    .from('company_memberships')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (companyMembershipError) {
    return NextResponse.json({ error: companyMembershipError.message }, { status: 500 })
  }

  const directCompanyIds = ((companyMemberships ?? []) as CompanyMembershipRow[]).map((membership) => membership.company_id)
  const directCompanies = directCompanyIds.length
    ? await service
      .from('companies')
      .select('id, organization_id, name, slug, status, industry, stage, revenue_range, default_locale, created_at, metadata')
      .in('id', directCompanyIds)
    : { data: [], error: null }

  if (directCompanies.error) {
    return NextResponse.json({ error: directCompanies.error.message }, { status: 500 })
  }

  const companiesById = new Map(((directCompanies.data ?? []) as CompanyRow[]).map((company) => [company.id, company]))
  const directCompany = preferOperationalCompany(directCompanyIds.map((id) => companiesById.get(id)).filter(Boolean) as CompanyRow[])

  const fallbackCompany = !directCompany && primaryOrganizationId
    ? await service
      .from('companies')
      .select('id, organization_id, name, slug, status, industry, stage, revenue_range, default_locale, created_at, metadata')
      .eq('organization_id', primaryOrganizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)
    : { data: [], error: null }

  if (fallbackCompany.error) {
    return NextResponse.json({ error: fallbackCompany.error.message }, { status: 500 })
  }

  const company = (directCompany ?? preferOperationalCompany((fallbackCompany.data ?? []) as CompanyRow[])) as CompanyRow | null
  const latestSession = company
    ? await service
      .from('board_sessions')
      .select('id, status, session_type, opened_at, expires_at, closed_at, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null }

  if (latestSession.error) {
    return NextResponse.json({ error: latestSession.error.message }, { status: 500 })
  }

  return NextResponse.json({
    profile,
    organization,
    organization_memberships: organizationMemberships ?? [],
    company,
    company_role: ((companyMemberships ?? []) as CompanyMembershipRow[]).find((membership) => membership.company_id === company?.id)?.role ?? null,
    latest_session: latestSession.data ?? null,
  })
}
