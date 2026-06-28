import { NextRequest, NextResponse } from 'next/server'
import {
  isAuthError,
  requireOrganizationAdmin,
  requireSuperAdmin,
  serviceClient,
} from '@/lib/auth-server'
import type { OrganizationRole } from '@/lib/shadow-board/domain'

const allowedRoles: OrganizationRole[] = [
  'owner',
  'admin',
  'member',
  'advisor_operator',
  'partner_admin',
  'super_admin',
]

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const organizationId = typeof body?.organization_id === 'string' ? body.organization_id : ''
  const role = allowedRoles.includes(body?.role) ? body.role as OrganizationRole : 'member'

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const admin = organizationId
    ? await requireOrganizationAdmin(organizationId)
    : await requireSuperAdmin()

  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
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

  if (organizationId) {
    const { error: membershipError } = await service
      .from('organization_memberships')
      .upsert({
        organization_id: organizationId,
        user_id: data.user.id,
        role,
        status: 'active',
        invited_by: admin.id,
        invited_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,user_id' })

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    invited_user_id: data.user.id,
    email,
    organization_id: organizationId || null,
    role: organizationId ? role : null,
  })
}
