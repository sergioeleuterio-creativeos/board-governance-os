import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['candidate', 'approved', 'rejected', 'deferred', 'superseded', 'review_due', 'closed', 'open', 'reviewing', 'reversed'] as const
const allowedClosures = ['commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review'] as const

type RouteContext = {
  params: Promise<{ decisionId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const { decisionId } = await params
  const body = await request.json().catch(() => null)
  const service = serviceClient()
  const { data: existing, error: existingError } = await service
    .from('decisions')
    .select('id, company_id')
    .eq('id', decisionId)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
  }

  const access = await requireCompanyAdmin(existing.company_id)
  if (isAuthError(access)) return access

  const updates: Record<string, string | null> = {}

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    updates.status = body.status
  }

  if (typeof body?.closure_recommendation === 'string') {
    if (body.closure_recommendation && !allowedClosures.includes(body.closure_recommendation)) {
      return NextResponse.json({ error: 'Invalid closure recommendation' }, { status: 400 })
    }

    updates.closure_recommendation = body.closure_recommendation || null
  }

  if (typeof body?.owner_label === 'string') updates.owner_label = body.owner_label.trim() || null
  if (typeof body?.review_date === 'string') updates.review_date = body.review_date.trim() || null

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const { data, error } = await service
    .from('decisions')
    .update(updates)
    .eq('id', decisionId)
    .select('id, title, status, closure_recommendation, owner_label, review_date, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ decision: data })
}
