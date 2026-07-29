import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/auth-server'
import { canonicalSnapshotHash } from '@/lib/board/source-snapshot'
import {
  BOARD_PHASES,
  phaseAt,
  phasesReleasedBetween,
  type BoardPhase,
  type PhaseScheduleEntry,
} from '@/lib/board/meeting-schedule'

type SessionRow = {
  id: string
  organization_id: string
  company_id: string
  governance_cycle_id: string
  board_pack_id: string
  current_phase: BoardPhase
  phase_schedule: PhaseScheduleEntry[]
  active_question: string | null
  metadata: Record<string, unknown>
}

type ParticipantRow = {
  id: string
  participant_type: 'human' | 'synthetic'
  display_name: string
  role_label: string
  advisor_key: string | null
}

type ContributionRow = {
  id: string
  participant_id: string
  phase: string
  body: string
  contribution_type: string
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

async function generatedAlready(service: SupabaseClient, sessionId: string, phase: BoardPhase) {
  const { data, error } = await service
    .from('board_contributions')
    .select('id')
    .eq('board_session_id', sessionId)
    .eq('phase', phase)
    .eq('metadata->>generated_by', 'board-phase-cron')
    .limit(1)
  if (error) throw new Error(error.message)
  return Boolean(data?.length)
}

async function insertGeneratedContribution(
  service: SupabaseClient,
  session: SessionRow,
  participant: ParticipantRow,
  input: {
    phase: BoardPhase
    contributionType: string
    body: string
    replyToId?: string | null
    visibility?: 'sealed' | 'released'
  },
) {
  const now = new Date().toISOString()
  const authorSnapshot = {
    participant_type: participant.participant_type,
    display_name: participant.display_name,
    role_label: participant.role_label,
    advisor_key: participant.advisor_key,
  }
  const immutableHash = canonicalSnapshotHash({
    session_id: session.id,
    pack_id: session.board_pack_id,
    participant_id: participant.id,
    phase: input.phase,
    contribution_type: input.contributionType,
    body: input.body,
    reply_to_id: input.replyToId ?? null,
    author_snapshot: authorSnapshot,
  })
  const visibility = input.visibility ?? 'released'
  const { error } = await service.from('board_contributions').insert({
    organization_id: session.organization_id,
    company_id: session.company_id,
    board_session_id: session.id,
    board_pack_id: session.board_pack_id,
    participant_id: participant.id,
    reply_to_id: input.replyToId ?? null,
    contribution_type: input.contributionType,
    phase: input.phase,
    body: input.body,
    source_references: [
      `board_pack:${session.board_pack_id}`,
      `board_session:${session.id}`,
    ],
    visibility,
    submitted_at: now,
    released_at: visibility === 'released' ? now : null,
    author_snapshot: authorSnapshot,
    immutable_hash: immutableHash,
    metadata: { generated_by: 'board-phase-cron' },
  })
  if (error) throw new Error(error.message)
}

async function generatePhaseContributions(
  service: SupabaseClient,
  session: SessionRow,
  phase: BoardPhase,
) {
  if (!['peer_challenge', 'final_positions', 'chair_synthesis', 'closed'].includes(phase)) return
  if (await generatedAlready(service, session.id, phase)) return

  const [{ data: participantData, error: participantError }, { data: contributionData, error: contributionError }] = await Promise.all([
    service
      .from('board_participants')
      .select('id, participant_type, display_name, role_label, advisor_key')
      .eq('board_session_id', session.id)
      .in('status', ['accepted', 'active'])
      .order('created_at', { ascending: true }),
    service
      .from('board_contributions')
      .select('id, participant_id, phase, body, contribution_type')
      .eq('board_session_id', session.id)
      .eq('visibility', 'released')
      .order('submitted_at', { ascending: true }),
  ])
  if (participantError) throw new Error(participantError.message)
  if (contributionError) throw new Error(contributionError.message)

  const participants = (participantData ?? []) as ParticipantRow[]
  const contributions = (contributionData ?? []) as ContributionRow[]
  const synthetic = participants.filter(participant => participant.participant_type === 'synthetic')
  const chair = synthetic.find(participant => participant.advisor_key === 'board_brain') ?? synthetic[0]

  if (phase === 'peer_challenge') {
    for (let index = 0; index < synthetic.length; index += 1) {
      const participant = synthetic[index]
      const target = synthetic[(index + 1) % synthetic.length]
      if (!target || target.id === participant.id) continue
      const targetAnalysis = contributions.find(item => (
        item.participant_id === target.id && item.phase === 'independent_analysis'
      ))
      const targetExcerpt = targetAnalysis?.body.replace(/\s+/g, ' ').slice(0, 360)
        || 'A análise independente ainda não explicita a evidência que mudaria a recomendação.'
      await insertGeneratedContribution(service, session, participant, {
        phase,
        contributionType: 'challenge',
        replyToId: targetAnalysis?.id ?? null,
        body: `Minha pergunta para ${target.display_name}: ${targetExcerpt}\n\nQual hipótese precisa ser verdadeira, qual evidência a prova, e qual condição faria você mudar de posição?`,
      })
    }
    return
  }

  if (phase === 'final_positions') {
    for (const participant of synthetic) {
      const ownAnalysis = contributions.find(item => (
        item.participant_id === participant.id && item.phase === 'independent_analysis'
      ))
      const challenges = contributions
        .filter(item => item.phase === 'peer_challenge')
        .slice(0, 3)
        .map(item => item.body.replace(/\s+/g, ' ').slice(0, 180))
      await insertGeneratedContribution(service, session, participant, {
        phase,
        contributionType: 'final_position',
        visibility: 'sealed',
        body: [
          `Posição final de ${participant.display_name}.`,
          ownAnalysis?.body || 'Mantenho a cautela até que a evidência central seja confirmada.',
          challenges.length ? `Depois das contestações: ${challenges.join(' | ')}` : null,
          'Recomendação: avançar apenas com dono, evidência, limite e data de revisão explícitos.',
        ].filter(Boolean).join('\n\n'),
      })
    }
    return
  }

  if (!chair) return
  const released = contributions.slice(-18)
  const humanCount = participants.filter(participant => participant.participant_type === 'human').length
  const evidence = released
    .slice(-8)
    .map(item => item.body.replace(/\s+/g, ' ').slice(0, 220))
    .join(' | ')
  const synthesis = [
    `Decisão em pauta: ${session.active_question || 'decisão não nomeada'}`,
    `O board reuniu ${participants.length} assentos — ${humanCount} humanos e ${synthetic.length} sintéticos.`,
    evidence ? `O que mudou durante a deliberação: ${evidence}` : 'Ainda não há contribuição liberada suficiente para uma recomendação responsável.',
    'Recomendação do Chair: registrar a escolha, as condições que a sustentam, o responsável, e a data em que a evidência será revista.',
  ].join('\n\n')

  await insertGeneratedContribution(service, session, chair, {
    phase,
    contributionType: phase === 'closed' ? 'minutes_note' : 'chair_synthesis',
    body: synthesis,
  })

  if (phase === 'closed') {
    const now = new Date().toISOString()
    const meetingPayload = {
        organization_id: session.organization_id,
        company_id: session.company_id,
        governance_cycle_id: session.governance_cycle_id,
        board_session_id: session.id,
        scheduled_at: session.phase_schedule[0]?.startsAt ?? now,
        started_at: session.phase_schedule[0]?.startsAt ?? now,
        ended_at: now,
        status: 'complete',
        attendees: participants.map(participant => ({
          id: participant.id,
          name: participant.display_name,
          type: participant.participant_type,
          role: participant.role_label,
        })),
        orchestrator_summary: synthesis,
      }
    const { data: existingMeeting, error: existingMeetingError } = await service
      .from('board_meetings')
      .select('id')
      .eq('board_session_id', session.id)
      .limit(1)
      .maybeSingle()
    if (existingMeetingError) throw new Error(existingMeetingError.message)

    const { data: meeting, error: meetingError } = existingMeeting
      ? await service
        .from('board_meetings')
        .update(meetingPayload)
        .eq('id', existingMeeting.id)
        .select('id')
        .single()
      : await service
        .from('board_meetings')
        .insert(meetingPayload)
        .select('id')
        .single()
    if (meetingError || !meeting) throw new Error(meetingError?.message || 'Could not close the board meeting')

    const { error: minutesError } = await service.from('meeting_minutes').insert({
      organization_id: session.organization_id,
      company_id: session.company_id,
      governance_cycle_id: session.governance_cycle_id,
      board_meeting_id: meeting.id,
      board_session_id: session.id,
      minutes: synthesis,
      conflicts_identified: contributions
        .filter(item => item.contribution_type === 'challenge')
        .map(item => item.body.slice(0, 500)),
      final_recommendation: synthesis,
      closure_recommendation: 'commit_with_conditions',
    })
    if (minutesError) throw new Error(minutesError.message)
  }
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
  }

  const service = serviceClient()
  const now = new Date()
  const { data, error } = await service
    .from('board_sessions')
    .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, current_phase, phase_schedule, active_question, metadata')
    .eq('metadata->>async_board', 'true')
    .neq('current_phase', 'closed')
    .lte('phase_deadline_at', now.toISOString())
    .order('phase_deadline_at', { ascending: true })
    .limit(25)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ id: string; from: BoardPhase; to: BoardPhase; released: BoardPhase[] }> = []

  for (const rawSession of data ?? []) {
    const session = rawSession as SessionRow
    const target = phaseAt(session.phase_schedule, now)
    const currentIndex = BOARD_PHASES.indexOf(session.current_phase)
    const targetIndex = BOARD_PHASES.indexOf(target.phase)
    if (targetIndex <= currentIndex) continue

    const crossed = BOARD_PHASES.slice(currentIndex + 1, targetIndex + 1)
    const releasedPhases = phasesReleasedBetween(session.phase_schedule, session.current_phase, target.phase)
    const releasedPhaseSet = new Set<BoardPhase>(releasedPhases)
    if (releasedPhases.length) {
      const { error: releaseError } = await service
        .from('board_contributions')
        .update({ visibility: 'released', released_at: now.toISOString() })
        .eq('board_session_id', session.id)
        .eq('visibility', 'sealed')
        .in('phase', releasedPhases)
      if (releaseError) throw new Error(releaseError.message)
    }

    for (const phase of crossed) {
      await generatePhaseContributions(service, session, phase)
      if (releasedPhaseSet.has(phase)) {
        const { error: generatedReleaseError } = await service
          .from('board_contributions')
          .update({ visibility: 'released', released_at: now.toISOString() })
          .eq('board_session_id', session.id)
          .eq('phase', phase)
          .eq('visibility', 'sealed')
        if (generatedReleaseError) throw new Error(generatedReleaseError.message)
      }
    }

    const { error: updateError } = await service
      .from('board_sessions')
      .update({
        current_phase: target.phase,
        phase_started_at: target.startsAt,
        phase_deadline_at: target.endsAt,
        status: target.phase === 'closed' ? 'closed' : 'in_review',
        closed_at: target.phase === 'closed' ? now.toISOString() : null,
        metadata: {
          ...session.metadata,
          last_phase_advanced_at: now.toISOString(),
        },
      })
      .eq('id', session.id)
      .eq('current_phase', session.current_phase)
    if (updateError) throw new Error(updateError.message)

    results.push({
      id: session.id,
      from: session.current_phase,
      to: target.phase,
      released: releasedPhases,
    })
  }

  const { error: expiryError } = await service
    .from('board_participants')
    .update({ status: 'expired' })
    .eq('status', 'invited')
    .lte('invite_expires_at', now.toISOString())
  if (expiryError) throw new Error(expiryError.message)

  return NextResponse.json({
    processed: data?.length ?? 0,
    advanced: results.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
