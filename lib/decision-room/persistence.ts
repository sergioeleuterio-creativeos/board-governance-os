import 'server-only'

import { serviceClient } from '@/lib/auth-server'
import type { CurrentCompany } from '@/lib/shadow-board/current-company-server'
import type { BoardTurn, DecisionCaptureRequest, DecisionRecord, DecisionRoomSessionSaveRequest, FollowUp } from './types'

type PersistDecisionRoomCaptureInput = {
  company: CurrentCompany
  userId: string
  request: DecisionCaptureRequest
  decision: DecisionRecord
  followUps: FollowUp[]
}

type GovernanceCycleRow = {
  id: string
  organization_id: string
  company_id: string
}

type ServiceClient = ReturnType<typeof serviceClient>

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function sourceAgentKey(owner: string | null | undefined) {
  const normalized = owner?.toLowerCase() ?? ''
  if (normalized.includes('cfo')) return 'finance'
  if (normalized.includes('cro')) return 'growth'
  if (normalized.includes('ceo')) return 'operator'
  if (normalized.includes('board')) return 'board_brain'
  return 'board_brain'
}

function followUpStatus(status: FollowUp['status']) {
  if (status === 'Em andamento') return 'in_progress'
  if (status === 'Bloqueado') return 'blocked'
  if (status === 'Concluído') return 'done'
  return 'open'
}

function dueDate(value: string | null | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return addDays(14)
}

type RoomMetadataInput = {
  clientRoomId?: string
  sessionId: string
  sessionKind?: string
  selectedAgents?: string[]
  activeQuestion?: string
  requestedData?: string[]
  bypassedData?: string[]
  queue?: string[]
  log?: BoardTurn[]
  baseIdx?: number
  baseComplete?: boolean
  decided?: string | null
  questionConfirmed?: boolean
  sourceSnapshotId?: string
  sourceSnapshotHash?: string
}

function compactLog(log: BoardTurn[] | undefined) {
  return (log ?? []).slice(-60).map(turn => ({
    code: turn.code,
    tag: turn.tag,
    text: turn.text,
    studio: turn.studio ?? false,
    synth: turn.synth ?? {},
  }))
}

function roomMetadata(request: RoomMetadataInput) {
  return {
    decision_room_client_id: request.clientRoomId ?? null,
    decision_room_session_type: request.sessionId,
    decision_room_session_kind: request.sessionKind ?? 'board',
    decision_room_selected_agents: request.selectedAgents ?? ['BB'],
    decision_room_active_question: request.activeQuestion ?? null,
    decision_room_requested_data: request.requestedData ?? [],
    decision_room_bypassed_data: request.bypassedData ?? [],
    decision_room_output_queue: request.queue ?? [],
    decision_room_turn_count: request.log?.length ?? 0,
    decision_room_base_idx: request.baseIdx ?? null,
    decision_room_base_complete: request.baseComplete ?? false,
    decision_room_decided: request.decided ?? null,
    decision_room_question_confirmed: request.questionConfirmed ?? false,
    decision_room_source_snapshot_id: request.sourceSnapshotId ?? null,
    decision_room_source_snapshot_hash: request.sourceSnapshotHash ?? null,
    decision_room_log: compactLog(request.log),
  }
}

function closureSummaryFromLog(log: BoardTurn[] | undefined) {
  const lastTurn = log?.filter(turn => turn.text.trim()).at(-1)
  return lastTurn?.text.slice(0, 800) ?? 'Sessão do Decision Room salva em andamento.'
}

