import 'server-only'

import { serviceClient } from '@/lib/auth-server'
import type { CurrentCompany } from '@/lib/shadow-board/current-company-server'
import {
  canonicalSnapshotHash,
  chooseFounderQuestion,
  type BoardSourceSnapshot,
  type SnapshotBoardPack,
  type SnapshotBrainEntry,
  type SnapshotDecision,
  type SnapshotDocument,
  type SnapshotFollowUp,
  type SnapshotPlan,
} from './source-snapshot'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizePlan(row: Record<string, unknown>): SnapshotPlan {
  const metadata = record(row.metadata)
  return {
    id: stringValue(row.id),
    title: stringValue(row.title, nullableString(metadata.title) ?? 'Plano sem título'),
    planType: stringValue(row.plan_type, nullableString(metadata.plan_type) ?? 'business'),
    period: nullableString(row.period) ?? nullableString(metadata.period),
    businessFront: nullableString(row.business_front) ?? nullableString(metadata.business_front),
    version: numberValue(row.version, numberValue(metadata.version, 1)),
    status: stringValue(row.status, 'draft'),
    diagnosis: nullableString(row.diagnosis),
    priorities: array(row.priorities),
    kpis: array(row.kpis),
    workstreams: array(row.workstreams),
    risks: array(row.risks),
    assumptions: array(row.assumptions),
    normalizedContent: record(row.normalized_content),
    metadata,
    updatedAt: stringValue(row.updated_at),
  }
}

function normalizeBrainEntry(row: Record<string, unknown>): SnapshotBrainEntry {
  return {
    id: stringValue(row.id),
    category: stringValue(row.category),
    sourceType: stringValue(row.source_type),
    title: stringValue(row.title),
    content: stringValue(row.content),
    confidenceScore: typeof row.confidence_score === 'number' ? row.confidence_score : null,
    sourceDocumentId: nullableString(row.source_document_id),
    createdAt: stringValue(row.created_at),
  }
}

function normalizeDocument(row: Record<string, unknown>): SnapshotDocument {
  return {
    id: stringValue(row.id),
    filename: stringValue(row.original_filename),
    documentType: nullableString(row.document_type),
    status: stringValue(row.status),
    summary: nullableString(row.summary),
    createdAt: stringValue(row.created_at),
  }
}

function normalizeDecision(row: Record<string, unknown>): SnapshotDecision {
  return {
    id: stringValue(row.id),
    title: stringValue(row.title),
    status: stringValue(row.status),
    rationale: nullableString(row.rationale),
    conditions: array(row.conditions),
    reviewDate: nullableString(row.review_date),
    updatedAt: stringValue(row.updated_at),
  }
}

function normalizeFollowUp(row: Record<string, unknown>): SnapshotFollowUp {
  return {
    id: stringValue(row.id),
    decisionId: nullableString(row.decision_id),
    title: stringValue(row.title),
    status: stringValue(row.status),
    owner: nullableString(row.owner_label) ?? nullableString(row.owner),
    dueDate: nullableString(row.due_date),
    updatedAt: stringValue(row.updated_at),
  }
}

function normalizeBoardPack(row: Record<string, unknown>): SnapshotBoardPack {
  return {
    id: stringValue(row.id),
    businessPlanId: nullableString(row.business_plan_id),
    version: numberValue(row.version, 1),
    status: stringValue(row.status),
    executiveSummary: nullableString(row.executive_summary),
    strategicQuestions: array(row.strategic_questions),
    updatedAt: stringValue(row.updated_at),
  }
}

