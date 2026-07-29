import { NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { nextPlanVersion, normalizePlanVersionInput } from '@/lib/board/plan-versioning'

async function ensurePlanningCycle(company: { id: string; organization_id: string }) {
  const service = serviceClient()
  const { data: existing, error: existingError } = await service
    .from('governance_cycles')
    .select('id')
    .eq('company_id', company.id)
    .neq('status', 'closed')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return existing.id as string

  const { data: created, error } = await service
    .from('governance_cycles')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      title: 'Plan intake',
      cycle_type: 'diagnostic',
      status: 'planning',
      current_stage: 'planning',
      metadata: { source: 'business-plan-intake' },
    })
    .select('id')
    .single()
  if (error || !created) throw new Error(error?.message || 'Could not create planning cycle.')
  return created.id as string
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ company: null, plans: [] })
    const service = serviceClient()
    const { data, error } = await service
      .from('business_plans')
      .select('id, title, plan_type, period, business_front, version, parent_plan_id, source_type, normalized_content, consolidation_lineage, status, updated_at')
      .eq('company_id', company.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: 'Plan version schema is not available yet.', code: 'plan_version_migration_required' },
        { status: 503 },
      )
    }
    return NextResponse.json({ company: { id: company.id, name: company.name }, plans: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load plans.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = normalizePlanVersionInput(await request.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid plan version input.' }, { status: 400 })
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ error: 'Create or select a company first.' }, { status: 409 })
    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const service = serviceClient()
    const cycleId = await ensurePlanningCycle(company)
    const versionQuery = service
      .from('business_plans')
      .select('version')
      .eq('company_id', company.id)
      .eq('plan_type', input.planType)
      .neq('status', 'archived')
    const scopedByFront = input.businessFront
      ? versionQuery.eq('business_front', input.businessFront)
      : versionQuery.is('business_front', null)
    const scoped = input.period
      ? scopedByFront.eq('period', input.period)
      : scopedByFront.is('period', null)
    const { data: versions, error: versionError } = await scoped
    if (versionError) {
      return NextResponse.json(
        { error: 'Plan version schema is not available yet.', code: 'plan_version_migration_required' },
        { status: 503 },
      )
    }
    const version = nextPlanVersion((versions ?? []).map(row => Number(row.version)))
    const lineage = input.consolidateFromPlanIds.map(planId => ({
      plan_id: planId,
      relationship: 'consolidated_source',
    }))
    const { data: created, error } = await service
      .from('business_plans')
      .insert({
        organization_id: company.organization_id,
        company_id: company.id,
        governance_cycle_id: cycleId,
        title: input.title,
        plan_type: input.planType,
        period: input.period,
        business_front: input.businessFront,
        version,
        parent_plan_id: input.parentPlanId,
        source_type: input.sourceType,
        raw_source: input.rawSource,
        normalized_content: input.normalizedContent,
        consolidation_lineage: lineage,
        status: 'draft',
        metadata: {
          created_by: user.id,
          source: 'business-plan-intake',
          plan_scope: {
            plan_type: input.planType,
            business_front: input.businessFront,
            period: input.period,
          },
        },
      })
      .select('id, title, plan_type, period, business_front, version, parent_plan_id, source_type, consolidation_lineage, status, created_at, updated_at')
      .single()
    if (error || !created) throw new Error(error?.message || 'Could not create plan version.')

    return NextResponse.json({ persisted: true, plan: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create plan version.' },
      { status: 500 },
    )
  }
}
