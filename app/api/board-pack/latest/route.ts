import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({ company: null, board_pack: null, agent_reviews: [], board_session: null, agent_conversations: [] })
    }

    const service = serviceClient()
    const { data: boardPack, error: boardPackError } = await service
      .from('board_packs')
      .select('id, organization_id, company_id, governance_cycle_id, version, status, executive_summary, strategic_questions, risk_map, priority_ranking, meeting_agenda, decision_candidates, export_payload, created_at, updated_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (boardPackError) throw new Error(boardPackError.message)

    const { data: agentReviews, error: agentReviewsError } = boardPack
      ? await service
        .from('agent_reviews')
        .select('id, advisor_key, advisor_name, status, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations, closure_recommendation, created_at')
        .eq('board_pack_id', boardPack.id)
        .order('created_at', { ascending: true })
      : { data: [], error: null }

    if (agentReviewsError) throw new Error(agentReviewsError.message)

    const { data: boardSession, error: boardSessionError } = boardPack
      ? await service
        .from('board_sessions')
        .select('id, status, closure_recommendation, closure_summary, opened_at, closed_at, metadata, created_at')
        .eq('board_pack_id', boardPack.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null, error: null }

    if (boardSessionError) throw new Error(boardSessionError.message)

    const { data: agentConversations, error: agentConversationsError } = boardSession
      ? await service
        .from('agent_conversations')
        .select('id, from_advisor_key, to_advisor_key, relationship, transcript, summary, conflicts, agreements, created_at')
        .eq('board_session_id', boardSession.id)
        .order('created_at', { ascending: true })
      : { data: [], error: null }

    if (agentConversationsError) throw new Error(agentConversationsError.message)

    return NextResponse.json({
      company,
      board_pack: boardPack ?? null,
      board_session: boardSession ?? null,
      agent_reviews: agentReviews ?? [],
      agent_conversations: agentConversations ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load board pack' },
      { status: 500 }
    )
  }
}
