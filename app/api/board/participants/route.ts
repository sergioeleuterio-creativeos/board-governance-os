import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { renderBoardInvitationEmail } from '@/lib/email/templates'
import { sendProductEmail } from '@/lib/email/send'
import { recordNotificationAudit } from '@/lib/email/audit'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function cleanEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return email.includes('@') && email.length <= 320 ? email : null
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const sessionId = typeof body?.board_session_id === 'string' ? body.board_session_id : ''
  const email = cleanEmail(body?.email)
  const displayName = typeof body?.display_name === 'string' && body.display_name.trim()
    ? body.display_name.trim().slice(0, 120)
    : email?.split('@')[0] ?? ''
  const roleLabel = typeof body?.role_label === 'string' && body.role_label.trim()
    ? body.role_label.trim().slice(0, 120)
    : 'Board member'
  const previewOnly = body?.delivery_mode === 'preview'

  if (!sessionId || !email) {
    return NextResponse.json({ error: 'board_session_id and a valid email are required' }, { status: 400 })
  }

  try {
    const service = serviceClient()
    const { data: session, error: sessionError } = await service
      .from('board_sessions')
      .select('id, organization_id, company_id, board_pack_id, active_question, phase_deadline_at, meeting_timezone')
      .eq('id', sessionId)
      .eq('metadata->>async_board', 'true')
      .maybeSingle()

    if (sessionError || !session?.board_pack_id) {
      return NextResponse.json({ error: sessionError?.message || 'Board meeting not found' }, { status: 404 })
    }

    const access = await requireCompanyAdmin(session.company_id)
    if (isAuthError(access)) return access

    const [{ data: company, error: companyError }, { data: existing, error: existingError }] = await Promise.all([
      service.from('companies').select('name').eq('id', session.company_id).single(),
      service
        .from('board_participants')
        .select('id, status')
        .eq('board_session_id', session.id)
        .eq('email', email)
        .maybeSingle(),
    ])

    if (companyError) throw new Error(companyError.message)
    if (existingError) throw new Error(existingError.message)

    const rawToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    const participantPayload = {
      organization_id: session.organization_id,
      company_id: session.company_id,
      board_session_id: session.id,
      board_pack_id: session.board_pack_id,
      participant_type: 'human',
      email,
      display_name: displayName,
      role_label: roleLabel,
      status: 'invited',
      access_token_hash: tokenHash(rawToken),
      invite_expires_at: expiresAt,
      invited_by: user.id,
      invited_at: now,
      accepted_at: null,
      revoked_at: null,
      metadata: { delivery_mode: previewOnly ? 'preview' : 'email' },
    }

    const { data: participant, error: participantError } = existing
      ? await service
        .from('board_participants')
        .update(participantPayload)
        .eq('id', existing.id)
        .select('id')
        .single()
      : await service
        .from('board_participants')
        .insert(participantPayload)
        .select('id')
        .single()

    if (participantError || !participant) {
      throw new Error(participantError?.message || 'Could not create the board invitation')
    }

    const invitationUrl = `${getPublicAppUrl()}/board/invitations/${rawToken}`
    let notification: { sent: boolean; skipped: boolean; error: string | null } = {
      sent: false,
      skipped: previewOnly,
      error: null,
    }

    if (!previewOnly) {
      try {
        const deadline = session.phase_deadline_at
          ? new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: session.meeting_timezone,
          }).format(new Date(session.phase_deadline_at))
          : 'O Chair confirmará a janela de contribuição.'
        const message = renderBoardInvitationEmail({
          inviteeName: displayName,
          companyName: company.name,
          roleLabel,
          activeQuestion: session.active_question || 'Qual decisão o board deve recomendar?',
          deadlineLabel: `Primeira janela até ${deadline}`,
          invitationUrl,
        })
        const delivery = await sendProductEmail({ to: email, ...message })
        notification = {
          sent: !('skipped' in delivery && delivery.skipped),
          skipped: 'skipped' in delivery && delivery.skipped === true,
          error: null,
        }
      } catch (error) {
        notification = {
          sent: false,
          skipped: false,
          error: error instanceof Error ? error.message : 'Invitation email failed',
        }
      }
    }

    await service
      .from('board_participants')
      .update({ last_notified_at: notification.sent ? now : null })
      .eq('id', participant.id)

    await recordNotificationAudit({
      service,
      organizationId: session.organization_id,
      companyId: session.company_id,
      actorUserId: user.id,
      eventType: 'board.participant_invited',
      entityType: 'board_participant',
      entityId: participant.id,
      status: notification.sent ? 'sent' : notification.error ? 'failed' : 'skipped',
      recipientCount: notification.sent ? 1 : 0,
      error: notification.error,
      metadata: {
        board_session_id: session.id,
        board_pack_id: session.board_pack_id,
        expires_at: expiresAt,
        role_label: roleLabel,
      },
    })

    return NextResponse.json({
      persisted: true,
      participant_id: participant.id,
      invitation_url: invitationUrl,
      expires_at: expiresAt,
      notification,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not invite this board member' },
      { status: 500 },
    )
  }
}
