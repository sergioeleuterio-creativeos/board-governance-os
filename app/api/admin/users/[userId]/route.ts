import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['active', 'inactive', 'archived'] as const

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { userId } = await params
  const body = await request.json().catch(() => null)

  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
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

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const service = serviceClient()
  const { data, error } = await service
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, email, full_name, is_super_admin, status, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  return NextResponse.json({ user: data })
}
