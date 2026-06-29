import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['open', 'in_progress', 'done', 'blocked', 'cancelled'] as const
const allowedPriorities = ['low', 'medium', 'high', 'urgent'] as const

type RouteContext = {
  params: Promise<{ followUpId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const { followUpId } = await params
  const body = await request.json().catch(() => null)
  const service = serviceClient()
  const { data: existing, error: existingError } = await service
    .from('follow_ups')
    .select('id, company_id')
    .eq('id', followUpId)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  const access = await requireCompanyAdmin(existing.company_id)
  if (isAuthError(access)) return access

  const updates: Record<string, string | null> = {}

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    updates.status = body.status
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null
  }

  if (typeof body?.priority === 'string') {
    if (!allowedPriorities.includes(body.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    updates.priority = body.priority
  }

  if (typeof body?.owner_label === 'string') updates.owner_label = body.owner_label.trim() || null
  if (typeof body?.due_date === 'string') updates.due_date = body.due_date.trim() || null

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const { data, error } = await service
    .from('follow_ups')
    .update(updates)
    .eq('id', followUpId)
    .select('id, title, status, priority, due_date, completed_at, owner_label, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ follow_up: data })
}
