import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const allowedChannels = ['in_app', 'email', 'calendar'] as const

type RouteContext = {
  params: Promise<{ followUpId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const { followUpId } = await params
  const body = await request.json().catch(() => null)
  const channel = typeof body?.channel === 'string' && allowedChannels.includes(body.channel)
    ? body.channel
    : 'email'
  const remindAt = typeof body?.remind_at === 'string' ? body.remind_at : ''
  const remindDate = new Date(remindAt)

  if (!followUpId) {
    return NextResponse.json({ error: 'Follow-up id is required' }, { status: 400 })
  }

  if (!remindAt || Number.isNaN(remindDate.getTime())) {
    return NextResponse.json({ error: 'Data de lembrete invalida.' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: followUp, error: followUpError } = await service
    .from('follow_ups')
    .select('id, organization_id, company_id, decision_id, title, due_date')
    .eq('id', followUpId)
    .maybeSingle()

  if (followUpError) {
    return NextResponse.json({ error: followUpError.message }, { status: 500 })
  }

  if (!followUp) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  const access = await requireCompanyAdmin(followUp.company_id)
  if (isAuthError(access)) return access

  const { data: reminder, error: reminderError } = await service
    .from('reminders')
    .insert({
      organization_id: followUp.organization_id,
      company_id: followUp.company_id,
      follow_up_id: followUp.id,
      decision_id: followUp.decision_id,
      recipient_user_id: user.id,
      channel,
      remind_at: remindDate.toISOString(),
      status: 'scheduled',
    })
    .select('id, channel, remind_at, status')
    .single()

  if (reminderError) {
    return NextResponse.json({ error: reminderError.message }, { status: 500 })
  }

  await service.from('audit_events').insert({
    organization_id: followUp.organization_id,
    company_id: followUp.company_id,
    actor_user_id: user.id,
    event_type: 'follow_up.reminder_scheduled',
    entity_type: 'reminder',
    entity_id: reminder.id,
    metadata: {
      follow_up_id: followUp.id,
      decision_id: followUp.decision_id,
      channel,
      remind_at: remindDate.toISOString(),
    },
  })

  return NextResponse.json({ reminder })
}
