import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['active', 'inactive', 'archived'] as const
const allowedTypes = ['distribution_partner', 'white_label', 'referral', 'internal'] as const

type RouteContext = {
  params: Promise<{ partnerId: string }>
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { partnerId } = await params
  const body = await request.json().catch(() => null)
  const updates: Record<string, unknown> = {}

  if (!partnerId) return NextResponse.json({ error: 'Partner id is required' }, { status: 400 })

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (name) {
      updates.name = name
      updates.slug = slugify(name)
    }
  }

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid partner status' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (typeof body?.type === 'string') {
    if (!allowedTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid partner type' }, { status: 400 })
    }
    updates.type = body.type
  }

  if (typeof body?.contact_name === 'string') updates.contact_name = body.contact_name.trim() || null
  if (typeof body?.contact_email === 'string') updates.contact_email = body.contact_email.trim() || null
  if (body?.white_label_settings) updates.white_label_settings = asRecord(body.white_label_settings)

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: partner, error } = await service
    .from('partner_channels')
    .update(updates)
    .eq('id', partnerId)
    .select('id, name, slug, type, contact_name, contact_email, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

  await service.from('audit_events').insert({
    actor_user_id: admin.id,
    event_type: 'partner.updated',
    entity_type: 'partner_channel',
    entity_id: partnerId,
    metadata: { updates },
  })

  return NextResponse.json({ partner })
}
