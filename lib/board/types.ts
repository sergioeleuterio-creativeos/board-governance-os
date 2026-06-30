import { BOARD_ADVISORS } from '@/lib/shadow-board/domain'

export const BOARD_PERSONAS = BOARD_ADVISORS

export type GovernanceStance = 'approve' | 'approve_with_conditions' | 'caution' | 'reject'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

export interface BoardCompany {
  id?: string
  name: string
  industry?: string | null
  business_model?: string | null
  revenue_range?: string | null
  employee_count?: number | null
  stage?: string | null
  jurisdiction?: string | null
  goals?: string | null
  main_challenge?: string | null
}

export interface GovernanceRunInput {
  period: string
  kpis: string
  financial_snapshot: string
  priorities: string
  risks: string
  opportunities: string
  team_issues: string
  meeting_notes: string
}

export interface GovernanceAIOutput {
  run: {
    title: string
    summary: string
    risk_score: number
    confidence_score: number
  }
  governance_score: {
    total: number
    strategic_clarity: number
    financial_discipline: number
    execution_cadence: number
    risk_visibility: number
    decision_quality: number
    explanation: string
  }
  persona_reviews: Array<{
    persona_key: string
    persona_name: string
    focus_area: string
    stance: GovernanceStance
    risk_score: number
    confidence_score: number
    summary: string
    questions: string[]
    risks: Array<{ title: string; severity: RiskLevel; detail: string }>
    recommendations: Array<{ title: string; detail: string; priority: PriorityLevel }>
  }>
  board_pack: {
    executive_summary: string
    strategic_questions: string[]
    risk_map: Array<{ risk: string; severity: RiskLevel; mitigation: string }>
    priority_ranking: Array<{
      priority: string
      rationale: string
      owner_suggestion?: string
      why_now?: string
      evidence?: string
      evidence_gap?: string
      decision_question?: string
    }>
    meeting_agenda: string[]
  }
  decision: {
    title: string
    decision: 'proceed' | 'proceed_with_conditions' | 'pause' | 'reject' | 'needs_more_info'
    rationale: string
    risk_level: RiskLevel
    confidence_score: number
    tradeoffs: Array<{ upside: string; downside: string }>
    conditions: Array<{ title: string; detail: string }>
  }
  follow_ups: Array<{
    title: string
    description?: string
    owner_label?: string
    priority: PriorityLevel
    due_in_days?: number
    source_persona_key?: string
  }>
}