async function loadPlans(companyId: string) {
  const service = serviceClient()
  const current = await service
    .from('business_plans')
    .select('id, title, plan_type, period, business_front, version, status, diagnosis, priorities, kpis, workstreams, risks, assumptions, normalized_content, metadata, updated_at')
    .eq('company_id', companyId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (!current.error) return current

  const legacy = await service
    .from('business_plans')
    .select('id, status, diagnosis, priorities, kpis, workstreams, risks, assumptions, updated_at')
    .eq('company_id', companyId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(20)

  return legacy
}

export async function resolveBoardSourceSnapshot(input: {
  company: CurrentCompany
  selectedPlanId?: string | null
  founderQuestion?: string | null
}): Promise<BoardSourceSnapshot> {
  const { company } = input
  const service = serviceClient()

  const [
    plansResult,
    entriesResult,
    documentsResult,
    decisionsResult,
    followUpsResult,
    boardPacksResult,
  ] = await Promise.all([
    loadPlans(company.id),
    service
      .from('company_brain_entries')
      .select('id, category, source_type, title, content, confidence_score, source_document_id, created_at')
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(80),
    service
      .from('uploaded_documents')
      .select('id, original_filename, document_type, status, summary, created_at')
      .eq('company_id', company.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20),
    service
      .from('decisions')
      .select('id, title, status, rationale, conditions, review_date, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(20),
    service
      .from('follow_ups')
      .select('id, decision_id, title, status, owner_label, owner, due_date, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(40),
    service
      .from('board_packs')
      .select('id, business_plan_id, version, status, executive_summary, strategic_questions, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const errors = [
    plansResult.error,
    entriesResult.error,
    documentsResult.error,
    decisionsResult.error,
    followUpsResult.error,
    boardPacksResult.error,
  ].filter(Boolean)
  if (errors.length) throw new Error(errors.map(error => error?.message).join('; '))

  const plans = (plansResult.data ?? []).map(row => normalizePlan(row as Record<string, unknown>))
  const boardPacks = (boardPacksResult.data ?? []).map(row => normalizeBoardPack(row as Record<string, unknown>))
  const selectedPlan = plans.find(plan => plan.id === input.selectedPlanId)
    ?? plans.find(plan => boardPacks[0]?.businessPlanId === plan.id)
    ?? plans.find(plan => plan.status === 'approved')
    ?? plans.find(plan => plan.status === 'ready_for_review')
    ?? plans[0]
    ?? null
  const entries = (entriesResult.data ?? []).map(row => normalizeBrainEntry(row as Record<string, unknown>))
  const documents = (documentsResult.data ?? []).map(row => normalizeDocument(row as Record<string, unknown>))
  const priorDecisions = (decisionsResult.data ?? []).map(row => normalizeDecision(row as Record<string, unknown>))
  const followUps = (followUpsResult.data ?? []).map(row => normalizeFollowUp(row as Record<string, unknown>))
  const boardPack = boardPacks.find(pack => !selectedPlan || pack.businessPlanId === selectedPlan.id)
    ?? boardPacks[0]
    ?? null
  const companySnapshot = {
    id: company.id,
    name: company.name,
    mainChallenge: nullableString(company.main_challenge)
      ?? nullableString(record(company.metadata).main_challenge),
  }
  const founderQuestion = chooseFounderQuestion({
    explicitQuestion: input.founderQuestion,
    plan: selectedPlan,
    brainEntries: entries,
    company: companySnapshot,
  })
  const sourceRefs = [
    `company:${company.id}`,
    ...(selectedPlan ? [`business_plan:${selectedPlan.id}:v${selectedPlan.version}`] : []),
    ...entries.map(entry => `company_brain_entry:${entry.id}`),
    ...documents.map(document => `uploaded_document:${document.id}`),
    ...priorDecisions.map(decision => `decision:${decision.id}`),
    ...followUps.map(followUp => `follow_up:${followUp.id}`),
    ...(boardPack ? [`board_pack:${boardPack.id}:v${boardPack.version}`] : []),
  ]
  const frozenContent = {
    company: companySnapshot,
    plan: selectedPlan,
    brainEntries: entries,
    documents,
    priorDecisions,
    followUps,
    boardPack,
    founderQuestion,
    sourceRefs,
  }
  const hash = canonicalSnapshotHash(frozenContent)
  const resolvedAt = new Date().toISOString()

  return {
    id: `source-snapshot-${hash.slice(0, 20)}`,
    version: 1,
    hash,
    resolvedAt,
    company: companySnapshot,
    plan: selectedPlan,
    brainEntries: entries,
    documents,
    priorDecisions,
    followUps,
    boardPack,
    founderQuestion: founderQuestion.question,
    founderQuestionSource: founderQuestion.source,
    sourceRefs,
    summary: [
      `${company.name}.`,
      selectedPlan ? `Plano: ${selectedPlan.title}, versão ${selectedPlan.version}.` : 'Nenhum plano selecionado.',
      `${entries.length} memórias, ${documents.length} documentos, ${priorDecisions.length} decisões anteriores e ${followUps.length} ações.`,
      founderQuestion.question ? `Pergunta proposta: ${founderQuestion.question}` : 'A pergunta da sessão ainda precisa ser nomeada.',
    ].join(' '),
  }
}
