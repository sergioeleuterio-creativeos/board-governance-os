import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import { scoreAdvisorAdherence } from '@/lib/board/advisor-rubrics'
import { TRAINING_COMPANY_PACKS } from '@/lib/board/training-sources'
import { seedTrainingPackCompany } from '@/lib/board/training-pack-seed'

type OrganizationMembershipRow = {
  organization_id: string
  role: string
}

type TrainingCompanyRow = {
  id: string
  name: string
  slug: string
  metadata?: Record<string, unknown> | null
  created_at: string
}

type AgentReviewRow = {
  id: string
  company_id: string
  board_pack_id: string
  board_session_id: string | null
  advisor_key: string
  advisor_name: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: unknown
  recommendations: unknown
  closure_recommendation: string | null
  created_at: string
}

type TrainingEvaluationEvent = {
  id: string
  created_at: string
  company_id: string | null
  metadata: {
    training_pack_id?: string
    average_adherence?: number
    reviews_scored?: number
    weak_reviews?: number
    missing_requirements?: number
    rows?: unknown[]
  }
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

function trainingPackIdForCompany(company: TrainingCompanyRow) {
  const metadataPackId = company.metadata?.training_pack_id
  return typeof metadataPackId === 'string' ? metadataPackId : company.slug?.replace(/^training-/, '')
}

async function loadTrainingCompanies(service: ReturnType<typeof serviceClient>, organizationId: string) {
  const slugs = TRAINING_COMPANY_PACKS.map((pack) => `training-${pack.id}`)
  const { data, error } = await service
    .from('companies')
    .select('id, name, slug, metadata, created_at')
    .eq('organization_id', organizationId)
    .in('slug', slugs)

  if (error) throw new Error(error.message)
  return (data ?? []) as TrainingCompanyRow[]
}

async function latestEvaluations(service: ReturnType<typeof serviceClient>, organizationId: string) {
  const { data, error } = await service
    .from('audit_events')
    .select('id, created_at, company_id, metadata')
    .eq('organization_id', organizationId)
    .eq('event_type', 'training_pack.evaluation_run')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  const latestByPack = new Map<string, TrainingEvaluationEvent>()
  for (const event of (data ?? []) as TrainingEvaluationEvent[]) {
    const packId = event.metadata?.training_pack_id
    if (packId && !latestByPack.has(packId)) latestByPack.set(packId, event)
  }
  return latestByPack
}

async function runTrainingPackEvaluation({
  service,
  organizationId,
  actorUserId,
  company,
}: {
  service: ReturnType<typeof serviceClient>
  organizationId: string
  actorUserId: string
  company: TrainingCompanyRow
}) {
  const trainingPackId = trainingPackIdForCompany(company)
  const { data: reviews, error } = await service
    .from('agent_reviews')
    .select('id, company_id, board_pack_id, board_session_id, advisor_key, advisor_name, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations, closure_recommendation, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) throw new Error(error.message)

  const latestByAdvisor = new Map<string, AgentReviewRow>()
  for (const review of (reviews ?? []) as AgentReviewRow[]) {
    if (!latestByAdvisor.has(review.advisor_key)) latestByAdvisor.set(review.advisor_key, review)
  }

  const rows = Array.from(latestByAdvisor.values()).map((review) => ({
    advisor_key: review.advisor_key,
    advisor_name: review.advisor_name,
    review_id: review.id,
    created_at: review.created_at,
    adherence: scoreAdvisorAdherence(review),
  }))

  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.adherence.total, 0) / rows.length)
    : 0
  const weakReviews = rows.filter((row) => row.adherence.total < 65).length
  const missingRequirements = rows.reduce((sum, row) => sum + row.adherence.missing_requirements.length, 0)

  const { data: event, error: eventError } = await service
    .from('audit_events')
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      actor_user_id: actorUserId,
      event_type: 'training_pack.evaluation_run',
      entity_type: 'company',
      entity_id: company.id,
      metadata: {
        training_pack_id: trainingPackId,
        company_name: company.name,
        average_adherence: average,
        reviews_scored: rows.length,
        weak_reviews: weakReviews,
        missing_requirements: missingRequirements,
        rows,
      },
    })
    .select('id, created_at, company_id, metadata')
    .single()

  if (eventError) throw new Error(eventError.message)

  return {
    pack_id: trainingPackId,
    company_id: company.id,
    evaluation: event,
  }
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const organizationId = await organizationIdFor(admin.id)
  const companies = organizationId ? await loadTrainingCompanies(service, organizationId) : []
  const evaluations = organizationId ? await latestEvaluations(service, organizationId) : new Map<string, TrainingEvaluationEvent>()

  const companiesByPack = new Map(companies.map((company) => [trainingPackIdForCompany(company), company]))

  return NextResponse.json({
    organization_id: organizationId,
    packs: TRAINING_COMPANY_PACKS.map((pack) => ({
      ...pack,
      existing_company: companiesByPack.get(pack.id) ?? null,
      latest_evaluation: evaluations.get(pack.id) ?? null,
    })),
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const body = await request.json().catch(() => null)
  const action = typeof body?.action === 'string' ? body.action : 'seed'
  const packId = typeof body?.pack_id === 'string' ? body.pack_id : ''
  const seedAll = body?.seed_all === true
  const evaluateAll = body?.evaluate_all === true
  const reset = body?.reset === true
  const organizationId = await organizationIdFor(
    admin.id,
    typeof body?.organization_id === 'string' ? body.organization_id : undefined
  )

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization found for admin user.' }, { status: 400 })
  }

  const service = serviceClient()
  if (action === 'evaluate') {
    const companies = await loadTrainingCompanies(service, organizationId)
    const companiesByPack = new Map(companies.map((company) => [trainingPackIdForCompany(company), company]))
    const packs = evaluateAll
      ? TRAINING_COMPANY_PACKS
      : TRAINING_COMPANY_PACKS.filter((pack) => pack.id === packId)

    if (!packs.length) return NextResponse.json({ error: 'Training pack not found.' }, { status: 404 })

    const results = []
    for (const pack of packs) {
      const company = companiesByPack.get(pack.id)
      if (!company) {
        results.push({ pack_id: pack.id, skipped: true, reason: 'Company has not been created yet.' })
        continue
      }
      results.push(await runTrainingPackEvaluation({
        service,
        organizationId,
        actorUserId: admin.id,
        company,
      }))
    }

    return NextResponse.json({ organization_id: organizationId, results })
  }

  const packs = seedAll
    ? TRAINING_COMPANY_PACKS
    : TRAINING_COMPANY_PACKS.filter((pack) => pack.id === packId)

  if (!packs.length) return NextResponse.json({ error: 'Training pack not found.' }, { status: 404 })

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
