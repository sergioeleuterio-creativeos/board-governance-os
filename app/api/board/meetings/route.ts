import { NextRequest, NextResponse } from 'next/server'
import { canonicalSnapshotHash } from '@/lib/board/source-snapshot'
import { buildPhaseSchedule, isValidTimezone } from '@/lib/board/meeting-schedule'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

type ParticipantRow = {
  id: string
  participant_type: 'human' | 'synthetic'
  user_id: string | null
  email: string | null
  display_name: string
  role_label: string
  advisor_key: string | null
  status: string
  accepted_at: string | null
}

type ContributionRow = {
  id: string
  participant_id: string
  reply_to_id: string | null
  contribution_type: string
  phase: string
  body: string
  source_references: unknown
  visibility: 'sealed' | 'released'
  submitted_at: string
  released_at: string | null
  author_snapshot: Record<string, unknown>
}

const ADVISOR_LABELS: Record<string, { code: string; role: string }> = {
  board_brain: { code: 'BB', role: 'Chair' },
  finance: { code: 'CFO', role: 'Finance' },
  operator: { code: 'COO', role: 'Operations' },
  growth: { code: 'CMO', role: 'Growth' },
  risk: { code: 'RISK', role: 'Risk' },
  customer: { code: 'CX', role: 'Customer' },
  talent: { code: 'PEOPLE', role: 'People' },
}

function meetingQuestion(value: unknown) {
  return typeof value === 'string' && value.trim().length >= 10 ? value.trim() : null
}

function meetingTimezone(value: unknown) {
  const timezone = typeof value === 'string' ? value.trim() : ''
  return timezone && isValidTimezone(timezone) ? timezone : 'America/Sao_Paulo'
}

