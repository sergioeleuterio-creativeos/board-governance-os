import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { runGovernanceAI } from '@/lib/board/ai'
import type { BoardCompany, GovernanceAIOutput, GovernanceRunInput } from '@/lib/board/types'
import type { AdvisorKey, ClosureRecommendation } from '@/lib/shadow-board/domain'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export const maxDuration = 60

const advisorKeys = new Set<AdvisorKey>(['board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent'])

function addDays(days = 14): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function defaultPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

function compactLines(values: Array<string | null | undefined>, fallback: string): string {
  const content = values
    .map(value => value?.trim())
    .filter(Boolean)
    .join('\n')
  return content || fallback
}

function financialReportFromInput(input: GovernanceRunInput) {
  return {
    board_relevance: [
      { metric: 'Financial evidence quality', value: input.financial_snapshot ? 'Available' : 'Missing', note: 'Board should verify source files before approval.' },
      { metric: 'Cash / runway discipline', value: 'Evidence gate', note: 'Require runway, burn, and OCF visibility before major commitments.' },
      { metric: 'Revenue quality', value: 'Watch concentration', note: 'Review customer concentration, margin by cohort, and recurring/non-recurring mix.' },
    ],
    dre_pnl: [
      { line_item: 'Receita liquida / Net revenue', value: 'Pending source data', variance: 'n/a', board_note: input.financial_snapshot.slice(0, 220) || 'Upload DRE/P&L source.' },
      { line_item: 'Margem bruta / Gross margin', value: 'Pending source data', variance: 'n/a', board_note: 'Needed for pricing, customer, and scale decisions.' },
      { line_item: 'EBITDA / Operating result', value: 'Pending source data', variance: 'n/a', board_note: 'Needed to separate growth from sustainable performance.' },
    ],
    ocf_cash: [
      { line_item: 'Operating Cash Flow / OCF', value: 'Pending source data', board_note: 'Track cash conversion and working capital pressure.' },
      { line_item: 'Runway', value: 'Pending source data', board_note: 'Board comfort line should be explicit before commitments.' },
      { line_item: 'Debt service / financing', value: 'Pending source data', board_note: 'Tie capital decisions to covenants and refinancing risk.' },
    ],
  }
}

function advisorReportsFromOutput(output: GovernanceAIOutput) {
  return output.persona_reviews.map(review => ({
    advisor_key: review.persona_key,
    advisor_name: review.persona_name,
    focus_area: review.focus_area,
    stance: review.stance,
    risk_score: review.risk_score,
    confidence_score: review.confidence_score,
    perspective: review.summary,
    c_level_questions: review.questions,
    risks: review.risks,
    recommendations: review.recommendations,
    closure_recommendation: closureRecommendationFor(output.decision.decision),
  }))
}

function closureRecommendationFor(decision: GovernanceAIOutput['decision']['decision']): ClosureRecommendation {
  if (decision === 'proceed') return 'commit'
  if (decision === 'proceed_with_conditions') return 'commit_with_conditions'
  if (decision === 'pause') return 'defer'
  if (decision === 'reject') return 'reject'
  return 'request_more_data'
}

function advisorStanceFor(stance: string) {
  if (stance === 'approve') return 'support'
  if (stance === 'approve_with_conditions') return 'support_with_conditions'
  if (stance === 'reject') return 'oppose'
  if (stance === 'caution') return 'needs_more_data'
  return 'neutral'
}

function advisorKeyFor(key: string | null | undefined): AdvisorKey {
  return advisorKeys.has(key as AdvisorKey) ? key as AdvisorKey : 'board_brain'
}

