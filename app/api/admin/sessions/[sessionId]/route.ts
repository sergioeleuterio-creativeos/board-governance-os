import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['draft', 'open', 'in_review', 'awaiting_founder', 'closed', 'expired', 'cancelled'] as const
const allowedClosures = [
  'commit',
  'commit_with_conditions',
  'defer',
  'reject',
  'request_more_data',
  'escalate_human_review',
] as const

type RouteContext = {
  params: Promise<{ sessionId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { sessionId } = await params
  const body = await request.json().catch(() => null)

  if (!sessionId) {
    return NextResponse.json({ error: 'Session id is required' }, { status: 400 })
  }

  const updates: Record<string, string | number | null> = {}

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    updates.status = body.status
    if (body.status === 'closed') updates.closed_at = new Date().toISOString()
    if (body.status === 'open') updates.opened_at = new Date().toISOString()
  }

  if (typeof body?.closure_recommendation === 'string') {
    if (body.closure_recommendation && !allowedClosures.includes(body.closure_recommendation)) {
      return NextResponse.json({ error: 'Invalid closure recommendation' }, { status: 400 })
    }

    updates.closure_recommendation = body.closure_recommendation || null
  }

  if (typeof body?.closure_summary === 'string') {
    updates.closure_summary = body.closure_summary.trim() || null
  }

  if (typeof body?.usage_units_consumed === 'number' && Number.isFinite(body.usage_units_consumed)) {
    updates.usage_units_consumed = Math.max(0, Math.round(body.usage_units_consumed))
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const service = serviceClient()
  const { data, error } = await service
    .from('board_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select('id, status, closure_recommendation, closure_summary, usage_units_consumed, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Board session not found' }, { status: 404 })
  }

  return NextResponse.json({ session: data })
}
