import { NextResponse } from 'next/server'
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
  closure_recommendation: string | null
}

type ChallengePair = {
  relationship: 'agreement' | 'opposition' | 'neutrality'
  from: AgentReview
  to: AgentReview
}

const advisorNames: Record<string, string> = {
  board_brain: 'Board Brain',
  finance: 'Finance Advisor',
  operator: 'Operator Advisor',
  growth: 'Growth Advisor',
  risk: 'Risk Advisor',
  customer: 'Customer Advisor',
  talent: 'Talent Advisor',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textFromUnknown(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    return [record.title, record.detail, record.description, record.priority]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(' - ')
  }
  return ''
}

function firstText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).find(Boolean) ?? ''
  }
  return textFromUnknown(value)
}

function stanceLabel(stance: string | null) {
  const labels: Record<string, string> = {
    support: 'apoia',
    support_with_conditions: 'apoia com condicoes',
    neutral: 'mantem neutralidade',
    oppose: 'faz oposicao',
    needs_more_data: 'exige mais dados',
  }
  return stance ? labels[stance] ?? stance : 'sem postura registrada'
}

function confidence(review: AgentReview) {
  return review.confidence_score ?? 0
}

function risk(review: AgentReview) {
  return review.risk_score ?? 0
}

function sortedByConfidence(reviews: AgentReview[]) {
  return [...reviews].sort((a, b) => confidence(b) - confidence(a))
}

function sortedByRisk(reviews: AgentReview[]) {
  return [...reviews].sort((a, b) => risk(b) - risk(a))
}

function pickUnused(reviews: AgentReview[], used: Set<string>) {
  return reviews.find((review) => !used.has(review.advisor_key)) ?? null
}

function registerPair(pair: ChallengePair, used: Set<string>) {
  used.add(pair.from.advisor_key)
  used.add(pair.to.advisor_key)
  return pair
}

function buildChallengePairs(advisors: AgentReview[]): ChallengePair[] {
  const used = new Set<string>()
  const pairs: ChallengePair[] = []
  const supporters = sortedByConfidence(advisors.filter((review) => review.stance === 'support' || review.stance === 'support_with_conditions'))
  const critics = sortedByRisk(advisors.filter((review) => review.stance === 'oppose' || review.stance === 'needs_more_data'))
  const neutrals = sortedByConfidence(advisors.filter((review) => review.stance === 'neutral' || !review.stance))
  const allByConfidence = sortedByConfidence(advisors)
  const allByRisk = sortedByRisk(advisors)

  const oppositionFrom = pickUnused(critics, used) ?? pickUnused(allByRisk, used)
  const oppositionTo = oppositionFrom
    ? (pickUnused(supporters, new Set([...used, oppositionFrom.advisor_key])) ?? pickUnused(allByConfidence, new Set([...used, oppositionFrom.advisor_key])))
    : null

  if (oppositionFrom && oppositionTo) {
    pairs.push(registerPair({ relationship: 'opposition', from: oppositionFrom, to: oppositionTo }, used))
  }

  const remaining = advisors.filter((review) => !used.has(review.advisor_key))
  const stanceGroups = ['support_with_conditions', 'support', 'neutral', 'needs_more_data', 'oppose']
  const agreementGroup = stanceGroups
    .map((stance) => remaining.filter((review) => review.stance === stance))
    .find((group) => group.length >= 2)
  const agreementFrom = agreementGroup ? sortedByConfidence(agreementGroup)[0] : pickUnused(remaining, used)
  const agreementTo = agreementFrom
    ? pickUnused(sortedByConfidence(remaining), new Set([...used, agreementFrom.advisor_key]))
    : null

  if (agreementFrom && agreementTo) {
    pairs.push(registerPair({ relationship: 'agreement', from: agreementFrom, to: agreementTo }, used))
  }

  const neutralCandidates = [...neutrals, ...sortedByConfidence(advisors)].filter((review) => !used.has(review.advisor_key))
  const neutralFrom = neutralCandidates[0] ?? null
  const neutralTo = neutralFrom
    ? neutralCandidates.find((review) => review.advisor_key !== neutralFrom.advisor_key) ?? null
    : null

  if (neutralFrom && neutralTo) {
    pairs.push(registerPair({ relationship: 'neutrality', from: neutralFrom, to: neutralTo }, used))
  }

  return pairs
}

