import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import { ADVISOR_SOURCE_REFERENCES, BOARD_CASE_LIBRARY, scoreAdvisorAdherence } from '@/lib/board/advisor-rubrics'

type AgentReviewRow = {
  id: string
  company_id: string
  board_pack_id: string
  board_session_id: string | null
  advisor_key: string
  advisor_name: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: unknown
  recommendations: unknown
  closure_recommendation: string | null
  created_at: string
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: reviews, error } = await service
    .from('agent_reviews')
    .select('id, company_id, board_pack_id, board_session_id, advisor_key, advisor_name, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations, closure_recommendation, created_at')
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviewRows = (reviews ?? []) as AgentReviewRow[]
  const companyIds = [...new Set(reviewRows.map((review) => review.company_id).filter(Boolean))]
  const { data: companies, error: companiesError } = companyIds.length
    ? await service.from('companies').select('id, name').in('id', companyIds)
    : { data: [], error: null }

  if (companiesError) return NextResponse.json({ error: companiesError.message }, { status: 500 })

  const companiesById = new Map((companies ?? []).map((company) => [company.id, company.name]))
  const scoredReviews = reviewRows.map((review) => ({
    ...review,
    company_name: companiesById.get(review.company_id) ?? null,
    adherence: scoreAdvisorAdherence(review),
  }))

  const advisorGroups = new Map<string, { total: number; count: number; latest: string | null }>()
  for (const review of scoredReviews) {
    const current = advisorGroups.get(review.advisor_key) ?? { total: 0, count: 0, latest: null }
    current.total += review.adherence.total
    current.count += 1
    current.latest = current.latest ?? review.created_at
    advisorGroups.set(review.advisor_key, current)
  }

  const summary = Array.from(advisorGroups.entries()).map(([advisorKey, value]) => ({
    advisor_key: advisorKey,
    average_adherence: value.count ? Math.round(value.total / value.count) : 0,
    reviews_scored: value.count,
    latest_review_at: value.latest,
  }))

  const overallAverage = scoredReviews.length
    ? Math.round(scoredReviews.reduce((sum, review) => sum + review.adherence.total, 0) / scoredReviews.length)
    : 0

  return NextResponse.json({
    overall_average: overallAverage,
    summary,
    reviews: scoredReviews,
    sources: ADVISOR_SOURCE_REFERENCES,
    case_library: BOARD_CASE_LIBRARY,
  })
}
