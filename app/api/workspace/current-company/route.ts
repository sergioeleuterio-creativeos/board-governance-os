import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { CURRENT_COMPANY_COOKIE } from '@/lib/shadow-board/current-company-server'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const companyId = typeof body?.company_id === 'string' ? body.company_id : ''
  if (!companyId) return NextResponse.json({ error: 'company_id is required' }, { status: 400 })

  const service = serviceClient()
  const { data: company, error: companyError } = await service
    .from('companies')
    .select('id, organization_id, name, status')
    .eq('id', companyId)
    .maybeSingle()

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })
  if (!company || company.status !== 'active') {
    return NextResponse.json({ error: 'Company not found or inactive.' }, { status: 404 })
  }

  const { data: profile, error: profileError } = await service
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  let canAccess = profile?.is_super_admin === true
  if (!canAccess) {
    const { data: companyMembership, error: companyMembershipError } = await service
      .from('company_memberships')
      .select('id')
      .eq('company_id', company.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (companyMembershipError) return NextResponse.json({ error: companyMembershipError.message }, { status: 500 })
    canAccess = !!companyMembership
  }

  if (!canAccess) {
    const { data: organizationMembership, error: organizationMembershipError } = await service
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', company.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin', 'super_admin'])
      .maybeSingle()

    if (organizationMembershipError) return NextResponse.json({ error: organizationMembershipError.message }, { status: 500 })
    canAccess = !!organizationMembership
  }

  if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const response = NextResponse.json({
    company_id: company.id,
    company_name: company.name,
  })
  response.cookies.set(CURRENT_COMPANY_COOKIE, company.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })

  return response
}