function meetingStart(value: unknown) {
  const parsed = typeof value === 'string' ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

async function loadMeeting(userId: string, sessionId: string, canManage: boolean) {
  const service = serviceClient()
  const { data: session, error: sessionError } = await service
    .from('board_sessions')
    .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, status, meeting_timezone, current_phase, phase_started_at, phase_deadline_at, phase_schedule, source_snapshot_id, source_snapshot_hash, active_question, metadata, opened_at, closed_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) throw new Error(sessionError.message)
  if (!session?.board_pack_id) return null

  const [companyResult, packResult, participantsResult, contributionsResult] = await Promise.all([
    service
      .from('companies')
      .select('id, name')
      .eq('id', session.company_id)
      .single(),
    service
      .from('board_packs')
      .select('id, version, status, executive_summary, strategic_questions, meeting_agenda, decision_candidates, locked_at, released_at, content_hash, source_snapshot_id, source_snapshot_hash')
      .eq('id', session.board_pack_id)
      .single(),
    service
      .from('board_participants')
      .select('id, participant_type, user_id, email, display_name, role_label, advisor_key, status, accepted_at')
      .eq('board_session_id', session.id)
      .order('participant_type', { ascending: false })
      .order('created_at', { ascending: true }),
    service
      .from('board_contributions')
      .select('id, participant_id, reply_to_id, contribution_type, phase, body, source_references, visibility, submitted_at, released_at, author_snapshot')
      .eq('board_session_id', session.id)
      .order('submitted_at', { ascending: true }),
  ])

  if (companyResult.error) throw new Error(companyResult.error.message)
  if (packResult.error) throw new Error(packResult.error.message)
  if (participantsResult.error) throw new Error(participantsResult.error.message)
  if (contributionsResult.error) throw new Error(contributionsResult.error.message)

  const participants = (participantsResult.data ?? []) as ParticipantRow[]
  const callerParticipant = participants.find(participant => participant.user_id === userId) ?? null
  const hasParticipantAccess = Boolean(callerParticipant && ['accepted', 'active'].includes(callerParticipant.status))
  if (!canManage && !hasParticipantAccess) return null

  const contributions = ((contributionsResult.data ?? []) as ContributionRow[])
    .filter(contribution => (
      contribution.visibility === 'released'
      || contribution.participant_id === callerParticipant?.id
    ))

  return {
    company: companyResult.data,
    meeting: session,
    board_pack: packResult.data,
    participants,
    contributions,
    caller_participant_id: callerParticipant?.id ?? null,
    can_manage: canManage,
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const service = serviceClient()
    const company = await getCurrentCompanyForUser(user)
    let sessionId: string | null = null
    let canManage = false

    if (company) {
      const access = await requireCompanyAdmin(company.id)
      canManage = !isAuthError(access)
      if (canManage) {
        const { data: ownedSession, error } = await service
          .from('board_sessions')
          .select('id')
          .eq('company_id', company.id)
          .eq('metadata->>async_board', 'true')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) throw new Error(error.message)
        sessionId = ownedSession?.id ?? null
      }
    }

    if (!sessionId) {
      const { data: participant, error } = await service
        .from('board_participants')
        .select('board_session_id')
        .eq('user_id', user.id)
        .in('status', ['accepted', 'active'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      sessionId = participant?.board_session_id ?? null
      canManage = false
    }

    const active = sessionId ? await loadMeeting(user.id, sessionId, canManage) : null

    const { data: availablePack, error: packError } = company && canManage && !active
      ? await service
        .from('board_packs')
        .select('id, version, status, executive_summary, strategic_questions, meeting_agenda, decision_candidates, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null, error: null }

    if (packError) throw new Error(packError.message)

    return NextResponse.json({
      active,
      available_pack: availablePack ?? null,
      company: company ? { id: company.id, name: company.name } : null,
      can_manage: canManage,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load the board meeting' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const boardPackId = typeof body?.board_pack_id === 'string' ? body.board_pack_id : ''
  const question = meetingQuestion(body?.active_question)
  if (!boardPackId || !question) {
    return NextResponse.json({ error: 'board_pack_id and a specific board question are required' }, { status: 400 })
  }

  try {
    const service = serviceClient()
    const { data: pack, error: packError } = await service
      .from('board_packs')
      .select('id, organization_id, company_id, governance_cycle_id, version, status, executive_summary, strategic_questions, risk_map, priority_ranking, meeting_agenda, decision_candidates, export_payload')
      .eq('id', boardPackId)
      .maybeSingle()

    if (packError || !pack) {
      return NextResponse.json({ error: packError?.message || 'Board pack not found' }, { status: 404 })
    }

    const access = await requireCompanyAdmin(pack.company_id)
    if (isAuthError(access)) return access

    const { data: existing, error: existingError } = await service
      .from('board_sessions')
      .select('id')
      .eq('board_pack_id', pack.id)
      .eq('metadata->>async_board', 'true')
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (existing?.id) {
      return NextResponse.json({
        persisted: true,
        board_session_id: existing.id,
        reused: true,
      })
    }

    const timezone = meetingTimezone(body?.timezone)
    const startsAt = meetingStart(body?.starts_at)
    const cadence = body?.cadence === 'compressed' ? 'compressed' : 'normal'
    const schedule = buildPhaseSchedule(startsAt, cadence)
    const firstPhase = schedule[0]
    const contentHash = canonicalSnapshotHash({
      id: pack.id,
      version: pack.version,
      executive_summary: pack.executive_summary,
      strategic_questions: pack.strategic_questions,
      risk_map: pack.risk_map,
      priority_ranking: pack.priority_ranking,
      meeting_agenda: pack.meeting_agenda,
      decision_candidates: pack.decision_candidates,
      export_payload: pack.export_payload,
      active_question: question,
    })

    const { data: sourceSession, error: sourceError } = await service
      .from('board_sessions')
      .select('source_snapshot_id, source_snapshot_hash')
      .eq('company_id', pack.company_id)
      .not('source_snapshot_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (sourceError) throw new Error(sourceError.message)

    const now = new Date().toISOString()
    const { data: created, error: createError } = await service
      .from('board_sessions')
      .insert({
        organization_id: pack.organization_id,
        company_id: pack.company_id,
        governance_cycle_id: pack.governance_cycle_id,
        board_pack_id: pack.id,
        started_by: user.id,
        session_type: 'virtual_review',
        status: 'open',
        opened_at: now,
        meeting_timezone: timezone,
        current_phase: firstPhase.phase,
        phase_started_at: firstPhase.startsAt,
        phase_deadline_at: firstPhase.endsAt,
        phase_schedule: schedule,
        source_snapshot_id: sourceSession?.source_snapshot_id ?? null,
        source_snapshot_hash: sourceSession?.source_snapshot_hash ?? null,
        active_question: question,
        question_confirmed_at: now,
        metadata: {
          async_board: true,
          cadence,
          pack_content_hash: contentHash,
          created_by: user.id,
        },
      })
      .select('id')
      .single()

    if (createError || !created) throw new Error(createError?.message || 'Could not create the board meeting')

    const { data: profile } = await service
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const { error: founderError } = await service.from('board_participants').insert({
      organization_id: pack.organization_id,
      company_id: pack.company_id,
      board_session_id: created.id,
      board_pack_id: pack.id,
      participant_type: 'human',
      user_id: user.id,
      email: profile?.email ?? user.email ?? null,
      display_name: profile?.full_name || user.email?.split('@')[0] || 'Founder',
      role_label: 'Founder',
      status: 'active',
      accepted_at: now,
      invited_by: user.id,
      invited_at: now,
      metadata: { founder: true },
    })
    if (founderError) throw new Error(founderError.message)

    const { data: reviews, error: reviewsError } = await service
      .from('agent_reviews')
      .select('advisor_key, advisor_name, perspective, recommendations, source_references')
      .eq('board_pack_id', pack.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: true })
    if (reviewsError) throw new Error(reviewsError.message)

    for (const review of reviews ?? []) {
      const label = ADVISOR_LABELS[review.advisor_key] ?? { code: review.advisor_key.toUpperCase(), role: 'Advisor' }
      const { data: participant, error: participantError } = await service
        .from('board_participants')
        .insert({
          organization_id: pack.organization_id,
          company_id: pack.company_id,
          board_session_id: created.id,
          board_pack_id: pack.id,
          participant_type: 'synthetic',
          display_name: review.advisor_name,
          role_label: label.role,
          advisor_key: review.advisor_key,
          status: 'active',
          accepted_at: now,
          invited_by: user.id,
          invited_at: now,
          metadata: { code: label.code },
        })
        .select('id')
        .single()
      if (participantError || !participant) throw new Error(participantError?.message || 'Could not add a synthetic advisor')

      const recommendations = Array.isArray(review.recommendations)
        ? review.recommendations.map(String).join('\n')
        : ''
      const bodyText = [review.perspective, recommendations].filter(Boolean).join('\n\n')
      if (!bodyText.trim()) continue

      const authorSnapshot = {
        participant_type: 'synthetic',
        display_name: review.advisor_name,
        role_label: label.role,
        advisor_key: review.advisor_key,
      }
      const contributionHash = canonicalSnapshotHash({
        session_id: created.id,
        participant_id: participant.id,
        phase: 'independent_analysis',
        body: bodyText,
        author: authorSnapshot,
        pack_content_hash: contentHash,
      })
      const { error: contributionError } = await service.from('board_contributions').insert({
        organization_id: pack.organization_id,
        company_id: pack.company_id,
        board_session_id: created.id,
        board_pack_id: pack.id,
        participant_id: participant.id,
        contribution_type: 'independent_analysis',
        phase: 'independent_analysis',
        body: bodyText,
        source_references: review.source_references ?? [],
        visibility: 'sealed',
        author_snapshot: authorSnapshot,
        immutable_hash: contributionHash,
        metadata: { imported_from: 'agent_reviews' },
      })
      if (contributionError) throw new Error(contributionError.message)
    }

    const { error: packUpdateError } = await service
      .from('board_packs')
      .update({
        status: 'sent_to_review',
        locked_at: now,
        released_at: now,
        released_by: user.id,
        content_hash: contentHash,
        source_snapshot_id: sourceSession?.source_snapshot_id ?? null,
        source_snapshot_hash: sourceSession?.source_snapshot_hash ?? null,
      })
      .eq('id', pack.id)
    if (packUpdateError) throw new Error(packUpdateError.message)

    await service.from('audit_events').insert({
      organization_id: pack.organization_id,
      company_id: pack.company_id,
      actor_user_id: user.id,
      event_type: 'board.meeting_released',
      entity_type: 'board_session',
      entity_id: created.id,
      metadata: {
        board_pack_id: pack.id,
        pack_content_hash: contentHash,
        timezone,
        cadence,
      },
    })

    return NextResponse.json({
      persisted: true,
      board_session_id: created.id,
      board_pack_id: pack.id,
      content_hash: contentHash,
      schedule,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start the board meeting' },
      { status: 500 },
    )
  }
}
