import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { callJSONAI } from '@/lib/board/model-router'
import { INJECTION_GUARD, wrapUserContent } from '@/lib/prompts'
import { consumeUsagePackageUnit } from '@/lib/billing-usage'

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

type DeepDiveOutput = {
  summary: string
  transcript: Array<Record<string, unknown>>
  conflicts: unknown[]
  agreements: unknown[]
  implementation_conditions: unknown[]
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

function sanitizeDeepDive(value: unknown, fallback: DeepDiveOutput): DeepDiveOutput {
  const output = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<DeepDiveOutput>
    : {}

  return {
    summary: typeof output.summary === 'string' && output.summary.trim() ? output.summary.trim() : fallback.summary,
    transcript: Array.isArray(output.transcript) && output.transcript.length ? output.transcript : fallback.transcript,
    conflicts: Array.isArray(output.conflicts) ? output.conflicts : fallback.conflicts,
    agreements: Array.isArray(output.agreements) ? output.agreements : fallback.agreements,
    implementation_conditions: Array.isArray(output.implementation_conditions) ? output.implementation_conditions : fallback.implementation_conditions,
  }
}

function buildDeepDivePrompt({
  companyName,
  review,
  fallback,
}: {
  companyName: string
  review: AgentReview
  fallback: DeepDiveOutput
}) {
  return `You are ${review.advisor_name} inside Board Governance OS, responding to a Board Brain request for a deeper advisor review.

Company: ${companyName}

Guardrail: you are not a board member, not a board replacement, and not a virtual CEO. You provide governance challenge, questions, conditions, risks, and implementation discipline.

Language rule: write every user-facing string in pt-BR. Keep JSON keys, enum values, advisor keys, and product names exactly as specified.

Advisor review:
${wrapUserContent(JSON.stringify(review, null, 2))}

Deterministic fallback:
${wrapUserContent(JSON.stringify(fallback, null, 2))}

Summary, transcript content, conflicts, agreements, and implementation conditions must be natural pt-BR.

Return one JSON object only. No markdown. Match this shape:
{
  "summary": "",
  "transcript": [
    { "speaker": "Board Brain", "role": "deep_dive_prompt", "content": "" },
    { "speaker": "${review.advisor_name}", "role": "deep_dive_response", "content": "" },
    { "speaker": "Board Brain", "role": "memory_instruction", "content": "" }
  ],
  "conflicts": [],
  "agreements": [],
  "implementation_conditions": []
}`
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

    const usage = await consumeUsagePackageUnit(boardPack.organization_id, 'deep_dive')
    if (!usage.ok) {
      return NextResponse.json({ error: usage.error ?? 'Pacote de uso indisponivel.' }, { status: 402 })
    }

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

    const fallbackTranscript = [
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

    const fallbackOutput: DeepDiveOutput = {
      summary,
      transcript: fallbackTranscript,
      conflicts: questions,
      agreements: recommendations,
      implementation_conditions: recommendations,
    }

    const aiResult = await callJSONAI<DeepDiveOutput>({
      purpose: 'advisor_review',
      system: `Voce produz aprofundamentos estruturados de advisors para reviews de governanca de empresas lideradas por founders. Escreva todos os textos visiveis ao usuario em pt-BR. Preserve JSON keys e enum values. Retorne apenas JSON valido.${INJECTION_GUARD}`,
      prompt: buildDeepDivePrompt({
        companyName: company.name,
        review: advisorReview,
        fallback: fallbackOutput,
      }),
      fallback: () => fallbackOutput,
    })
    const deepDive = sanitizeDeepDive(aiResult.output, fallbackOutput)

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
        transcript: deepDive.transcript,
        summary: deepDive.summary,
        conflicts: deepDive.conflicts,
        agreements: deepDive.agreements,
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
          last_deep_dive_provider: aiResult.provider,
          last_deep_dive_model: aiResult.model,
          last_deep_dive_used_fallback: aiResult.usedFallback,
          last_deep_dive_error: aiResult.error ?? null,
          last_deep_dive_usage_package_id: usage.packageId,
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
        provider: aiResult.provider,
        model: aiResult.model,
        used_fallback: aiResult.usedFallback,
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
