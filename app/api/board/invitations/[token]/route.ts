import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function invitationFor(token: string) {
  const service = serviceClient()
  const { data: participant, error } = await service
    .from('board_participants')
    .select('id, board_session_id, board_pack_id, company_id, email, display_name, role_label, status, invite_expires_at, accepted_at')
    .eq('access_token_hash', tokenHash(token))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!participant) return null

  const [{ data: company, error: companyError }, { data: session, error: sessionError }] = await Promise.all([
    service.from('companies').select('id, name').eq('id', participant.company_id).single(),
    service
      .from('board_sessions')
      .select('id, active_question, meeting_timezone, current_phase, phase_deadline_at, status')
      .eq('id', participant.board_session_id)
      .single(),
  ])

  if (companyError) throw new Error(companyError.message)
  if (sessionError) throw new Error(sessionError.message)
  return { participant, company, session }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params
    const invitation = await invitationFor(token)
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    const expired = Boolean(
      invitation.participant.invite_expires_at
      && new Date(invitation.participant.invite_expires_at).getTime() <= Date.now(),
    )

    return NextResponse.json({
      invitation: {
        company_name: invitation.company.name,
        display_name: invitation.participant.display_name,
        role_label: invitation.participant.role_label,
        active_question: invitation.session.active_question,
        meeting_timezone: invitation.session.meeting_timezone,
        current_phase: invitation.session.current_phase,
        phase_deadline_at: invitation.session.phase_deadline_at,
        status: expired ? 'expired' : invitation.participant.status,
        requires_login: true,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load the invitation' },
      { status: 500 },
    )
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in before accepting this invitation' }, { status: 401 })

  try {
    const { token } = await context.params
    const invitation = await invitationFor(token)
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    const participant = invitation.participant
    if (participant.invite_expires_at && new Date(participant.invite_expires_at).getTime() <= Date.now()) {
      await serviceClient()
        .from('board_participants')
        .update({ status: 'expired' })
        .eq('id', participant.id)
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
    }
    if (participant.status === 'revoked' || participant.status === 'declined') {
      return NextResponse.json({ error: 'This invitation is no longer active' }, { status: 410 })
    }
    if (!user.email || user.email.toLowerCase() !== participant.email?.toLowerCase()) {
      return NextResponse.json(
        { error: `Sign in with ${participant.email} to accept this board seat` },
        { status: 403 },
      )
    }

    const now = new Date().toISOString()
    const service = serviceClient()
    const { error: updateError } = await service
      .from('board_participants')
      .update({
        user_id: user.id,
        status: 'accepted',
        accepted_at: participant.accepted_at ?? now,
        access_token_hash: null,
      })
      .eq('id', participant.id)
    if (updateError) throw new Error(updateError.message)

    await service.from('audit_events').insert({
      company_id: participant.company_id,
      actor_user_id: user.id,
      event_type: 'board.participant_accepted',
      entity_type: 'board_participant',
      entity_id: participant.id,
      metadata: {
        board_session_id: participant.board_session_id,
        board_pack_id: participant.board_pack_id,
      },
    })

    return NextResponse.json({
      persisted: true,
      participant_id: participant.id,
      board_session_id: participant.board_session_id,
      redirect_to: '/board',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept this invitation' },
      { status: 500 },
    )
  }
}
