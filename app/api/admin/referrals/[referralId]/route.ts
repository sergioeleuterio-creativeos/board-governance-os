import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['requested', 'triaging', 'introduced', 'closed', 'cancelled'] as const

type RouteContext = {
  params: Promise<{ referralId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { referralId } = await params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === 'string' ? body.status : ''

  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    return NextResponse.json({ error: 'Invalid referral status' }, { status: 400 })
  }

  const service = serviceClient()
  const { data, error } = await service
    .from('referral_requests')
    .update({
      status,
      fulfilled_by: ['introduced', 'closed'].includes(status) ? admin.id : null,
    })
    .eq('id', referralId)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Referral request not found' }, { status: 404 })
  }

  return NextResponse.json({ referral: data })
}
