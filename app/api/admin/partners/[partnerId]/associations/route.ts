import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedActions = ['attach', 'detach'] as const
const allowedTargets = ['organization', 'company'] as const

type AssociationAction = typeof allowedActions[number]
type AssociationTarget = typeof allowedTargets[number]

type RouteContext = {
  params: Promise<{ partnerId: string }>
}

function isAssociationAction(value: unknown): value is AssociationAction {
  return typeof value === 'string' && allowedActions.includes(value as AssociationAction)
}

function isAssociationTarget(value: unknown): value is AssociationTarget {
  return typeof value === 'string' && allowedTargets.includes(value as AssociationTarget)
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { partnerId } = await params
  const body = await request.json().catch(() => null)
  const action = isAssociationAction(body?.action) ? body.action : null
  const targetType = isAssociationTarget(body?.target_type) ? body.target_type : null
  const targetId = typeof body?.target_id === 'string' ? body.target_id.trim() : ''

  if (!partnerId) return NextResponse.json({ error: 'Partner id is required' }, { status: 400 })
  if (!action) return NextResponse.json({ error: 'Supported action is required' }, { status: 400 })
  if (!targetType) return NextResponse.json({ error: 'Supported target type is required' }, { status: 400 })
  if (!targetId) return NextResponse.json({ error: 'Target id is required' }, { status: 400 })

  const service = serviceClient()
  const { data: partner, error: partnerError } = await service
    .from('partner_channels')
    .select('id, name, status')
    .eq('id', partnerId)
    .maybeSingle()

  if (partnerError) return NextResponse.json({ error: partnerError.message }, { status: 500 })
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

  const table = targetType === 'organization' ? 'organizations' : 'companies'
  const updateValue = action === 'attach' ? partnerId : null
  const query = service
    .from(table)
    .update({ partner_channel_id: updateValue })
    .eq('id', targetId)

  const { data: target, error } = action === 'detach'
    ? await query.eq('partner_channel_id', partnerId).select('id, name, partner_channel_id').maybeSingle()
    : await query.select('id, name, partner_channel_id').maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!target) {
    return NextResponse.json({
      error: action === 'detach'
        ? 'Target is not attached to this partner'
        : 'Target not found',
    }, { status: 404 })
  }

  const eventType = `partner.${targetType}_${action === 'attach' ? 'attached' : 'detached'}`
  await service.from('audit_events').insert({
    actor_user_id: admin.id,
    event_type: eventType,
    entity_type: targetType,
    entity_id: targetId,
    metadata: {
      partner_channel_id: partnerId,
      partner_name: partner.name,
      action,
      target_type: targetType,
      target_name: target.name,
    },
  })

  return NextResponse.json({
    association: {
      action,
      target_type: targetType,
      target,
      partner,
    },
  })
}
