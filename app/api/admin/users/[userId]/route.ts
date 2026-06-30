import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import type { CompanyRole } from '@/lib/shadow-board/domain'

const allowedStatuses = ['active', 'inactive', 'archived'] as const
const allowedCompanyRoles: CompanyRole[] = ['founder', 'admin', 'member', 'viewer', 'advisor_operator']

type RouteContext = {
  params: Promise<{ userId: string }>
}

type CompanySelectionRow = {
  id: string
  organization_id: string
}

type OrganizationMembershipRow = {
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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { userId } = await params
  const body = await request.json().catch(() => null)
  const hasCompanyAccessUpdate = Array.isArray(body?.company_ids) || typeof body?.company_id === 'string'
  const companyIds = hasCompanyAccessUpdate ? selectedCompanyIds(body) : []
  const companyRole = allowedCompanyRoles.includes(body?.company_role)
    ? body.company_role as CompanyRole
    : 'viewer'

  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  if (hasCompanyAccessUpdate && !companyIds.length) {
    return NextResponse.json({ error: 'At least one company is required' }, { status: 400 })
  }

  const updates: Record<string, string | boolean | null> = {}

  if (typeof body?.full_name === 'string') {
    const fullName = body.full_name.trim()
    updates.full_name = fullName || null
  }

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    updates.status = body.status
  }

  if (typeof body?.is_super_admin === 'boolean') {
    if (userId === admin.id && body.is_super_admin === false) {
      return NextResponse.json({ error: 'You cannot remove your own super admin access' }, { status: 400 })
    }

    updates.is_super_admin = body.is_super_admin
  }

  if (!Object.keys(updates).length && !hasCompanyAccessUpdate) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const service = serviceClient()
  const profileSelect = 'id, email, full_name, is_super_admin, status, updated_at'
  const profileResult = Object.keys(updates).length
    ? await service
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select(profileSelect)
      .maybeSingle()
    : await service
      .from('user_profiles')
      .select(profileSelect)
      .eq('id', userId)
      .maybeSingle()

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 })
  }

  if (!profileResult.data) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  if (hasCompanyAccessUpdate) {
    const { data: selectedCompanies, error: companiesError } = await service
      .from('companies')
      .select('id, organization_id')
      .in('id', companyIds)

    if (companiesError) return NextResponse.json({ error: companiesError.message }, { status: 500 })

    const typedCompanies = (selectedCompanies ?? []) as CompanySelectionRow[]
    if (typedCompanies.length !== companyIds.length) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const organizationIds = uniqueStrings(typedCompanies.map((company) => company.organization_id))
    const { data: existingOrgMemberships, error: existingOrgMembershipsError } = await service
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId)
      .in('organization_id', organizationIds)

    if (existingOrgMembershipsError) {
      return NextResponse.json({ error: existingOrgMembershipsError.message }, { status: 500 })
    }

    const existingOrganizationIds = new Set(
      ((existingOrgMemberships ?? []) as OrganizationMembershipRow[]).map((membership) => membership.organization_id)
    )
    const missingOrganizationIds = organizationIds.filter((organizationId) => !existingOrganizationIds.has(organizationId))

    if (missingOrganizationIds.length) {
      const { error: orgMembershipError } = await service
        .from('organization_memberships')
        .insert(missingOrganizationIds.map((organizationId) => ({
          organization_id: organizationId,
          user_id: userId,
          role: 'member',
          status: 'active',
          invited_by: admin.id,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })))

      if (orgMembershipError) {
        return NextResponse.json({ error: orgMembershipError.message }, { status: 500 })
      }
    }

    const { error: deleteCompanyMembershipsError } = await service
      .from('company_memberships')
      .delete()
      .eq('user_id', userId)

    if (deleteCompanyMembershipsError) {
      return NextResponse.json({ error: deleteCompanyMembershipsError.message }, { status: 500 })
    }

    const { error: companyMembershipError } = await service
      .from('company_memberships')
      .insert(companyIds.map((companyId) => ({
        company_id: companyId,
        user_id: userId,
        role: companyRole,
        status: 'active',
      })))

    if (companyMembershipError) {
      return NextResponse.json({ error: companyMembershipError.message }, { status: 500 })
    }

    await service.from('audit_events').insert({
      organization_id: organizationIds[0] ?? null,
      company_id: companyIds[0] ?? null,
      actor_user_id: admin.id,
      event_type: 'admin.user_access_updated',
      entity_type: 'user_profile',
      entity_id: userId,
      metadata: {
        company_ids: companyIds,
        company_role: companyRole,
      },
    })
  }

  return NextResponse.json({
    user: profileResult.data,
    company_ids: hasCompanyAccessUpdate ? companyIds : undefined,
    company_role: hasCompanyAccessUpdate ? companyRole : undefined,
  })
}
