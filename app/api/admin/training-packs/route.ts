import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import { TRAINING_COMPANY_PACKS } from '@/lib/board/training-sources'
import { seedTrainingPackCompany } from '@/lib/board/training-pack-seed'

type OrganizationMembershipRow = {
  organization_id: string
  role: string
}

async function organizationIdFor(userId: string, requestedOrganizationId?: string) {
  const service = serviceClient()
  if (requestedOrganizationId) return requestedOrganizationId

  const { data, error } = await service
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as OrganizationMembershipRow | null)?.organization_id ?? null
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const organizationId = await organizationIdFor(admin.id)
  const slugs = TRAINING_COMPANY_PACKS.map((pack) => `training-${pack.id}`)
  const { data: companies, error } = organizationId
    ? await service
      .from('companies')
      .select('id, name, slug, metadata, created_at')
      .eq('organization_id', organizationId)
      .in('slug', slugs)
    : { data: [], error: null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const companiesByPack = new Map(
    (companies ?? []).map((company) => [company.metadata?.training_pack_id ?? company.slug?.replace(/^training-/, ''), company])
  )

  return NextResponse.json({
    organization_id: organizationId,
    packs: TRAINING_COMPANY_PACKS.map((pack) => ({
      ...pack,
      existing_company: companiesByPack.get(pack.id) ?? null,
    })),
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const body = await request.json().catch(() => null)
  const packId = typeof body?.pack_id === 'string' ? body.pack_id : ''
  const seedAll = body?.seed_all === true
  const reset = body?.reset === true
  const organizationId = await organizationIdFor(
    admin.id,
    typeof body?.organization_id === 'string' ? body.organization_id : undefined
  )

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization found for admin user.' }, { status: 400 })
  }

  const packs = seedAll
    ? TRAINING_COMPANY_PACKS
    : TRAINING_COMPANY_PACKS.filter((pack) => pack.id === packId)

  if (!packs.length) return NextResponse.json({ error: 'Training pack not found.' }, { status: 404 })

  const service = serviceClient()
  const results = []
  for (const pack of packs) {
    const result = await seedTrainingPackCompany({
      service,
      pack,
      organizationId,
      actorUserId: admin.id,
      reset,
    })
    results.push({ pack_id: pack.id, ...result })
  }

  return NextResponse.json({ organization_id: organizationId, results })
}