async function persistAdvisoryBusinessPlan(
  service: ServiceClient,
  input: {
    company: CurrentCompany
    cycle: GovernanceCycleRow
    userId: string
    request: DecisionCaptureRequest
    decision: DecisionRecord
    followUps: FollowUp[]
  }
) {
  const { company, cycle, userId, request, decision, followUps } = input
  const planType = request.sessionId === 'campaign'
    ? 'marketing'
    : request.sessionId === 'reset' ? 'strategic' : 'diagnostic'
  const businessFront = request.sessionId === 'campaign'
    ? 'marketing'
    : request.sessionId === 'reset' ? 'company' : 'diagnosis'
  const period = String(new Date().getUTCFullYear())
  const metadata = {
    source: 'advisory-session',
    adapter: process.env.DECISION_ROOM_ADAPTER ?? 'mock',
    decision_room_client_id: request.clientRoomId ?? null,
    active_question: request.activeQuestion ?? null,
    selected_agents: request.selectedAgents ?? ['BB'],
    requested_data: request.requestedData ?? [],
    bypassed_data: request.bypassedData ?? [],
    output_queue: request.queue ?? [],
    plan_type: planType,
    business_front: businessFront,
    period,
    source_snapshot_id: request.sourceSnapshotId ?? null,
    source_snapshot_hash: request.sourceSnapshotHash ?? null,
    question_confirmed: request.questionConfirmed ?? false,
    created_by: userId,
  }

  const { data: existing, error: lookupError } = request.clientRoomId
    ? await service
      .from('business_plans')
      .select('id, version')
      .eq('company_id', company.id)
      .eq('metadata->>decision_room_client_id', request.clientRoomId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null }

  if (lookupError) throw new Error(lookupError.message)

  const { data: previousPlan, error: previousPlanError } = existing?.id
    ? { data: null, error: null }
    : await service
      .from('business_plans')
      .select('id, version')
      .eq('company_id', company.id)
      .eq('plan_type', planType)
      .eq('business_front', businessFront)
      .eq('period', period)
      .neq('status', 'archived')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

  if (previousPlanError) throw new Error(previousPlanError.message)

  const version = existing?.version
    ?? ((typeof previousPlan?.version === 'number' ? previousPlan.version : 0) + 1)
  const title = request.activeQuestion?.trim()
    ? request.activeQuestion.trim().slice(0, 160)
    : `${planType === 'marketing' ? 'Plano de marketing' : 'Plano consultivo'} ${period}`
  const normalizedContent = {
    question: request.activeQuestion ?? null,
    decision: {
      statement: decision.statement,
      rationale: decision.rationale,
      conditions: decision.conditions,
      rejectedOptions: decision.rejectedOptions,
      confidence: decision.confidence,
      owner: decision.owner,
      reviewDate: decision.reviewDate,
    },
    followUps,
  }
  const payload = {
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    title,
    plan_type: planType,
    period,
    business_front: businessFront,
    version,
    parent_plan_id: existing?.id ? null : previousPlan?.id ?? null,
    source_type: 'advisory_session',
    source_document_ids: [],
    source_input_ids: [],
    raw_source: {
      active_question: request.activeQuestion ?? null,
      transcript: compactLog(request.log),
      requested_data: request.requestedData ?? [],
      bypassed_data: request.bypassedData ?? [],
    },
    normalized_content: normalizedContent,
    consolidation_lineage: previousPlan?.id
      ? [{ plan_id: previousPlan.id, relationship: 'previous_version' }]
      : [],
    status: 'ready_for_review',
    diagnosis: decision.rationale,
    priorities: decision.conditions.map((condition, index) => ({
      title: condition,
      priority: index === 0 ? 'high' : 'medium',
    })),
    kpis: followUps.map((item) => ({
      metric: item.title,
      owner: item.owner,
      due: item.due,
      status: item.status,
    })),
    workstreams: followUps.map((item) => ({
      title: item.title,
      owner: item.owner,
      due: item.due,
      dependency: item.dependency,
      escalation: item.escalation,
    })),
    timeline: {
      reviewDate: decision.reviewDate,
      sessionClosedAt: new Date().toISOString(),
    },
    risks: decision.rejectedOptions.map(option => ({ title: option })),
    assumptions: [
      ...(request.requestedData ?? []).map(item => ({ type: 'requested_data', detail: item })),
      ...(request.bypassedData ?? []).map(item => ({ type: 'accepted_gap', detail: item })),
    ],
    completeness_score: decision.confidence,
    quality_score: decision.confidence,
    metadata: {
      ...metadata,
      title,
      version,
      parent_plan_id: previousPlan?.id ?? null,
    },
  }

  if (existing?.id) {
    const { error: updateError } = await service
      .from('business_plans')
      .update(payload)
      .eq('id', existing.id)
    if (updateError) throw new Error(updateError.message)
    return existing.id as string
  }

  const { data: created, error: createError } = await service
    .from('business_plans')
    .insert(payload)
    .select('id')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message || 'Não foi possível salvar o plano consultivo')
  }

  return created.id as string
}