function relationshipSummary(pair: ChallengePair) {
  const fromPoint = pair.from.perspective ?? firstText(pair.from.recommendations) ?? `${pair.from.advisor_name} ainda precisa consolidar sua analise.`
  const toPoint = pair.to.perspective ?? firstText(pair.to.recommendations) ?? `${pair.to.advisor_name} ainda precisa consolidar sua analise.`

  if (pair.relationship === 'opposition') {
    return `${pair.from.advisor_name} pressiona a recomendacao de ${pair.to.advisor_name} para explicitar riscos, dados ausentes e condicoes minimas antes de compromisso.`
  }

  if (pair.relationship === 'agreement') {
    return `${pair.from.advisor_name} e ${pair.to.advisor_name} convergem em uma linha de acao, transformando recomendacoes parecidas em criterios de execucao e acompanhamento.`
  }

  return `${pair.from.advisor_name} e ${pair.to.advisor_name} registram uma leitura neutra para separar o que ja pode virar decisao do que ainda depende de evidencia.`
}

function buildConversationRow(pair: ChallengePair) {
  const fromQuestion = firstText(pair.from.strategic_questions)
  const toRecommendation = firstText(pair.to.recommendations)
  const fromRecommendation = firstText(pair.from.recommendations)
  const toQuestion = firstText(pair.to.strategic_questions)

  const transcript = [
    {
      speaker: pair.from.advisor_name,
      role: 'challenge',
      content: `${pair.from.advisor_name} ${stanceLabel(pair.from.stance)} e coloca a pergunta: ${fromQuestion || 'quais premissas precisam ser provadas antes da decisao?'}`,
    },
    {
      speaker: pair.to.advisor_name,
      role: 'response',
      content: `${pair.to.advisor_name} ${stanceLabel(pair.to.stance)} e responde com a recomendacao: ${toRecommendation || 'definir condicoes, dono, prazo e metrica de revisao.'}`,
    },
    {
      speaker: 'Board Brain',
      role: 'orchestration',
      content: `A rodada fica classificada como ${pair.relationship} e deve alimentar a recomendacao final, sem apagar o dissentimento original dos advisors.`,
    },
  ]

  const agreements = [
    fromRecommendation || `${pair.from.advisor_name} concorda que a decisao precisa de owner, KPI e cadencia.`,
    toRecommendation || `${pair.to.advisor_name} concorda que a recomendacao precisa virar plano revisavel.`,
  ]

  const conflicts = pair.relationship === 'agreement'
    ? []
    : [
        fromQuestion || `${pair.from.advisor_name} pede validacao adicional.`,
        toQuestion || `${pair.to.advisor_name} aponta uma dependencia de execucao.`,
      ]

  return {
    from_advisor_key: pair.from.advisor_key,
    to_advisor_key: pair.to.advisor_key,
    relationship: pair.relationship,
    transcript,
    summary: relationshipSummary(pair),
    conflicts,
    agreements,
  }
}