async function ensureGovernanceCycle(company: BoardCompany & { organization_id: string }, requestedCycleId?: string | null) {
  const service = serviceClient()

  if (requestedCycleId) {
    const { data: cycle, error } = await service
      .from('governance_cycles')
      .select('id, organization_id, company_id')
      .eq('id', requestedCycleId)
      .eq('company_id', company.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (cycle) return cycle
  }

  const { data: latest, error: latestError } = await service
    .from('governance_cycles')
    .select('id, organization_id, company_id')
    .eq('company_id', company.id)
    .neq('status', 'closed')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw new Error(latestError.message)
  if (latest) return latest

  const { data: created, error: createError } = await service
    .from('governance_cycles')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      title: `${company.name} governance cycle`,
      cycle_type: 'ad_hoc',
      status: 'planning',
      current_stage: 'planning',
      metadata: { source: 'governance-run-api' },
    })
    .select('id, organization_id, company_id')
    .single()

  if (createError || !created) throw new Error(createError?.message || 'Failed to create governance cycle')
  return created
}

async function buildInputFromCompanyBrain(companyId: string, period: string): Promise<GovernanceRunInput> {
  const service = serviceClient()
  const { data: entries, error: entriesError } = await service
    .from('company_brain_entries')
    .select('category, title, content, created_at')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(40)

  if (entriesError) throw new Error(entriesError.message)

  const byCategory = (categories: string[]) =>
    (entries ?? [])
      .filter(entry => categories.includes(entry.category))
      .map(entry => `${entry.title}: ${entry.content}`)

  return {
    period,
    kpis: compactLines(byCategory(['financial']), 'No KPI package has been approved yet. Use available financial and operating context.'),
    financial_snapshot: compactLines(byCategory(['financial']), 'No formal financial snapshot uploaded yet. Flag confidence limits.'),
    priorities: compactLines(byCategory(['goal', 'plan']), 'Infer draft priorities from intake goals and current challenge.'),
    risks: compactLines(byCategory(['risk', 'question']), 'Identify explicit and implicit risks from current memory.'),
    opportunities: compactLines(byCategory(['customer', 'operations', 'fact']), 'Identify opportunities from customer, market, and operating context.'),
    team_issues: compactLines(byCategory(['team', 'operations']), 'Identify execution and accountability risks from current memory.'),
    meeting_notes: compactLines(
      (entries ?? []).slice(0, 12).map(entry => `${entry.category.toUpperCase()} - ${entry.title}: ${entry.content}`),
      'No meeting notes recorded yet.'
    ),
  }
}