async function ensureDecisionRoomCycle(company: CurrentCompany): Promise<GovernanceCycleRow> {
  const service = serviceClient()

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
  if (latest) return latest as GovernanceCycleRow

  const { data: created, error: createError } = await service
    .from('governance_cycles')
    .insert({
      organization_id: company.organization_id,
      company_id: company.id,
      title: `${company.name} Decision Room cycle`,
      cycle_type: 'ad_hoc',
      status: 'board_pack',
      current_stage: 'decision_room',
      metadata: { source: 'decision-room' },
    })
    .select('id, organization_id, company_id')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message || 'Não foi possível criar o ciclo do Decision Room')
  }

  return created as GovernanceCycleRow
}

export async function persistDecisionRoomCapture(input: PersistDecisionRoomCaptureInput) {
  const service = serviceClient()
  const { company, userId, request, decision, followUps } = input
  const cycle = await ensureDecisionRoomCycle(company)
  const now = new Date().toISOString()
  const isAdvisory = request.sessionKind === 'advisory'
  const closureRecommendation = request.state === 'approved'
    ? 'commit_with_conditions'
    : isAdvisory ? 'request_more_data' : 'defer'
  const decisionStatus = isAdvisory
    ? request.state === 'approved' ? 'candidate' : 'deferred'
    : request.state === 'approved' ? 'approved' : 'deferred'

  const { data: existingDecision, error: existingDecisionError } = await service
    .from('decisions')
    .select('id, board_session_id')
    .eq('company_id', company.id)
    .eq('metadata->>decision_room_source_id', decision.id)
    .eq('metadata->>decision_room_session_kind', request.sessionKind ?? 'board')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingDecisionError) throw new Error(existingDecisionError.message)

  const { data: existingSession, error: existingSessionError } = request.clientRoomId
    ? await service
      .from('board_sessions')
      .select('id')
      .eq('company_id', company.id)
      .eq('metadata->>decision_room_client_id', request.clientRoomId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null }

  if (existingSessionError) throw new Error(existingSessionError.message)

  let boardSessionId = existingDecision?.board_session_id ?? existingSession?.id ?? null
  if (!boardSessionId) {
    const { data: boardSession, error: boardSessionError } = await service
      .from('board_sessions')
      .insert({
        organization_id: company.organization_id,
        company_id: company.id,
        governance_cycle_id: cycle.id,
        started_by: userId,
        session_type: isAdvisory ? 'diagnostic' : 'virtual_review',
        status: 'awaiting_founder',
        opened_at: now,
        source_snapshot_id: request.sourceSnapshotId ?? null,
        source_snapshot_hash: request.sourceSnapshotHash ?? null,
        active_question: request.activeQuestion ?? null,
        question_confirmed_at: request.questionConfirmed ? now : null,
        closure_recommendation: closureRecommendation,
        closure_summary: decision.rationale,
        metadata: {
          source: 'decision-room',
          adapter: process.env.DECISION_ROOM_ADAPTER ?? 'mock',
          ...roomMetadata({ ...request, decided: request.state }),
        },
      })
      .select('id')
      .single()

    if (boardSessionError || !boardSession) {
      throw new Error(boardSessionError?.message || 'Não foi possível criar a sessão do Decision Room')
    }
    boardSessionId = boardSession.id
  }

  const { error: boardSessionUpdateError } = await service
    .from('board_sessions')
    .update({
      closure_recommendation: closureRecommendation,
      closure_summary: decision.rationale,
      source_snapshot_id: request.sourceSnapshotId ?? null,
      source_snapshot_hash: request.sourceSnapshotHash ?? null,
      active_question: request.activeQuestion ?? null,
      question_confirmed_at: request.questionConfirmed ? now : null,
      metadata: {
        source: 'decision-room',
        adapter: process.env.DECISION_ROOM_ADAPTER ?? 'mock',
        ...roomMetadata({ ...request, decided: request.state }),
      },
    })
    .eq('id', boardSessionId)

  if (boardSessionUpdateError) throw new Error(boardSessionUpdateError.message)

  let decisionId = existingDecision?.id ?? null
  const decisionPayload = {
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    board_session_id: boardSessionId,
    created_by: userId,
    user_id: userId,
    title: isAdvisory ? `Plano consultivo: ${decision.statement}` : decision.statement,
    decision: isAdvisory ? 'advisory_plan' : request.state,
    status: decisionStatus,
    closure_recommendation: closureRecommendation,
    rationale: decision.rationale,
    risks: decision.rejectedOptions.join('\n'),
    expected_outcome: decision.conditions.join('\n'),
    tradeoffs: decision.rejectedOptions,
    risk_level: 'medium',
    confidence_score: decision.confidence,
    conditions: decision.conditions,
    owner_label: decision.owner,
    owner: decision.owner,
    review_date: dueDate(decision.reviewDate),
    metadata: {
      source: 'decision-room',
      adapter: process.env.DECISION_ROOM_ADAPTER ?? 'mock',
      decision_room_source_id: decision.id,
      linked_sources: decision.linked,
      output_queue: request.queue ?? [],
      ...roomMetadata({ ...request, decided: request.state }),
    },
  }

  if (decisionId) {
    const { error: updateDecisionError } = await service
      .from('decisions')
      .update(decisionPayload)
      .eq('id', decisionId)
    if (updateDecisionError) throw new Error(updateDecisionError.message)
  } else {
    const { data: createdDecision, error: decisionError } = await service
      .from('decisions')
      .insert(decisionPayload)
      .select('id')
      .single()

    if (decisionError || !createdDecision) {
      throw new Error(decisionError?.message || 'Não foi possível salvar a decisão do Decision Room')
    }
    decisionId = createdDecision.id
  }

  const { error: deleteFollowUpsError } = await service
    .from('follow_ups')
    .delete()
    .eq('decision_id', decisionId)
    .eq('company_id', company.id)

  if (deleteFollowUpsError) throw new Error(deleteFollowUpsError.message)

  const followUpRows = followUps.map(item => ({
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    decision_id: decisionId,
    source_agent_key: sourceAgentKey(item.owner),
    user_id: userId,
    owner_label: item.owner,
    owner: item.owner,
    title: item.title,
    action: item.title,
    description: [item.dependency, item.escalation].filter(Boolean).join('\n'),
    priority: item.status === 'Bloqueado' ? 'high' : 'medium',
    status: followUpStatus(item.status),
    due_date: dueDate(item.due),
  }))

  if (followUpRows.length) {
    const { error: followUpError } = await service.from('follow_ups').insert(followUpRows)
    if (followUpError) throw new Error(followUpError.message)
  }

  const businessPlanId = isAdvisory
    ? await persistAdvisoryBusinessPlan(service, {
      company,
      cycle,
      userId,
      request,
      decision,
      followUps,
    })
    : null

  return {
    persisted: true,
    governanceCycleId: cycle.id,
    boardSessionId,
    decisionId,
    businessPlanId,
    followUpsCount: followUpRows.length,
  }
}

