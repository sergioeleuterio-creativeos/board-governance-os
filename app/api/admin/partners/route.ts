import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

const allowedTypes = ['distribution_partner', 'white_label', 'referral', 'internal'] as const

type PartnerRow = {
  id: string
  organization_id: string | null
  name: string
  slug: string
  type: string
  contact_name: string | null
  contact_email: string | null
  status: string
  white_label_settings: unknown
  metadata: unknown
  created_at: string
  updated_at: string
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

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: partners, error } = await service
    .from('partner_channels')
    .select('id, organization_id, name, slug, type, contact_name, contact_email, status, white_label_settings, metadata, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const partnerRows = (partners ?? []) as PartnerRow[]
  const partnerIds = partnerRows.map((partner) => partner.id)
  const [organizationsResult, companiesResult, referralsResult] = await Promise.all([
    partnerIds.length
      ? service.from('organizations').select('id, partner_channel_id').in('partner_channel_id', partnerIds)
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length
      ? service.from('companies').select('id, partner_channel_id').in('partner_channel_id', partnerIds)
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length
      ? service.from('referral_requests').select('id, partner_channel_id, status').in('partner_channel_id', partnerIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (organizationsResult.error) return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  if (companiesResult.error) return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  if (referralsResult.error) return NextResponse.json({ error: referralsResult.error.message }, { status: 500 })

  const countByPartner = (rows: Array<{ partner_channel_id: string | null }>) => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      if (!row.partner_channel_id) continue
      counts.set(row.partner_channel_id, (counts.get(row.partner_channel_id) ?? 0) + 1)
    }
    return counts
  }

  const orgCounts = countByPartner((organizationsResult.data ?? []) as Array<{ partner_channel_id: string | null }>)
  const companyCounts = countByPartner((companiesResult.data ?? []) as Array<{ partner_channel_id: string | null }>)
  const referralCounts = countByPartner((referralsResult.data ?? []) as Array<{ partner_channel_id: string | null }>)

  return NextResponse.json({
    partners: partnerRows.map((partner) => ({
      ...partner,
      organization_count: orgCounts.get(partner.id) ?? 0,
      company_count: companyCounts.get(partner.id) ?? 0,
      referral_count: referralCounts.get(partner.id) ?? 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const type = typeof body?.type === 'string' && allowedTypes.includes(body.type)
    ? body.type
    : 'distribution_partner'
  const contactName = typeof body?.contact_name === 'string' ? body.contact_name.trim() || null : null
  const contactEmail = typeof body?.contact_email === 'string' ? body.contact_email.trim() || null : null

  if (!name) {
    return NextResponse.json({ error: 'Partner name is required' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: partner, error } = await service
    .from('partner_channels')
    .insert({
      name,
      slug: slugify(name),
      type,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'active',
      metadata: {
        source: 'admin',
        created_by: admin.id,
        notes: typeof body?.notes === 'string' ? body.notes.trim() : '',
      },
      white_label_settings: asRecord(body?.white_label_settings),
    })
    .select('id, name, slug, type, contact_name, contact_email, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from('audit_events').insert({
    actor_user_id: admin.id,
    event_type: 'partner.created',
    entity_type: 'partner_channel',
    entity_id: partner.id,
    metadata: { partner },
  })

  return NextResponse.json({ partner })
}
