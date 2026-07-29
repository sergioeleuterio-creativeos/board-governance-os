import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalSnapshotHash,
  chooseFounderQuestion,
  summarizeSourceSnapshot,
} from '../lib/board/source-snapshot.ts'
import { validateDecisionContinuity } from '../lib/board/artifact-invariants.ts'
import {
  nextPlanVersion,
  normalizePlanVersionInput,
  planScopeKey,
} from '../lib/board/plan-versioning.ts'
import { readFile } from 'node:fs/promises'

const company = { id: 'company-1', name: 'Atlas', mainChallenge: 'Should Atlas expand or retain?' }
const plan = {
  id: 'plan-1',
  title: 'Marketing plan 2027',
  planType: 'marketing',
  period: '2027',
  businessFront: 'growth',
  version: 3,
  status: 'ready_for_review',
  diagnosis: 'Choose acquisition or retention.',
  priorities: [],
  kpis: [],
  workstreams: [],
  risks: [],
  assumptions: [],
  normalizedContent: {},
  metadata: { active_question: 'Should Atlas fund acquisition or retention in 2027?' },
  updatedAt: '2026-07-29T00:00:00.000Z',
}

test('snapshot hashes are stable across object key order', () => {
  assert.equal(
    canonicalSnapshotHash({ plan, company }),
    canonicalSnapshotHash({ company, plan }),
  )
})

test('an explicit founder question wins over plan and memory', () => {
  assert.deepEqual(
    chooseFounderQuestion({
      explicitQuestion: '  Which market should Atlas enter first? ',
      plan,
      company,
    }),
    {
      question: 'Which market should Atlas enter first?',
      source: 'founder_current_question',
    },
  )
})

test('the selected plan supplies the question before Company Brain fallback', () => {
  const result = chooseFounderQuestion({
    plan,
    company,
    brainEntries: [{
      id: 'entry-1',
      category: 'question',
      sourceType: 'chat',
      title: 'Older question',
      content: 'Should Atlas change pricing?',
      confidenceScore: 80,
      sourceDocumentId: null,
      createdAt: '2026-07-28T00:00:00.000Z',
    }],
  })
  assert.equal(result.question, 'Should Atlas fund acquisition or retention in 2027?')
  assert.equal(result.source, 'business_plan:plan-1:v3')
})

test('summary exposes lineage without copying the full private snapshot', () => {
  const snapshot = {
    id: 'source-snapshot-abc',
    version: 1,
    hash: 'abc',
    resolvedAt: '2026-07-29T00:00:00.000Z',
    company,
    plan,
    brainEntries: [],
    documents: [],
    priorDecisions: [],
    followUps: [],
    boardPack: null,
    founderQuestion: 'Should Atlas fund acquisition or retention in 2027?',
    founderQuestionSource: 'business_plan:plan-1:v3',
    sourceRefs: ['company:company-1', 'business_plan:plan-1:v3'],
    summary: 'Atlas. Plan version 3.',
  }
  const summary = summarizeSourceSnapshot(snapshot)
  assert.equal(summary.plan?.version, 3)
  assert.equal(summary.companyId, 'company-1')
  assert.equal('brainEntries' in summary, false)
})

test('decision continuity rejects a generic output that drops the named choice', () => {
  const result = validateDecisionContinuity({
    activeQuestion: 'Should Atlas fund acquisition or retention in 2027?',
    decisionStatement: 'Assign an owner and review in 30 days.',
    rationale: 'The team should collect more evidence.',
    sourceSnapshotId: 'source-snapshot-abc',
    sourceSnapshotHash: 'abc',
  })
  assert.equal(result.valid, false)
  assert.ok(result.issues.includes('named_decision_not_preserved'))
})

test('decision continuity accepts a sourced output that preserves the choice', () => {
  const result = validateDecisionContinuity({
    activeQuestion: 'Should Atlas fund acquisition or retention in 2027?',
    decisionStatement: 'Fund retention before acquisition in 2027.',
    rationale: 'Retention protects the current customer base while acquisition costs are reviewed.',
    sourceSnapshotId: 'source-snapshot-abc',
    sourceSnapshotHash: 'abc',
  })
  assert.equal(result.valid, true)
})

test('the Sprint 2 migration is additive and idempotent', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/0003_plan_versions_and_source_snapshots.sql', import.meta.url),
    'utf8',
  )
  assert.match(sql, /add column if not exists title/i)
  assert.match(sql, /add column if not exists source_snapshot_id/i)
  assert.match(sql, /create unique index if not exists business_plans_version_scope_idx/i)
  assert.doesNotMatch(sql, /\bdrop\s+(table|column)\b/i)
})

test('plan versions remain separate by type, front, and period', () => {
  const input = normalizePlanVersionInput({
    title: 'Brazil acquisition plan',
    planType: 'marketing',
    period: '2027',
    businessFront: 'Brazil',
    sourceType: 'founder_input',
    rawSource: 'The company will choose between enterprise acquisition and retention.',
  })
  assert.ok(input)
  assert.equal(planScopeKey(input), 'marketing:brazil:2027')
  assert.equal(nextPlanVersion([1, 2, 4]), 5)
})

test('a consolidation preserves the source plan IDs', () => {
  const input = normalizePlanVersionInput({
    title: 'Consolidated marketing plan',
    planType: 'marketing',
    period: '2027',
    sourceType: 'consolidated',
    rawSource: { summary: 'Combined plan' },
    consolidateFromPlanIds: ['plan-2026', 'plan-latam'],
  })
  assert.deepEqual(input?.consolidateFromPlanIds, ['plan-2026', 'plan-latam'])
})
