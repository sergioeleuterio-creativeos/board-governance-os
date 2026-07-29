import { createHash } from 'node:crypto'

export type SnapshotCompany = {
  id: string
  name: string
  mainChallenge?: string | null
}

export type SnapshotPlan = {
  id: string
  title: string
  planType: string
  period: string | null
  businessFront: string | null
  version: number
  status: string
  diagnosis: string | null
  priorities: unknown[]
  kpis: unknown[]
  workstreams: unknown[]
  risks: unknown[]
  assumptions: unknown[]
  normalizedContent: Record<string, unknown>
  metadata: Record<string, unknown>
  updatedAt: string
}

export type SnapshotBrainEntry = {
  id: string
  category: string
  sourceType: string
  title: string
  content: string
  confidenceScore: number | null
  sourceDocumentId: string | null
  createdAt: string
}

export type SnapshotDocument = {
  id: string
  filename: string
  documentType: string | null
  status: string
  summary: string | null
  createdAt: string
}

export type SnapshotDecision = {
  id: string
  title: string
  status: string
  rationale: string | null
  conditions: unknown[]
  reviewDate: string | null
  updatedAt: string
}

export type SnapshotFollowUp = {
  id: string
  decisionId: string | null
  title: string
  status: string
  owner: string | null
  dueDate: string | null
  updatedAt: string
}

export type SnapshotBoardPack = {
  id: string
  businessPlanId: string | null
  version: number
  status: string
  executiveSummary: string | null
  strategicQuestions: unknown[]
  updatedAt: string
}

export type BoardSourceSnapshot = {
  id: string
  version: 1
  hash: string
  resolvedAt: string
  company: SnapshotCompany
  plan: SnapshotPlan | null
  brainEntries: SnapshotBrainEntry[]
  documents: SnapshotDocument[]
  priorDecisions: SnapshotDecision[]
  followUps: SnapshotFollowUp[]
  boardPack: SnapshotBoardPack | null
  founderQuestion: string | null
  founderQuestionSource: string | null
  sourceRefs: string[]
  summary: string
}

export type BoardSourceSnapshotSummary = Pick<
  BoardSourceSnapshot,
  'id' | 'version' | 'hash' | 'resolvedAt' | 'founderQuestion' | 'founderQuestionSource' | 'sourceRefs' | 'summary'
> & {
  companyId: string
  companyName: string
  plan: Pick<SnapshotPlan, 'id' | 'title' | 'planType' | 'period' | 'businessFront' | 'version' | 'status'> | null
  boardPackId: string | null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim() : null
}

function nestedText(value: unknown, keys: string[]): string | null {
  let current: unknown = value
  for (const key of keys) current = record(current)[key]
  return text(current)
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableValue(item)]),
  )
}

export function canonicalSnapshotHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex')
}

export function sourceSnapshotIdentityMatches(
  provided: { id?: string | null; hash?: string | null },
  expected: { id?: string | null; hash?: string | null },
): boolean {
  if (!provided.id || !expected.id || provided.id !== expected.id) return false
  return !provided.hash || provided.hash === expected.hash
}

export function chooseFounderQuestion(input: {
  explicitQuestion?: string | null
  plan?: SnapshotPlan | null
  brainEntries?: SnapshotBrainEntry[]
  company?: SnapshotCompany | null
}): { question: string | null; source: string | null } {
  const explicit = text(input.explicitQuestion)
  if (explicit) return { question: explicit, source: 'founder_current_question' }

  const planQuestion = text(input.plan?.metadata.active_question)
    ?? nestedText(input.plan?.normalizedContent, ['decision', 'statement'])
    ?? nestedText(input.plan?.normalizedContent, ['question'])
    ?? text(input.plan?.diagnosis)
  if (planQuestion) {
    return {
      question: planQuestion,
      source: input.plan ? `business_plan:${input.plan.id}:v${input.plan.version}` : 'business_plan',
    }
  }

  const entries = input.brainEntries ?? []
  const questionEntry = entries.find(entry => entry.category === 'question')
    ?? entries.find(entry => entry.category === 'risk')
  if (questionEntry) {
    return {
      question: text(questionEntry.content) ?? text(questionEntry.title),
      source: `company_brain_entry:${questionEntry.id}`,
    }
  }

  const companyChallenge = text(input.company?.mainChallenge)
  return companyChallenge
    ? { question: companyChallenge, source: `company:${input.company?.id}:main_challenge` }
    : { question: null, source: null }
}

export function summarizeSourceSnapshot(snapshot: BoardSourceSnapshot): BoardSourceSnapshotSummary {
  return {
    id: snapshot.id,
    version: snapshot.version,
    hash: snapshot.hash,
    resolvedAt: snapshot.resolvedAt,
    companyId: snapshot.company.id,
    companyName: snapshot.company.name,
    plan: snapshot.plan ? {
      id: snapshot.plan.id,
      title: snapshot.plan.title,
      planType: snapshot.plan.planType,
      period: snapshot.plan.period,
      businessFront: snapshot.plan.businessFront,
      version: snapshot.plan.version,
      status: snapshot.plan.status,
    } : null,
    boardPackId: snapshot.boardPack?.id ?? null,
    founderQuestion: snapshot.founderQuestion,
    founderQuestionSource: snapshot.founderQuestionSource,
    sourceRefs: snapshot.sourceRefs,
    summary: snapshot.summary,
  }
}
