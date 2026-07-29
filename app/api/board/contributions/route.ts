import { NextRequest, NextResponse } from 'next/server'
import { canonicalSnapshotHash } from '@/lib/board/source-snapshot'
import {
  contributionStartsSealed,
  contributionTypeForPhase,
  type BoardPhase,
  BOARD_PHASES,
} from '@/lib/board/meeting-schedule'
import { getSessionUser, serviceClient } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const sessionId = typeof input?.board_session_id === 'string' ? input.board_session_id : ''
  const body = typeof input?.body === 'string' ? input.body.trim() : ''
  const contributionType = typeof input?.contribution_type === 'string' ? input.contribution_type : ''
  const replyToId = typeof input?.reply_to_id === 'string' ? input.reply_to_id : null

  if (!sessionId || body.length < 2 || body.length > 12000) {
    return NextResponse.json({ error: 'A board session and a contribution are required' }, { status: 400 })
  }

  try {
    const service = serviceClient()
    const { data: session, error: sessionError } = await service
      .from('board_sessions')
      .select('id, organization_id, company_id, board_pack_id, current_phase, status, source_snapshot_id, source_snapshot_hash, metadata')
      .eq('id', sessionId)
      .eq('metadata->>async_board', 'true')
      .maybeSingle()

    if (sessionError || !session?.board_pack_id) {
      return NextResponse.json({ error: sessionError?.message || 'Board meeting not found' }, { status: 404 })
    }
    if (!BOARD_PHASES.includes(session.current_phase as BoardPhase) || session.current_phase === 'closed') {
      return NextResponse.json({ error: 'This meeting is closed' }, { status: 409 })
    }

    const phase = session.current_phase as BoardPhase
    if (!contributionTypeForPhase(phase).includes(contributionType)) {
      return NextResponse.json(
        { error: `Contribution type ${contributionType || 'missing'} is not open during ${phase}` },
        { status: 409 },
      )
    }

    const { data: participant, error: participantError } = await service
      .from('board_participants')
      .select('id, participant_type, display_name, role_label, advisor_key, status')
      .eq('board_session_id', session.id)
      .eq('user_id', user.id)
      .in('status', ['accepted', 'active'])
      .maybeSingle()

    if (participantError) throw new Error(participantError.message)
    if (!participant) return NextResponse.json({ error: 'You do not hold a seat in this board meeting' }, { status: 403 })

    if (replyToId) {
      const { data: replied, error: replyError } = await service
        .from('board_contributions')
        .select('id, visibility')
        .eq('id', replyToId)
        .eq('board_session_id', session.id)
        .maybeSingle()
      if (replyError) throw new Error(replyError.message)
      if (!replied || replied.visibility !== 'released') {
        return NextResponse.json({ error: 'You can only reply to a released contribution in this meeting' }, { status: 409 })
      }
    }

    const { data: pack, error: packError } = await service
      .from('board_packs')
      .select('content_hash, source_snapshot_id, source_snapshot_hash')
      .eq('id', session.board_pack_id)
      .single()
    if (packError) throw new Error(packError.message)

    const authorSnapshot = {
      participant_type: participant.participant_type,
      display_name: participant.display_name,
      role_label: participant.role_label,
      advisor_key: participant.advisor_key,
    }
    const sourceReferences = [
      `board_pack:${session.board_pack_id}:${pack.content_hash}`,
      pack.source_snapshot_id ? `source_snapshot:${pack.source_snapshot_id}:${pack.source_snapshot_hash}` : null,
    ].filter(Boolean)
    const submittedAt = new Date().toISOString()
    const visibility = contributionStartsSealed(phase) ? 'sealed' : 'released'
    const immutableHash = canonicalSnapshotHash({
      board_session_id: session.id,
      board_pack_id: session.board_pack_id,
      participant_id: participant.id,
      reply_to_id: replyToId,
      contribution_type: contributionType,
      phase,
      body,
      source_references: sourceReferences,
      author_snapshot: authorSnapshot,
      submitted_at: submittedAt,
    })

    const { data: contribution, error: insertError } = await service
      .from('board_contributions')
      .insert({
        organization_id: session.organization_id,
        company_id: session.company_id,
        board_session_id: session.id,
        board_pack_id: session.board_pack_id,
        participant_id: participant.id,
        reply_to_id: replyToId,
        contribution_type: contributionType,
        phase,
        body,
        source_references: sourceReferences,
        visibility,
        submitted_at: submittedAt,
        released_at: visibility === 'released' ? submittedAt : null,
        author_snapshot: authorSnapshot,
        immutable_hash: immutableHash,
        metadata: { submitted_by_user_id: user.id },
      })
      .select('id, visibility, submitted_at')
      .single()

    if (insertError || !contribution) {
      throw new Error(insertError?.message || 'Could not save this board contribution')
    }

    await service.from('audit_events').insert({
      organization_id: session.organization_id,
      company_id: session.company_id,
      actor_user_id: user.id,
      event_type: 'board.contribution_submitted',
      entity_type: 'board_contribution',
      entity_id: contribution.id,
      metadata: {
        board_session_id: session.id,
        phase,
        contribution_type: contributionType,
        visibility,
        immutable_hash: immutableHash,
      },
    })

    return NextResponse.json({
      persisted: true,
      contribution_id: contribution.id,
      visibility: contribution.visibility,
      submitted_at: contribution.submitted_at,
      immutable_hash: immutableHash,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save this board contribution' },
      { status: 500 },
    )
  }
}