export async function persistDecisionRoomSession(input: {
  company: CurrentCompany
  userId: string
  state: DecisionRoomSessionSaveRequest
}) {
  const service = serviceClient()
  const { company, userId, state } = input
  const cycle = await ensureDecisionRoomCycle(company)
  const now = new Date().toISOString()
  const metadata = {
    source: 'decision-room',
    adapter: process.env.DECISION_ROOM_ADAPTER ?? 'mock',
    ...roomMetadata(state),
  }

  const { data: existing, error: existingError } = await service
    .from('board_sessions')
    .select('id')
    .eq('company_id', company.id)
    .eq('metadata->>decision_room_client_id', state.clientRoomId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  const sessionPayload = {
    organization_id: company.organization_id,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    started_by: userId,
    session_type: state.sessionKind === 'advisory' ? 'diagnostic' : 'live_facilitated',
    status: state.decided ? 'awaiting_founder' : 'open',
    opened_at: now,
    source_snapshot_id: state.sourceSnapshotId ?? null,
    source_snapshot_hash: state.sourceSnapshotHash ?? null,
    active_question: state.activeQuestion ?? null,
    question_confirmed_at: state.questionConfirmed ? now : null,
    closure_summary: closureSummaryFromLog(state.log),
    metadata,
  }

  if (existing?.id) {
    const { error: updateError } = await service
      .from('board_sessions')
      .update({
        status: sessionPayload.status,
        closure_summary: sessionPayload.closure_summary,
        source_snapshot_id: sessionPayload.source_snapshot_id,
        source_snapshot_hash: sessionPayload.source_snapshot_hash,
        active_question: sessionPayload.active_question,
        question_confirmed_at: sessionPayload.question_confirmed_at,
        metadata,
      })
      .eq('id', existing.id)

    if (updateError) throw new Error(updateError.message)
    return { persisted: true, boardSessionId: existing.id, updated: true }
  }

  const { data: created, error: createError } = await service
    .from('board_sessions')
    .insert(sessionPayload)
    .select('id')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message || 'Não foi possível salvar a sessão do Decision Room')
  }

  return { persisted: true, boardSessionId: created.id as string, updated: false }
}
