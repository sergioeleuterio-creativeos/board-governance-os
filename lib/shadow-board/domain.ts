export type JsonObject = Record<string, unknown>

export type EntityStatus = 'active' | 'inactive' | 'archived'
export type SupportedLanguage = 'pt-BR' | 'en' | 'es'

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'member'
  | 'advisor_operator'
  | 'partner_admin'
  | 'super_admin'

export type CompanyRole = 'founder' | 'admin' | 'member' | 'viewer' | 'advisor_operator'
export type PartnerChannelType = 'distribution_partner' | 'white_label' | 'referral' | 'internal'
export type IntakeMode = 'chat' | 'voice' | 'form' | 'file' | 'admin_note'
export type BrainEntryCategory = 'fact' | 'goal' | 'financial' | 'risk' | 'team' | 'decision' | 'plan' | 'question' | 'customer' | 'operations'
export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'archived'
export type GovernanceCycleStatus =
  | 'draft'
  | 'intake'
  | 'planning'
  | 'board_pack'
  | 'review'
  | 'meeting'
  | 'decision'
  | 'follow_up'
  | 'closed'
  | 'archived'
export type BoardSessionType = 'diagnostic' | 'virtual_review' | 'admin_session' | 'live_facilitated'
export type BoardSessionStatus = 'draft' | 'open' | 'in_review' | 'awaiting_founder' | 'closed' | 'expired' | 'cancelled'
export type AdvisorKey = 'board_brain' | 'finance' | 'operator' | 'growth' | 'risk' | 'customer' | 'talent'
export type AdvisorStance = 'support' | 'support_with_conditions' | 'neutral' | 'oppose' | 'needs_more_data'
export type ClosureRecommendation = 'commit' | 'commit_with_conditions' | 'defer' | 'reject' | 'request_more_data' | 'escalate_human_review'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'
export type DecisionStatus =
  | 'candidate'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'superseded'
  | 'review_due'
  | 'closed'
  | 'open'
  | 'reviewing'
  | 'reversed'
export type FollowUpStatus = 'open' | 'in_progress' | 'done' | 'blocked' | 'cancelled'
export type ExportType = 'html' | 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'csv'
export type ExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired'
export type BillingPlanCode = 'free_diagnostic' | 'monthly_cycle' | 'fortnightly_cycle' | 'quarterly_cycle' | 'extra_session_pack' | 'live_add_on'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'incomplete'
export type UsagePackageStatus = 'active' | 'exhausted' | 'expired' | 'cancelled'
export type ReminderChannel = 'in_app' | 'email' | 'calendar'
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'

export interface TimestampedEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface UserProfile extends TimestampedEntity {
  email: string | null
  full_name: string | null
  avatar_url: string | null
  locale: SupportedLanguage
  timezone: string
  is_super_admin: boolean
  status: EntityStatus
}

export interface Organization extends TimestampedEntity {
  name: string
  slug: string
  public_product_name: 'Board Governance OS'
  default_locale: SupportedLanguage
  owner_user_id: string | null
  partner_channel_id: string | null
  stripe_customer_id: string | null
  status: EntityStatus
  metadata: JsonObject
}

export interface OrganizationMembership extends TimestampedEntity {
  organization_id: string
  user_id: string
  role: OrganizationRole
  status: EntityStatus
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
}

export interface PartnerChannel extends TimestampedEntity {
  organization_id: string | null
  name: string
  slug: string
  type: PartnerChannelType
  contact_name: string | null
  contact_email: string | null
  status: EntityStatus
  white_label_settings: JsonObject
  metadata: JsonObject
}

export interface Company extends TimestampedEntity {
  organization_id: string
  user_id: string | null
  partner_channel_id: string | null
  name: string
  slug: string
  industry: string | null
  business_model: string | null
  revenue_range: string | null
  employee_count: number | null
  stage: string | null
  jurisdiction: string | null
  default_locale: SupportedLanguage
  goals: string | null
  main_challenge: string | null
  status: EntityStatus
  metadata: JsonObject
}

export interface CompanyMembership extends TimestampedEntity {
  company_id: string
  user_id: string
  role: CompanyRole
  status: EntityStatus
}

export interface UploadedDocument extends TimestampedEntity {
  organization_id: string
  company_id: string
  uploaded_by: string | null
  storage_bucket: string
  storage_path: string
  original_filename: string
  mime_type: string | null
  file_ext: string | null
  file_size_bytes: number | null
  document_type: string | null
  status: DocumentStatus
  summary: string | null
  metadata: JsonObject
}

export interface DocumentExtraction extends TimestampedEntity {
  organization_id: string
  company_id: string
  document_id: string
  extraction_type: 'text' | 'table' | 'financials' | 'deck' | 'summary' | 'memory'
  content: string | null
  structured_data: JsonObject
  confidence_score: number | null
  source_locations: JsonObject
  status: DocumentStatus
}

