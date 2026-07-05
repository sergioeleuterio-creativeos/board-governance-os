export type AgentCode = 'BB' | 'CEO' | 'CFO' | 'CMO' | 'CRO' | 'PRD' | 'CAT' | 'MDA' | 'CRM' | 'RED'
export type StudioCode = 'SC' | 'BE' | 'CP' | 'SN' | 'RE' | 'MW' | 'PM'
export type EvidenceStatus = 'CONFIRMADO' | 'DERIVADO' | 'RISCO ATIVO' | 'FALTANDO' | 'PARCIAL'
export type SessionTypeId = 'problem' | 'hotseat' | 'prep' | 'reset' | 'campaign' | 'review'
export type SessionKind = 'advisory' | 'board'
export type DecisionState = 'approved' | 'deferred'
export type OutputType = 'memo' | 'strategy' | 'sales' | 'campaign' | 'plan' | 'minutes'

export interface BoardAgent {
  code: AgentCode
  short: string
  role: string
  color: string
  angle: string
  evidence: string
  pressure: string
}

export interface StudioAgent {
  code: StudioCode
  name: string
  desc: string
}

export interface EvidenceItem {
  claim: string
  source: string
  status: EvidenceStatus
}

export interface StrategyDiagnosis {
  statedProblem: string
  inferredProblem: string
  tension: { a: string; b: string }
  frames: Array<{ title: string; detail: string; selected?: boolean }>
  evidenceMap: EvidenceItem[]
  recommendedQuestion: string
  decisionQuestions?: string[]
  confidence: number
  missingContext: string[]
}

export interface RoleBrief {
  code: AgentCode
  angle: string
  evidence: string
  pressure: string
}

export interface BoardBrief {
  boardBrief: string
  roleBriefs: RoleBrief[]
}

export interface TurnSynthesis {
  agreements?: string[]
  disagreements?: string[]
  risks?: string[]
}

export interface BoardTurn {
  code: AgentCode | StudioCode
  role?: string
  text: string
  tag: string
  synth?: TurnSynthesis
  studio?: boolean
}

export interface SessionType {
  id: SessionTypeId
  kind?: SessionKind
  code: string
  name: string
  tag: string
  desc: string
  outputs: string[]
  maxTurns?: number
  primary?: boolean
}

export interface DecisionRecord {
  id: string
  statement: string
  rationale: string
  rejectedOptions: string[]
  confidence: number
  owner: string
  conditions: string[]
  reviewDate: string
  linked: string[]
}

export interface ExecutionOutput {
  type: OutputType
  title: string
  body: string
  sources: string[]
  pages: number
}

export interface FollowUp {
  title: string
  owner: string
  due: string
  status: 'Aberto' | 'Em andamento' | 'Bloqueado' | 'Concluído'
  dependency: string
  escalation: string
}

export interface DecisionRoomReadout {
  mode: 'mock' | 'live'
  boardAgents: BoardAgent[]
  studioAgents: StudioAgent[]
  sessionTypes: SessionType[]
  diagnosis: StrategyDiagnosis
  boardBrief: BoardBrief
  decisions: DecisionRecord[]
  outputs: ExecutionOutput[]
  followUps: FollowUp[]
}

export interface TurnRequest {
  sessionId: SessionTypeId
  index: number
  selectedAgents?: AgentCode[]
}

export interface InterventionRequest {
  sessionId: SessionTypeId
  kind: 'challenge' | 'evidence' | 'invite'
  log?: BoardTurn[]
  selectedAgents?: AgentCode[]
}

export interface DecisionCaptureRequest {
  sessionId: SessionTypeId
  state: DecisionState
  sessionKind?: SessionKind
  clientRoomId?: string
  activeQuestion?: string
  queue?: string[]
  log?: BoardTurn[]
  requestedData?: string[]
  bypassedData?: string[]
  selectedAgents?: AgentCode[]
}

export interface DecisionRoomSessionSaveRequest {
  clientRoomId: string
  sessionId: SessionTypeId
  activeQuestion?: string
  queue?: string[]
  log?: BoardTurn[]
  requestedData?: string[]
  bypassedData?: string[]
  baseIdx?: number
  baseComplete?: boolean
  sessionKind?: SessionKind
  selectedAgents?: AgentCode[]
  decided?: DecisionState | null
}
