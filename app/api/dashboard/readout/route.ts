import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { ensureUserWorkspace } from '@/lib/shadow-board/bootstrap'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

type CompanyRow = {
  id: string
  organization_id: string
  name: string
  stage: string | null
}

type DecisionRow = {
  id: string
  title: string
  status: string
  closure_recommendation: string | null
  risk_level: string | null
  confidence_score: number | null
  review_date: string | null
  owner_label: string | null
  created_at: string
  updated_at: string
}

type FollowUpRow = {
  id: string
  title: string
  action: string | null
  status: string
  priority: string
  due_date: string | null
  owner_label: string | null
  source_agent_key: string | null
}

type AgentReviewRow = {
  advisor_key: string
  advisor_name: string
  status: string
  stance: string | null
  risk_score: number | null
  confidence_score: number | null
  closure_recommendation: string | null
  created_at: string
}

const riskWeights: Record<string, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 92,
}

const advisorLabels: Record<string, { code: string; name: string; scope: string; color: string }> = {
  board_brain: { code: 'BB', name: 'Board Brain', scope: 'Orquestracao e sintese', color: '#C4922F' },
  finance: { code: 'FN', name: 'Finance Advisor', scope: 'Caixa, ROI, eficiencia de capital', color: '#3E6B4F' },
  operator: { code: 'OP', name: 'Operator Advisor', scope: 'Execucao, processos, accountability', color: '#4A5A6A' },
  growth: { code: 'GR', name: 'Growth Advisor', scope: 'Escala, expansao, mercado', color: '#2F6E6A' },
  risk: { code: 'RK', name: 'Risk Advisor', scope: 'Risco, concentracao, governanca', color: '#A23B2D' },
  customer: { code: 'CU', name: 'Customer Advisor', scope: 'Marca, clientes, mercado', color: '#7A4E63' },
  talent: { code: 'TL', name: 'Talent Advisor', scope: 'Organizacao, lideranca, hiring', color: '#85702F' },
}

function average(values: number[]) {
  if (!values.length) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

async function countRows(table: string, companyId: string, configure?: (query: any) => any) {
  const service = serviceClient()
  let query = service
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (configure) query = configure(query)
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    await ensureUserWorkspace(user)
    const company = await getCurrentCompanyForUser(user) as CompanyRow | null

    if (!company) {
      return NextResponse.json({
        company: null,
        needs_company: true,
        metrics: {
          risk_index: null,
          plan_confidence: null,
          open_decisions: 0,
          overdue_follow_ups: 0,
        },
        decisions_awaiting: [],
        cadence: {
          closed_decisions_90d: 0,
          memory_updates_90d: 0,
        },
        advisors: Object.entries(advisorLabels).map(([key, advisor]) => ({
          advisor_key: key,
          ...advisor,
          status: 'queued',
          risk_score: null,
          confidence_score: null,
        })),
      })
    }

    const service = serviceClient()
    const today = new Date().toISOString().slice(0, 10)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [
      decisionsResult,
      followUpsResult,
      latestSessionResult,
      agentReviewsResult,
      closedDecisions90d,
      memoryUpdates90d,
      documents90d,
      openDecisions,
      overdueFollowUps,
    ] = await Promise.all([
      service
        .from('decisions')
        .select('id, title, status, closure_recommendation, risk_level, confidence_score, review_date, owner_label, created_at, updated_at')
        .eq('company_id', company.id)
        .order('updated_at', { ascending: false })
        .limit(20),
      service
        .from('follow_ups')
        .select('id, title, action, status, priority, due_date, owner_label, source_agent_key')
        .eq('company_id', company.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20),
      service
        .from('board_sessions')
        .select('id, status, session_type, closure_recommendation, opened_at, expires_at, closed_at, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('agent_reviews')
        .select('advisor_key, advisor_name, status, stance, risk_score, confidence_score, closure_recommendation, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(24),
      countRows('decisions', company.id, (query) => query.eq('status', 'closed').gte('updated_at', ninetyDaysAgo.toISOString())),
      countRows('company_brain_entries', company.id, (query) => query.eq('status', 'active').gte('created_at', ninetyDaysAgo.toISOString())),
      countRows('uploaded_documents', company.id, (query) => query.gte('created_at', ninetyDaysAgo.toISOString())),
      countRows('decisions', company.id, (query) => query.in('status', ['candidate', 'open', 'reviewing', 'review_due', 'deferred'])),
      countRows('follow_ups', company.id, (query) => query.in('status', ['open', 'in_progress', 'blocked']).lt('due_date', today)),
    ])

    if (decisionsResult.error) throw new Error(decisionsResult.error.message)
    if (followUpsResult.error) throw new Error(followUpsResult.error.message)
    if (latestSessionResult.error) throw new Error(latestSessionResult.error.message)
    if (agentReviewsResult.error) throw new Error(agentReviewsResult.error.message)

    const decisions = (decisionsResult.data ?? []) as DecisionRow[]
    const followUps = (followUpsResult.data ?? []) as FollowUpRow[]
    const agentReviews = (agentReviewsResult.data ?? []) as AgentReviewRow[]
    const latestByAdvisor = new Map<string, AgentReviewRow>()

    for (const review of agentReviews) {
      if (!latestByAdvisor.has(review.advisor_key)) latestByAdvisor.set(review.advisor_key, review)
    }

    const decisionRiskScores = decisions
      .map((decision) => decision.risk_level ? riskWeights[decision.risk_level] : null)
      .filter((value): value is number => typeof value === 'number')
    const agentRiskScores = [...latestByAdvisor.values()]
      .map((review) => review.risk_score)
      .filter((value): value is number => typeof value === 'number')
    const confidenceScores = [
      ...decisions.map((decision) => decision.confidence_score),
      ...[...latestByAdvisor.values()].map((review) => review.confidence_score),
    ].filter((value): value is number => typeof value === 'number')

    return NextResponse.json({
      company,
      needs_company: false,
      latest_session: latestSessionResult.data ?? null,
      metrics: {
        risk_index: average([...decisionRiskScores, ...agentRiskScores]),
        plan_confidence: average(confidenceScores),
        open_decisions: openDecisions,
        overdue_follow_ups: overdueFollowUps,
      },
      decisions_awaiting: decisions
        .filter((decision) => ['candidate', 'open', 'reviewing', 'review_due', 'deferred'].includes(decision.status))
        .slice(0, 5),
      follow_ups: followUps.slice(0, 6),
      cadence: {
        closed_decisions_90d: closedDecisions90d,
        memory_updates_90d: memoryUpdates90d + documents90d,
      },
      advisors: Object.entries(advisorLabels).map(([key, advisor]) => {
        const review = latestByAdvisor.get(key)
        return {
          advisor_key: key,
          ...advisor,
          status: review?.status ?? 'queued',
          stance: review?.stance ?? null,
          risk_score: review?.risk_score ?? null,
          confidence_score: review?.confidence_score ?? null,
          closure_recommendation: review?.closure_recommendation ?? null,
        }
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load dashboard readout' },
      { status: 500 }
    )
  }
}
