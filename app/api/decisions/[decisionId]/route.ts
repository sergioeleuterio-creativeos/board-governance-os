import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['candidate', 'approved', 'rejected', 'deferred', 'superseded', 'review_due', 'closed', 'open', 'reviewing', 'reversed'] as const
const allowedClosures = ['commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review'] as const
const actionToUpdate = {
  approve: { status: 'approved', closure_recommendation: 'commit' },
  approve_with_conditions: { status: 'approved', closure_recommendation: 'commit_with_conditions' },
  defer: { status: 'deferred', closure_recommendation: 'defer' },
  reject: { status: 'rejected', closure_recommendation: 'reject' },
  request_more_data: { status: 'reviewing', closure_recommendation: 'request_more_data' },
} as const

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
    .select('id, organization_id, company_id, metadata')
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

  const updates: Record<string, unknown> = {}
  const action = typeof body?.action === 'string' && body.action in actionToUpdate
    ? body.action as keyof typeof actionToUpdate
    : null
  const founderNote = typeof body?.founder_note === 'string' ? body.founder_note.trim() : ''

  if (action) {
    Object.assign(updates, actionToUpdate[action])
  }

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

  if (action || founderNote) {
    const metadata = existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
      ? existing.metadata as Record<string, unknown>
      : {}
    updates.metadata = {
      ...metadata,
      last_founder_action: action,
      last_founder_note: founderNote || null,
      last_founder_action_at: new Date().toISOString(),
      last_founder_action_by: user.id,
    }
  }

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

  await service.from('audit_events').insert({
    organization_id: existing.organization_id,
    company_id: existing.company_id,
    actor_user_id: user.id,
    event_type: action ? `decision.${action}` : 'decision.updated',
    entity_type: 'decision',
    entity_id: decisionId,
    metadata: {
      updates,
      founder_note: founderNote || null,
    },
  })

  return NextResponse.json({ decision: data })
}
