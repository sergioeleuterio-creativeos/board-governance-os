import { NextRequest, NextResponse } from 'next/server'
import {
  isAuthError,
  requireOrganizationAdmin,
  requireSuperAdmin,
  serviceClient,
} from '@/lib/auth-server'
import type { CompanyRole, OrganizationRole } from '@/lib/shadow-board/domain'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

const allowedRoles: OrganizationRole[] = [
  'owner',
  'admin',
  'member',
  'advisor_operator',
  'partner_admin',
  'super_admin',
]
const allowedCompanyRoles: CompanyRole[] = ['founder', 'admin', 'member', 'viewer', 'advisor_operator']

type CompanySelectionRow = {
  id: string
  organization_id: string
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())))]
}

function selectedCompanyIds(body: unknown) {
  const payload = body as { company_ids?: unknown; company_id?: unknown } | null
  const ids = Array.isArray(payload?.company_ids)
    ? payload.company_ids
    : typeof payload?.company_id === 'string'
      ? [payload.company_id]
      : []

  return uniqueStrings(ids)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const organizationId = typeof body?.organization_id === 'string' ? body.organization_id : ''
  const companyIds = selectedCompanyIds(body)
  const role = allowedRoles.includes(body?.role) ? body.role as OrganizationRole : 'member'
  const companyRole = allowedCompanyRoles.includes(body?.company_role) ? body.company_role as CompanyRole : 'viewer'

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  if (!companyIds.length) {
    return NextResponse.json({ error: 'At least one company is required' }, { status: 400 })
  }

  const admin = organizationId
    ? await requireOrganizationAdmin(organizationId)
    : await requireSuperAdmin()

  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: selectedCompanies, error: companyError } = await service
      .from('companies')
      .select('id, organization_id')
      .in('id', companyIds)

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

  const typedCompanies = (selectedCompanies ?? []) as CompanySelectionRow[]
  if (typedCompanies.length !== companyIds.length) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (organizationId) {
    const outsideOrganization = typedCompanies.some((company) => company.organization_id !== organizationId)
    if (outsideOrganization) {
      return NextResponse.json({ error: 'Company does not belong to selected organization' }, { status: 400 })
    }
  }

  const organizationIds = organizationId
    ? [organizationId]
    : uniqueStrings(typedCompanies.map((company) => company.organization_id))

  const appUrl = getPublicAppUrl()
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Failed to invite user' }, { status: 500 })
  }

  const { error: profileError } = await service
    .from('user_profiles')
    .upsert({
      id: data.user.id,
      email,
      locale: 'pt-BR',
      timezone: process.env.BOARD_GOVERNANCE_DEFAULT_TIMEZONE || 'America/Sao_Paulo',
      status: 'active',
    }, { onConflict: 'id' })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (organizationIds.length) {
    const { error: membershipError } = await service
      .from('organization_memberships')
      .upsert(organizationIds.map((membershipOrganizationId) => ({
        organization_id: membershipOrganizationId,
        user_id: data.user.id,
        role,
        status: 'active',
        invited_by: admin.id,
        invited_at: new Date().toISOString(),
      })), { onConflict: 'organization_id,user_id' })

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }
  }

  if (companyIds.length) {
    const { error: companyMembershipError } = await service
      .from('company_memberships')
      .upsert(companyIds.map((companyId) => ({
        company_id: companyId,
        user_id: data.user.id,
        role: companyRole,
        status: 'active',
      })), { onConflict: 'company_id,user_id' })

    if (companyMembershipError) {
      return NextResponse.json({ error: companyMembershipError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    invited_user_id: data.user.id,
    email,
    organization_ids: organizationIds,
    role: organizationIds.length ? role : null,
    company_ids: companyIds,
    company_role: companyRole,
  })
}