async function saveCanonicalRun({
  company,
  governanceCycleId,
  userId,
  input,
  output,
  provider,
  model,
}: {
  company: BoardCompany & { id: string; organization_id: string }
  governanceCycleId: string
  userId: string
  input: GovernanceRunInput
  output: GovernanceAIOutput
  provider: string
  model: string
}) {
  const service = serviceClient()
  const closureRecommendation = closureRecommendationFor(output.decision.decision)
  const financialReport = financialReportFromInput(input)
  const advisorReports = advisorReportsFromOutput(output)
  const priorities = output.board_pack.priority_ranking.map((priority, index) => ({
    rank: index + 1,
    ...priority,
  }))
  const workstreams = priorities.map(priority => ({
    workstream: priority.priority,
    owner_suggestion: priority.owner_suggestion ?? 'Founder',
    cadence: 'Weekly review',
    proof_point: priority.rationale,
  }))

  const { data: businessPlan, error: businessPlanError } = await service
    .from('business_plans')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      governance_cycle_id: governanceCycleId,
      status: 'ready_for_review',
      diagnosis: output.run.summary,
      priorities,
      kpis: {
        source: 'governance-run-api',
        period: input.period,
        input: input.kpis,
        governance_score: output.governance_score,
      },
      workstreams,
      timeline: {
        review_cycle: '30 days',
        first_review_date: addDays(30),
      },
      risks: output.board_pack.risk_map,
      assumptions: [
        { title: 'Input quality', detail: output.governance_score.explanation },
        { title: 'Financial snapshot', detail: input.financial_snapshot },
      ],
      completeness_score: output.governance_score.total,
      quality_score: output.run.confidence_score,
    })
    .select('id')
    .single()

  if (businessPlanError || !businessPlan) throw new Error(businessPlanError?.message || 'Failed to create business plan')

  const { data: boardPack, error: boardPackError } = await service
    .from('board_packs')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      governance_cycle_id: governanceCycleId,
      business_plan_id: businessPlan.id,
      version: 1,
      status: 'ready',
      executive_summary: output.board_pack.executive_summary,
      strategic_questions: output.board_pack.strategic_questions,
      risk_map: output.board_pack.risk_map,
      priority_ranking: priorities,
      meeting_agenda: output.board_pack.meeting_agenda,
      decision_candidates: [output.decision],
      export_payload: {
        provider,
        model,
        run: output.run,
        governance_score: output.governance_score,
        financial_report: financialReport,
        advisor_reports: advisorReports,
        input,
      },
    })
    .select('id')
    .single()

  if (boardPackError || !boardPack) throw new Error(boardPackError?.message || 'Failed to create board pack')

  const agentRows = output.persona_reviews.map(review => ({
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: governanceCycleId,
    board_pack_id: boardPack.id,
    advisor_key: advisorKeyFor(review.persona_key),
    advisor_name: review.persona_name,
    status: 'complete',
    stance: advisorStanceFor(review.stance),
    risk_score: review.risk_score,
    confidence_score: review.confidence_score,
    perspective: review.summary,
    strategic_questions: review.questions,
    source_references: [],
    recommendations: review.recommendations,
    closure_recommendation: closureRecommendation,
    raw_output: review,
  }))

  if (agentRows.length) {
    const { error: agentError } = await service.from('agent_reviews').insert(agentRows)
    if (agentError) throw new Error(agentError.message)
  }

  const { data: boardSession, error: boardSessionError } = await service
    .from('board_sessions')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      governance_cycle_id: governanceCycleId,
      board_pack_id: boardPack.id,
      started_by: userId,
      session_type: 'diagnostic',
      status: 'awaiting_founder',
      opened_at: new Date().toISOString(),
      closure_recommendation: closureRecommendation,
      closure_summary: output.decision.rationale,
      usage_units_consumed: 1,
      metadata: {
        source: 'governance-run-api',
        provider,
        model,
      },
    })
    .select('id')
    .single()

  if (boardSessionError || !boardSession) throw new Error(boardSessionError?.message || 'Failed to create board session')

  const { data: decision, error: decisionError } = await service
    .from('decisions')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      governance_cycle_id: governanceCycleId,
      board_session_id: boardSession.id,
      created_by: userId,
      user_id: userId,
      title: output.decision.title,
      decision: output.decision.decision,
      status: 'candidate',
      closure_recommendation: closureRecommendation,
      rationale: output.decision.rationale,
      risks: output.decision.risk_level,
      expected_outcome: output.decision.conditions.map(condition => `${condition.title}: ${condition.detail}`).join('\n'),
      tradeoffs: output.decision.tradeoffs,
      risk_level: output.decision.risk_level,
      confidence_score: output.decision.confidence_score,
      conditions: output.decision.conditions,
      owner_label: 'Founder',
      owner: 'Founder',
      review_date: addDays(30),
      metadata: {
        source: 'governance-run-api',
        board_pack_id: boardPack.id,
        business_plan_id: businessPlan.id,
      },
    })
    .select('id')
    .single()

  if (decisionError || !decision) throw new Error(decisionError?.message || 'Failed to create decision')

  const followUpRows = output.follow_ups.map(item => ({
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: governanceCycleId,
    decision_id: decision.id,
    source_agent_key: advisorKeyFor(item.source_persona_key),
    user_id: userId,
    owner_label: item.owner_label || 'Founder',
    owner: item.owner_label || 'Founder',
    title: item.title,
    action: item.title,
    description: item.description || null,
    priority: item.priority,
    status: 'open',
    due_date: addDays(item.due_in_days || 14),
  }))

  if (followUpRows.length) {
    const { error: followUpError } = await service.from('follow_ups').insert(followUpRows)
    if (followUpError) throw new Error(followUpError.message)
  }

  await service
    .from('governance_cycles')
    .update({
      status: 'board_pack',
      current_stage: 'board_pack',
      data_quality_score: output.governance_score.total,
      metadata: {
        source: 'governance-run-api',
        latest_business_plan_id: businessPlan.id,
        latest_board_pack_id: boardPack.id,
        latest_board_session_id: boardSession.id,
        provider,
        model,
      },
    })
    .eq('id', governanceCycleId)

  await service.from('governance_runs').insert({
    company_id: company.id,
    user_id: userId,
    title: output.run.title,
    period: input.period,
    input_data: input,
    raw_output: output,
    model_provider: provider,
    model_name: model,
    risk_score: output.run.risk_score,
    confidence_score: output.run.confidence_score,
    executive_summary: output.board_pack.executive_summary || output.run.summary,
    board_pack: output.board_pack,
    strategic_questions: output.board_pack.strategic_questions,
    risk_map: output.board_pack.risk_map,
    priority_ranking: output.board_pack.priority_ranking,
    governance_score: output.governance_score,
    meeting_agenda: output.board_pack.meeting_agenda,
    follow_up_tracker: output.follow_ups,
    status: 'complete',
  })

  await service.from('audit_events').insert({
    organization_id: company.organization_id,
    company_id: company.id,
    actor_user_id: userId,
    event_type: 'governance.run_completed',
    entity_type: 'board_pack',
    entity_id: boardPack.id,
    metadata: {
      governance_cycle_id: governanceCycleId,
      business_plan_id: businessPlan.id,
      board_session_id: boardSession.id,
      decision_id: decision.id,
      follow_ups_created: followUpRows.length,
      agent_reviews_created: agentRows.length,
      provider,
      model,
    },
  })

  return {
    businessPlanId: businessPlan.id,
    boardPackId: boardPack.id,
    boardSessionId: boardSession.id,
    decisionId: decision.id,
    agentReviewsCreated: agentRows.length,
    followUpsCreated: followUpRows.length,
    closureRecommendation,
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await req.json().catch(() => null)
  if (!body?.company_id) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: company, error: companyError } = await service
    .from('companies')
    .select('*')
    .eq('id', body.company_id)
    .maybeSingle()

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message || 'Company not found' }, { status: 404 })
  }

  const access = await requireCompanyAdmin(company.id)
  if (isAuthError(access)) return access

  try {
    const period = typeof body.period === 'string' && body.period.trim() ? body.period.trim() : defaultPeriod()
    const input = body.input as GovernanceRunInput | undefined ?? await buildInputFromCompanyBrain(company.id, period)
    const cycle = await ensureGovernanceCycle(company as BoardCompany & { organization_id: string }, body.governance_cycle_id)
    const { provider, model, output } = await runGovernanceAI(company as BoardCompany, input)
    const persistence = await saveCanonicalRun({
      company: company as BoardCompany & { id: string; organization_id: string },
      governanceCycleId: cycle.id,
      userId: user.id,
      input,
      output,
      provider,
      model,
    })

    return NextResponse.json({
      mode: 'live-supabase',
      provider,
      model,
      governance_cycle_id: cycle.id,
      persistence,
      output,
      nextAdapter: 'board-pack-export',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown governance run error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({
        company: null,
        latest_run: null,
        latest_business_plan: null,
        latest_board_pack: null,
        latest_session: null,
      })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const service = serviceClient()
    const [runResult, businessPlanResult, boardPackResult, sessionResult] = await Promise.all([
      service
        .from('governance_runs')
        .select('id, title, period, risk_score, confidence_score, executive_summary, status, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('business_plans')
        .select('id, diagnosis, completeness_score, quality_score, workstreams, priorities, status, updated_at')
        .eq('company_id', company.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('board_packs')
        .select('id, version, status, executive_summary, strategic_questions, priority_ranking, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('board_sessions')
        .select('id, status, closure_recommendation, closure_summary, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (runResult.error) throw new Error(runResult.error.message)
    if (businessPlanResult.error) throw new Error(businessPlanResult.error.message)
    if (boardPackResult.error) throw new Error(boardPackResult.error.message)
    if (sessionResult.error) throw new Error(sessionResult.error.message)

    return NextResponse.json({
      company,
      latest_run: runResult.data ?? null,
      latest_business_plan: businessPlanResult.data ?? null,
      latest_board_pack: boardPackResult.data ?? null,
      latest_session: sessionResult.data ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load governance run readout' },
      { status: 500 }
    )
  }
}