export interface CompanyBrainEntry extends TimestampedEntity {
  organization_id: string
  company_id: string
  source_document_id: string | null
  created_by: string | null
  category: BrainEntryCategory
  source_type: IntakeMode
  title: string
  content: string
  confidence_score: number | null
  status: EntityStatus
  metadata: JsonObject
}

export interface GovernanceCycle extends TimestampedEntity {
  organization_id: string
  company_id: string
  title: string
  cycle_type: 'diagnostic' | 'monthly' | 'fortnightly' | 'quarterly' | 'ad_hoc'
  period_start: string | null
  period_end: string | null
  status: GovernanceCycleStatus
  data_quality_score: number | null
  current_stage: GovernanceCycleStatus
  metadata: JsonObject
}

export interface GovernanceInput extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string
  source_document_id: string | null
  created_by: string | null
  mode: IntakeMode
  prompt: string | null
  content: string
  structured_data: JsonObject
  metadata: JsonObject
}

export interface BusinessPlan extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string
  status: 'draft' | 'ready_for_review' | 'approved' | 'superseded' | 'archived'
  diagnosis: string | null
  priorities: JsonObject
  kpis: JsonObject
  workstreams: JsonObject
  timeline: JsonObject
  risks: JsonObject
  assumptions: JsonObject
  completeness_score: number | null
  quality_score: number | null
  approved_by: string | null
  approved_at: string | null
}

export interface BoardPack extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string
  business_plan_id: string | null
  version: number
  status: 'draft' | 'ready' | 'sent_to_review' | 'archived'
  executive_summary: string | null
  strategic_questions: JsonObject
  risk_map: JsonObject
  priority_ranking: JsonObject
  meeting_agenda: JsonObject
  decision_candidates: JsonObject
  export_payload: JsonObject
}

export interface BoardSession extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string
  board_pack_id: string | null
  started_by: string | null
  session_type: BoardSessionType
  status: BoardSessionStatus
  opened_at: string | null
  expires_at: string | null
  closed_at: string | null
  closure_recommendation: ClosureRecommendation | null
  closure_summary: string | null
  usage_units_consumed: number
  metadata: JsonObject
}

export interface AgentReview extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string
  board_pack_id: string
  board_session_id: string | null
  advisor_key: AdvisorKey
  advisor_name: string
  status: 'queued' | 'running' | 'complete' | 'failed'
  stance: AdvisorStance | null
  risk_score: number | null
  confidence_score: number | null
  perspective: string | null
  strategic_questions: JsonObject
  source_references: JsonObject
  recommendations: JsonObject
  closure_recommendation: ClosureRecommendation | null
  raw_output: JsonObject
}

export interface Decision extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string | null
  board_session_id: string | null
  meeting_minutes_id: string | null
  created_by: string | null
  user_id: string | null
  title: string
  decision: string | null
  status: DecisionStatus
  closure_recommendation: ClosureRecommendation | null
  rationale: string | null
  risks: string | null
  expected_outcome: string | null
  tradeoffs: JsonObject
  risk_level: RiskLevel | null
  confidence_score: number | null
  conditions: JsonObject
  owner_user_id: string | null
  owner_label: string | null
  owner: string | null
  review_date: string | null
  metadata: JsonObject
}

export interface FollowUp extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string | null
  decision_id: string | null
  source_agent_key: AdvisorKey | null
  user_id: string | null
  owner_user_id: string | null
  owner_label: string | null
  owner: string | null
  title: string
  action: string | null
  description: string | null
  priority: PriorityLevel
  status: FollowUpStatus
  due_date: string | null
  completed_at: string | null
}

export interface ExportArtifact extends TimestampedEntity {
  organization_id: string
  company_id: string
  governance_cycle_id: string | null
  board_pack_id: string | null
  meeting_minutes_id: string | null
  export_type: ExportType
  status: ExportStatus
  storage_bucket: string | null
  storage_path: string | null
  metadata: JsonObject
}

export const BOARD_ADVISORS = [
  { key: 'finance', name: 'Finance Advisor', focus: 'Cash, ROI, capital efficiency, pricing, margins, investment' },
  { key: 'operator', name: 'Operator Advisor', focus: 'Execution, process, accountability, cadence' },
  { key: 'growth', name: 'Growth Advisor', focus: 'Sales, market, expansion, revenue quality' },
  { key: 'risk', name: 'Risk Advisor', focus: 'Governance, concentration, downside, compliance' },
  { key: 'customer', name: 'Customer Advisor', focus: 'Brand, retention, demand, customer behavior' },
  { key: 'talent', name: 'Talent Advisor', focus: 'Leadership, hiring, incentives, team capacity' },
] as const satisfies ReadonlyArray<{ key: Exclude<AdvisorKey, 'board_brain'>; name: string; focus: string }>

export const BOARD_BRAIN = {
  key: 'board_brain',
  name: 'Board Brain',
  focus: 'Orchestration, synthesis, minutes, memory, and closure recommendation',
} as const