function closureFromReviews(reviews: AgentReview[]) {
  const advisors = reviews.filter((review) => review.advisor_key !== 'board_brain')
  const avgConfidence = advisors.length
    ? Math.round(advisors.reduce((sum, review) => sum + confidence(review), 0) / advisors.length)
    : 0
  const maxRisk = advisors.reduce((max, review) => Math.max(max, risk(review)), 0)
  const dissent = advisors.filter((review) => review.stance === 'oppose' || review.stance === 'needs_more_data').length
  const supporters = advisors.filter((review) => review.stance === 'support' || review.stance === 'support_with_conditions').length
  const boardBrain = reviews.find((review) => review.advisor_key === 'board_brain')

  if (boardBrain?.closure_recommendation) {
    return boardBrain.closure_recommendation
  }

  if (dissent >= 2 || avgConfidence < 60) return 'request_more_data'
  if (maxRisk >= 75 || dissent === 1) return 'commit_with_conditions'
  if (supporters >= 4 && avgConfidence >= 75) return 'commit'
  return 'commit_with_conditions'
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

    const { data: boardPack, error: boardPackError } = await service
      .from('board_packs')
      .select('id, organization_id, company_id, governance_cycle_id, executive_summary, status')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (boardPackError) throw new Error(boardPackError.message)
    if (!boardPack) return NextResponse.json({ error: 'Nenhum Board Pack encontrado para gerar desafios.' }, { status: 404 })

    const { data: agentReviews, error: agentReviewsError } = await service
      .from('agent_reviews')
      .select('id, advisor_key, advisor_name, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations, closure_recommendation')
      .eq('board_pack_id', boardPack.id)
      .order('created_at', { ascending: true })

    if (agentReviewsError) throw new Error(agentReviewsError.message)

    const reviews = ((agentReviews ?? []) as AgentReview[]).map((review) => ({
      ...review,
      advisor_name: review.advisor_name || advisorNames[review.advisor_key] || 'Advisor',
    }))
    const advisors = reviews.filter((review) => review.advisor_key !== 'board_brain')

    if (advisors.length < 2) {
      return NextResponse.json({ error: 'E preciso ter pelo menos dois advisors para gerar desafios.' }, { status: 409 })
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
          metadata: { source: 'shadow-board-challenges' },
        })
        .select('id, metadata')
        .single()

      if (createdSessionError) throw new Error(createdSessionError.message)
      boardSession = createdSession
    }

    if (!boardSession) throw new Error('Nao foi possivel abrir a sessao de Shadow Board Review.')

    const pairs = buildChallengePairs(advisors)
    const challengeRows = pairs.map((pair) => ({
      organization_id: boardPack.organization_id,
      company_id: boardPack.company_id,
      governance_cycle_id: boardPack.governance_cycle_id,
      board_session_id: boardSession.id,
      ...buildConversationRow(pair),
    }))

    const { error: deleteError } = await service
      .from('agent_conversations')
      .delete()
      .eq('board_session_id', boardSession.id)
      .neq('from_advisor_key', 'board_brain')
      .neq('to_advisor_key', 'board_brain')

    if (deleteError) throw new Error(deleteError.message)

    const { data: conversations, error: conversationError } = challengeRows.length
      ? await service
        .from('agent_conversations')
        .insert(challengeRows)
        .select('id, from_advisor_key, to_advisor_key, relationship, transcript, summary, conflicts, agreements, created_at')
      : { data: [], error: null }

    if (conversationError) throw new Error(conversationError.message)

    const closureRecommendation = closureFromReviews(reviews)
    const conflictCount = challengeRows.reduce((sum, row) => sum + (Array.isArray(row.conflicts) ? row.conflicts.length : 0), 0)
    const closureSummary = `Rodada de desafios concluida com ${challengeRows.length} conversas, ${conflictCount} conflitos mapeados e recomendacao de closure: ${closureRecommendation}.`
    const metadata = {
      ...asRecord(boardSession.metadata),
      last_challenge_run_at: new Date().toISOString(),
      last_challenge_run_by: user.id,
      challenge_rounds: challengeRows.length,
      challenge_conflicts: conflictCount,
    }

    const { error: sessionError } = await service
      .from('board_sessions')
      .update({
        status: 'awaiting_founder',
        closure_recommendation: closureRecommendation,
        closure_summary: closureSummary,
        metadata,
      })
      .eq('id', boardSession.id)

    if (sessionError) throw new Error(sessionError.message)

    await service
      .from('board_packs')
      .update({ status: 'sent_to_review' })
      .eq('id', boardPack.id)

    await service.from('audit_events').insert({
      organization_id: boardPack.organization_id,
      company_id: boardPack.company_id,
      actor_user_id: user.id,
      event_type: 'shadow_board.challenge_rounds_generated',
      entity_type: 'board_session',
      entity_id: boardSession.id,
      metadata: {
        board_pack_id: boardPack.id,
        conversations_created: challengeRows.length,
        closure_recommendation: closureRecommendation,
        conflict_count: conflictCount,
      },
    })

    return NextResponse.json({
      board_session_id: boardSession.id,
      closure_recommendation: closureRecommendation,
      closure_summary: closureSummary,
      conversations: conversations ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel gerar os desafios.' },
      { status: 500 }
    )
  }
}
