import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

type AgentReview = {
  id: string
  advisor_key: string
  advisor_name: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: unknown
  recommendations: unknown
}

const allowedAdvisorKeys = ['finance', 'operator', 'growth', 'risk', 'customer', 'talent'] as const

function asArray(value: unknown): Array<Record<string, unknown> | string> {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textFromItem(item: Record<string, unknown> | string) {
  if (typeof item === 'string') return item
  return [item.title, item.detail, item.description, item.priority].filter(Boolean).join(' - ')
}

function topTexts(value: unknown, limit = 3) {
  return asArray(value).map(textFromItem).filter(Boolean).slice(0, limit)
}

function stanceLabel(stance: string | null) {
  const labels: Record<string, string> = {
    support: 'apoio',
    support_with_conditions: 'apoio com condicoes',
    neutral: 'neutralidade',
    oppose: 'oposicao',
    needs_more_data: 'dados insuficientes',
  }
  return stance ? labels[stance] ?? stance : 'sem postura registrada'
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)
  const advisorKey = typeof body?.advisor_key === 'string' ? body.advisor_key : ''

  if (!allowedAdvisorKeys.includes(advisorKey as typeof allowedAdvisorKeys[number])) {
    return NextResponse.json({ error: 'Advisor invalido para aprofundamento.' }, { status: 400 })
  }

  const service = serviceClient()

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ error: 'Nenhuma empresa ativa encontrada.' }, { status: 404 })

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const { data: boardPack, error: boardPackError } = await service
      .from('board_packs')
      .select('id, organization_id, company_id, governance_cycle_id')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (boardPackError) throw new Error(boardPackError.message)
    if (!boardPack) return NextResponse.json({ error: 'Nenhum Board Pack encontrado.' }, { status: 404 })

    const { data: review, error: reviewError } = await service
      .from('agent_reviews')
      .select('id, advisor_key, advisor_name, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations')
      .eq('board_pack_id', boardPack.id)
      .eq('advisor_key', advisorKey)
      .maybeSingle()

    if (reviewError) throw new Error(reviewError.message)
    if (!review) return NextResponse.json({ error: 'Advisor ainda nao tem analise registrada.' }, { status: 404 })

    const { data: existingSession, error: existingSessionError } = await service
      .from('board_sessions')
      .select('id, metadata')
      .eq('board_pack_id', boardPack.id)
      .in('status', ['draft', 'open', 'in_review', 'awaiting_founder'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSessionError) throw new Error(existingSessionError.message)

    let boardSession = existingSession
    if (!boardSession) {
      const { data: createdSession, error: createdSessionError } = await service
        .from('board_sessions')
        .insert({
          organization_id: boardPack.organization_id,
          company_id: boardPack.company_id,
          governance_cycle_id: boardPack.governance_cycle_id,
          board_pack_id: boardPack.id,
          started_by: user.id,
          session_type: 'virtual_review',
          status: 'in_review',
          opened_at: new Date().toISOString(),
          metadata: { source: 'shadow-board-deep-dive' },
        })
        .select('id, metadata')
        .single()

      if (createdSessionError) throw new Error(createdSessionError.message)
      boardSession = createdSession
    }

    if (!boardSession) throw new Error('Nao foi possivel abrir a sessao.')

    const advisorReview = review as AgentReview
    const questions = topTexts(advisorReview.strategic_questions)
    const recommendations = topTexts(advisorReview.recommendations)
    const summary = [
      `${advisorReview.advisor_name} aprofunda sua leitura com postura de ${stanceLabel(advisorReview.stance)}.`,
      advisorReview.perspective,
      questions.length ? `Perguntas-chave: ${questions.join(' | ')}` : null,
      recommendations.length ? `Recomendacoes: ${recommendations.join(' | ')}` : null,
    ].filter(Boolean).join(' ')

    const transcript = [
      {
        speaker: 'Board Brain',
        role: 'deep_dive_prompt',
        content: `Aprofunde a recomendacao de ${advisorReview.advisor_name}, explicitando premissas, riscos, perguntas de conselho e condicoes de implementacao.`,
      },
      {
        speaker: advisorReview.advisor_name,
        role: 'deep_dive_response',
        content: summary,
      },
      {
        speaker: 'Board Brain',
        role: 'memory_instruction',
        content: 'Registrar este aprofundamento como memoria de sessao e usar em atas, decisoes futuras e follow-ups.',
      },
    ]

    const { data: conversation, error: conversationError } = await service
      .from('agent_conversations')
      .insert({
        organization_id: boardPack.organization_id,
        company_id: boardPack.company_id,
        governance_cycle_id: boardPack.governance_cycle_id,
        board_session_id: boardSession.id,
        from_advisor_key: 'board_brain',
        to_advisor_key: advisorReview.advisor_key,
        relationship: 'neutrality',
        transcript,
        summary,
        conflicts: questions,
        agreements: recommendations,
      })
      .select('id, summary, created_at')
      .single()

    if (conversationError) throw new Error(conversationError.message)

    const metadata = asRecord(boardSession.metadata)
    const deepDiveCount = typeof metadata.deep_dive_count === 'number' ? metadata.deep_dive_count + 1 : 1
    await service
      .from('board_sessions')
      .update({
        status: 'in_review',
        metadata: {
          ...metadata,
          deep_dive_count: deepDiveCount,
          last_deep_dive_at: new Date().toISOString(),
          last_deep_dive_advisor: advisorReview.advisor_key,
        },
      })
      .eq('id', boardSession.id)

    await service.from('audit_events').insert({
      organization_id: boardPack.organization_id,
      company_id: boardPack.company_id,
      actor_user_id: user.id,
      event_type: 'shadow_board.agent_deep_dive_created',
      entity_type: 'agent_conversation',
      entity_id: conversation.id,
      metadata: {
        board_session_id: boardSession.id,
        board_pack_id: boardPack.id,
        advisor_key: advisorReview.advisor_key,
      },
    })

    return NextResponse.json({
      board_session_id: boardSession.id,
      advisor_key: advisorReview.advisor_key,
      conversation,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel aprofundar o advisor.' },
      { status: 500 }
    )
  }
}
