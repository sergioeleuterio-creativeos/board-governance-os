import { NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { consumeUsagePackageUnit } from '@/lib/billing-usage'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'
import { renderSessionClosedEmail } from '@/lib/email/templates'
import { sendProductEmail } from '@/lib/email/send'
import { recordNotificationAudit } from '@/lib/email/audit'

type ConversationRow = {
  id: string
  relationship: string
  summary: string | null
  conflicts: unknown
  agreements: unknown
}

type DecisionRow = {
  id: string
  title: string
  status: string
  closure_recommendation: string | null
  risk_level: string | null
  confidence_score: number | null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function flattenConflicts(conversations: ConversationRow[]) {
  return conversations.flatMap((conversation) => {
    const conflicts = asArray(conversation.conflicts)
    if (!conflicts.length && conversation.summary) {
      return [{
        conversation_id: conversation.id,
        relationship: conversation.relationship,
        conflict: conversation.summary,
      }]
    }

    return conflicts.map((conflict) => ({
      conversation_id: conversation.id,
      relationship: conversation.relationship,
      conflict,
    }))
  })
}

function buildMinutes({
  executiveSummary,
  closureSummary,
  closureRecommendation,
  conversations,
  decisions,
}: {
  executiveSummary: string | null
  closureSummary: string | null
  closureRecommendation: string | null
  conversations: ConversationRow[]
  decisions: DecisionRow[]
}) {
  const conversationLines = conversations.map((conversation) => {
    return `- ${conversation.relationship}: ${conversation.summary ?? 'conversa registrada sem resumo'}`
  })
  const decisionLines = decisions.map((decision) => {
    return `- ${decision.title}: ${decision.status}, ${decision.closure_recommendation ?? 'sem closure'}, confianca ${decision.confidence_score ?? 'n/a'}`
  })

  return [
    'Minuta gerada pelo Board Brain.',
    executiveSummary ? `Resumo executivo: ${executiveSummary}` : null,
    closureSummary ? `Closure: ${closureSummary}` : null,
    closureRecommendation ? `Recomendacao: ${closureRecommendation}` : null,
    conversations.length ? `Rodadas de desafio:\n${conversationLines.join('\n')}` : 'Rodadas de desafio: nenhuma conversa registrada.',
    decisions.length ? `Decisoes apresentadas:\n${decisionLines.join('\n')}` : 'Decisoes apresentadas: nenhuma decisao registrada para a sessao.',
  ].filter(Boolean).join('\n\n')
}

export async function POST() {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const service = serviceClient()

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ error: 'Nenhuma empresa ativa encontrada.' }, { status: 404 })

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const { data: session, error: sessionError } = await service
      .from('board_sessions')
      .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, status, closure_recommendation, closure_summary, usage_units_consumed, metadata')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) throw new Error(sessionError.message)
    if (!session) return NextResponse.json({ error: 'Nenhuma board session encontrada.' }, { status: 404 })

    let usagePackageId: string | null = null
    if (session.status !== 'closed') {
      const usage = await consumeUsagePackageUnit(session.organization_id, 'session')
      if (!usage.ok) {
        return NextResponse.json({ error: usage.error ?? 'Pacote de sessoes indisponivel.' }, { status: 402 })
      }
      usagePackageId = usage.packageId
    }

    const { data: boardPack, error: boardPackError } = session.board_pack_id
      ? await service
        .from('board_packs')
        .select('id, executive_summary, meeting_agenda')
        .eq('id', session.board_pack_id)
        .maybeSingle()
      : { data: null, error: null }

    if (boardPackError) throw new Error(boardPackError.message)

    const [{ data: conversations, error: conversationsError }, { data: decisions, error: decisionsError }] = await Promise.all([
      service
        .from('agent_conversations')
        .select('id, relationship, summary, conflicts, agreements')
        .eq('board_session_id', session.id)
        .order('created_at', { ascending: true }),
      service
        .from('decisions')
        .select('id, title, status, closure_recommendation, risk_level, confidence_score')
        .eq('board_session_id', session.id)
        .order('created_at', { ascending: true }),
    ])

    if (conversationsError) throw new Error(conversationsError.message)
    if (decisionsError) throw new Error(decisionsError.message)

    const conversationRows = (conversations ?? []) as ConversationRow[]
    const decisionRows = (decisions ?? []) as DecisionRow[]
    const decisionIds = decisionRows.map((decision) => decision.id)
    const { count: followUpCount, error: followUpCountError } = decisionIds.length
      ? await service
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .in('decision_id', decisionIds)
      : { count: 0, error: null }

    if (followUpCountError) throw new Error(followUpCountError.message)

    const conflictsIdentified = flattenConflicts(conversationRows)
    const decisionsPresented = decisionRows.map((decision) => ({
      id: decision.id,
      title: decision.title,
      status: decision.status,
      closure_recommendation: decision.closure_recommendation,
      risk_level: decision.risk_level,
      confidence_score: decision.confidence_score,
    }))
    const closureRecommendation = session.closure_recommendation ?? 'commit_with_conditions'
    const finalRecommendation = session.closure_summary ?? 'Encerrar sessao com decisoes, conflitos e follow-ups registrados para revisao do fundador.'
    const minutes = buildMinutes({
      executiveSummary: boardPack?.executive_summary ?? null,
      closureSummary: session.closure_summary,
      closureRecommendation,
      conversations: conversationRows,
      decisions: decisionRows,
    })

    const now = new Date().toISOString()
    const { data: existingMeeting, error: existingMeetingError } = await service
      .from('board_meetings')
      .select('id')
      .eq('board_session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingMeetingError) throw new Error(existingMeetingError.message)

    let boardMeetingId = existingMeeting?.id ?? null
    if (boardMeetingId) {
      const { error: updateMeetingError } = await service
        .from('board_meetings')
        .update({
          status: 'complete',
          ended_at: now,
          orchestrator_summary: finalRecommendation,
          agenda: boardPack?.meeting_agenda ?? [],
        })
        .eq('id', boardMeetingId)

      if (updateMeetingError) throw new Error(updateMeetingError.message)
    } else {
      const { data: createdMeeting, error: createMeetingError } = await service
        .from('board_meetings')
        .insert({
          organization_id: session.organization_id,
          company_id: session.company_id,
          governance_cycle_id: session.governance_cycle_id,
          board_session_id: session.id,
          started_at: now,
          ended_at: now,
          status: 'complete',
          agenda: boardPack?.meeting_agenda ?? [],
          attendees: ['Board Brain', 'Finance Advisor', 'Operator Advisor', 'Growth Advisor', 'Risk Advisor', 'Customer Advisor', 'Talent Advisor'],
          orchestrator_summary: finalRecommendation,
        })
        .select('id')
        .single()

      if (createMeetingError) throw new Error(createMeetingError.message)
      boardMeetingId = createdMeeting.id
    }

    const { data: existingMinutes, error: existingMinutesError } = await service
      .from('meeting_minutes')
      .select('id')
      .eq('board_session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingMinutesError) throw new Error(existingMinutesError.message)

    if (existingMinutes?.id) {
      const { error: updateMinutesError } = await service
        .from('meeting_minutes')
        .update({
          board_meeting_id: boardMeetingId,
          minutes,
          decisions_presented: decisionsPresented,
          conflicts_identified: conflictsIdentified,
          final_recommendation: finalRecommendation,
          closure_recommendation: closureRecommendation,
        })
        .eq('id', existingMinutes.id)

      if (updateMinutesError) throw new Error(updateMinutesError.message)
    } else {
      const { error: createMinutesError } = await service
        .from('meeting_minutes')
        .insert({
          organization_id: session.organization_id,
          company_id: session.company_id,
          governance_cycle_id: session.governance_cycle_id,
          board_meeting_id: boardMeetingId,
          board_session_id: session.id,
          minutes,
          decisions_presented: decisionsPresented,
          conflicts_identified: conflictsIdentified,
          final_recommendation: finalRecommendation,
          closure_recommendation: closureRecommendation,
        })

      if (createMinutesError) throw new Error(createMinutesError.message)
    }

    const metadata = {
      ...asRecord(session.metadata),
      closed_by: user.id,
      closed_via: 'shadow-board-review',
      minutes_generated_at: now,
      conflicts_identified: conflictsIdentified.length,
      decisions_presented: decisionsPresented.length,
      consumed_usage_package_id: usagePackageId,
    }

    const { error: closeError } = await service
      .from('board_sessions')
      .update({
        status: 'closed',
        closed_at: now,
        closure_recommendation: closureRecommendation,
        closure_summary: finalRecommendation,
        usage_units_consumed: Math.max(1, session.usage_units_consumed ?? 0),
        metadata,
      })
      .eq('id', session.id)

    if (closeError) throw new Error(closeError.message)

    await service.from('audit_events').insert({
      organization_id: session.organization_id,
      company_id: session.company_id,
      actor_user_id: user.id,
      event_type: 'shadow_board.session_closed',
      entity_type: 'board_session',
      entity_id: session.id,
      metadata: {
        board_meeting_id: boardMeetingId,
        decisions_presented: decisionsPresented.length,
        conflicts_identified: conflictsIdentified.length,
        closure_recommendation: closureRecommendation,
      },
    })

    let notification: { sent?: boolean; skipped?: boolean; error?: string } = { skipped: true }
    if (user.email) {
      try {
        const email = renderSessionClosedEmail({
          companyName: company.name,
          decisionCount: decisionsPresented.length,
          followUpCount: followUpCount ?? 0,
          appUrl: getPublicAppUrl(),
        })
        await sendProductEmail({ to: user.email, ...email })
        notification = { sent: true }
      } catch (emailError) {
        notification = { error: emailError instanceof Error ? emailError.message : 'notification_failed' }
      }
    }

    await recordNotificationAudit({
      service,
      organizationId: session.organization_id,
      companyId: session.company_id,
      actorUserId: user.id,
      eventType: 'notification.session_closed',
      entityType: 'board_session',
      entityId: session.id,
      status: notification.sent ? 'sent' : notification.error ? 'failed' : 'skipped',
      recipientCount: notification.sent ? 1 : 0,
      error: notification.error ?? null,
      metadata: {
        decision_count: decisionsPresented.length,
        follow_up_count: followUpCount ?? 0,
      },
    })

    return NextResponse.json({
      board_session_id: session.id,
      board_meeting_id: boardMeetingId,
      status: 'closed',
      closure_recommendation: closureRecommendation,
      minutes,
      decisions_presented: decisionsPresented.length,
      conflicts_identified: conflictsIdentified.length,
      notification,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel encerrar a sessao.' },
      { status: 500 }
    )
  }
}
