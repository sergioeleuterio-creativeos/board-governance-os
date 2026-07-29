import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  createRequestSignature,
  evidenceStatusLabel,
  normalizeEvidenceStatus,
  normalizeOutputType,
  normalizeRoleBrief,
  validateCreativeOSEnvelope,
  validateCreativeOSResponse,
  verifyRequestSignature,
} from '../lib/creative-os/contract.ts'
import { buildStrategicSourceDocument } from '../lib/board/strategic-source.ts'

const migrationUrl = new URL('../supabase/migrations/0005_strategic_source_handoff.sql', import.meta.url)
const sourceRouteUrl = new URL('../app/api/board/strategic-source/route.ts', import.meta.url)
const handoffRouteUrl = new URL('../app/api/board/creative-os-handoff/route.ts', import.meta.url)
const handoffClientUrl = new URL('../lib/creative-os/handoff-client.ts', import.meta.url)
const adapterUrl = new URL('../lib/creative-os/adapter.ts', import.meta.url)
const boardScreenUrl = new URL('../components/board/AsyncBoardScreen.tsx', import.meta.url)

const requestId = '31b8df1f-0f64-4c72-a029-d26f720a6ddd'
const envelope = {
  contractVersion: '1.0',
  requestId,
  idempotencyKey: 'board-os:ssd:test:v1:abc',
  operation: 'import_handoff',
  sourceSystem: 'board_os',
  companyRef: {
    boardOsCompanyId: '88bf22fc-726e-4a77-b61f-fb0335398bad',
  },
  sourceSnapshot: {
    id: 'source:test',
    version: 1,
    hash: 'abc123',
  },
  payload: {
    strategicSourceDocument: {
      id: 'document:test',
    },
  },
}

test('the v1 envelope accepts a complete handoff and rejects ambiguous mutations', () => {
  assert.equal(validateCreativeOSEnvelope(envelope).ok, true)
  assert.deepEqual(validateCreativeOSEnvelope({ ...envelope, contractVersion: '2.0' }), {
    ok: false,
    error: 'unsupported contractVersion',
  })
  assert.equal(validateCreativeOSEnvelope({ ...envelope, requestId: 'not-a-uuid' }).ok, false)
  assert.equal(validateCreativeOSEnvelope({ ...envelope, operation: 'upsert_everything' }).ok, false)
  assert.equal(validateCreativeOSEnvelope({ ...envelope, idempotencyKey: '' }).ok, false)
})

test('signed requests validate current bodies and reject stale or changed payloads', () => {
  const body = JSON.stringify(envelope)
  const timestamp = '2026-07-29T15:00:00.000Z'
  const signed = createRequestSignature({ secret: 'test-only-secret', timestamp, body })
  assert.equal(signed.bodyHash.length, 64)
  assert.equal(verifyRequestSignature({
    secret: 'test-only-secret',
    timestamp,
    body,
    signature: signed.signature,
    now: Date.parse(timestamp) + 30_000,
  }), true)
  assert.equal(verifyRequestSignature({
    secret: 'test-only-secret',
    timestamp,
    body: `${body} `,
    signature: signed.signature,
    now: Date.parse(timestamp) + 30_000,
  }), false)
  assert.equal(verifyRequestSignature({
    secret: 'test-only-secret',
    timestamp,
    body,
    signature: signed.signature,
    now: Date.parse(timestamp) + 6 * 60_000,
  }), false)
})

test('evidence, role briefs, and output types normalize across the compatibility window', () => {
  assert.equal(evidenceStatusLabel(normalizeEvidenceStatus('CONFIRMED')), 'CONFIRMADO')
  assert.equal(evidenceStatusLabel(normalizeEvidenceStatus('RISCO ATIVO')), 'RISCO ATIVO')
  assert.equal(evidenceStatusLabel(normalizeEvidenceStatus('unexpected')), 'PARCIAL')
  assert.deepEqual(normalizeRoleBrief({ role: 'CFO', brief: 'Protect the runway.' }), {
    code: 'CFO',
    angle: 'Protect the runway.',
    evidence: 'Protect the runway.',
    pressure: 'Protect the runway.',
  })
  assert.equal(normalizeOutputType('campaign_plan'), 'campaign')
  assert.equal(normalizeOutputType('room_outcome_summary'), 'minutes')
  assert.equal(normalizeOutputType('unknown'), null)
})

test('Creative OS success requires artifact identity and complete provenance', () => {
  const response = {
    contractVersion: '1.0',
    requestId,
    status: 'accepted',
    artifact: {
      type: 'strategic_source_document',
      schemaVersion: '1.0',
      id: 'creative-artifact-123',
      payload: {},
    },
    provenance: {
      sourceIds: ['document:test'],
      inferredFields: [],
      missingEvidence: [],
      generatedAt: '2026-07-29T15:00:00.000Z',
      provider: 'creative_os',
    },
    warnings: [],
  }
  assert.equal(validateCreativeOSResponse(response, requestId).ok, true)
  assert.equal(validateCreativeOSResponse({
    ...response,
    artifact: { ...response.artifact, id: '' },
  }, requestId).ok, false)
  assert.equal(validateCreativeOSResponse({
    ...response,
    provenance: { ...response.provenance, provider: 'unknown' },
  }, requestId).ok, false)
})

test('the Strategic Source Document preserves the decision, viewpoints, direction, KPIs, risks, and lineage', () => {
  const input = {
    company: { id: 'company-1', name: 'Atlas' },
    plan: {
      id: 'plan-1',
      title: 'Growth Plan 2027',
      planType: 'marketing',
      period: '2027',
      businessFront: 'Brazil',
      version: 2,
      diagnosis: 'CAC is rising faster than retained revenue.',
      priorities: ['Retention before acquisition'],
      kpis: [{ metric: 'Net revenue retention', target: '110%' }],
      workstreams: [],
      risks: ['Payback above 18 months'],
      assumptions: ['Onboarding capacity remains fixed'],
      normalizedContent: {},
    },
    boardPack: {
      id: 'pack-1',
      version: 3,
      contentHash: 'pack-hash',
      executiveSummary: 'Choose where the next R$ 300k compounds.',
      strategicQuestions: ['What evidence would reverse the choice?'],
      risks: ['Retention cohort is incomplete'],
      decisionCandidates: [],
    },
    boardSession: {
      id: 'session-1',
      activeQuestion: 'Should Atlas fund acquisition or retention first?',
      sourceSnapshotId: 'snapshot-1',
      sourceSnapshotHash: 'snapshot-hash',
    },
    contributions: [
      {
        id: 'contribution-1',
        phase: 'final_positions',
        contributionType: 'final_position',
        body: 'Fund retention until NRR crosses 110%.',
        participantType: 'synthetic',
        displayName: 'Growth Advisor',
        roleLabel: 'Growth',
        sourceReferences: ['board_pack:pack-1'],
      },
      {
        id: 'contribution-2',
        phase: 'founder_decision',
        contributionType: 'decision',
        body: 'Fund retention for 90 days, then review.',
        participantType: 'human',
        displayName: 'Founder',
        roleLabel: 'Founder',
        sourceReferences: ['board_session:session-1'],
      },
    ],
    minutes: {
      id: 'minutes-1',
      minutes: 'The board closed with a conditional retention bet.',
      finalRecommendation: 'Protect the learning window.',
      conflicts: [],
    },
    decisions: [],
    commitments: [{
      id: 'follow-up-1',
      title: 'Publish retention cohort',
      action: 'CFO and CMO publish the cohort.',
      owner: 'CMO',
      dueDate: '2026-08-15',
      status: 'open',
    }],
    createdAt: '2026-07-29T15:00:00.000Z',
  }
  const first = buildStrategicSourceDocument(input)
  const second = buildStrategicSourceDocument(input)
  assert.equal(first.immutableHash, second.immutableHash)
  assert.equal(first.immutableHash.length, 64)
  assert.equal(first.content.decisionInQuestion, input.boardSession.activeQuestion)
  assert.equal(first.content.advisorViewpoints.length, 1)
  assert.equal(first.content.approvedDirection.decision, 'Fund retention for 90 days, then review.')
  assert.deepEqual(first.content.kpis, input.plan.kpis)
  assert.equal(first.content.sourceReferences.includes('meeting_minutes:minutes-1'), true)
  assert.match(first.markdown, /## Síntese do Chair/)
  assert.match(first.markdown, /## Proveniência/)
  assert.doesNotMatch(first.markdown, /\[object Object\]/)
})

test('migration keeps documents immutable and handoffs idempotent and admin-scoped', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  assert.match(sql, /create table if not exists public\.strategic_source_documents/i)
  assert.match(sql, /create table if not exists public\.creative_os_handoffs/i)
  assert.match(sql, /idempotency_key text not null unique/i)
  assert.match(sql, /Strategic Source Document content and provenance are immutable/i)
  assert.match(sql, /Company admins can manage Creative OS handoffs/)
  assert.match(sql, /unique \(board_session_id, version\)/)
})

test('the API is truthful: no success without persistence, explicit consent, and a returned artifact', async () => {
  const [sourceRoute, handoffRoute, client] = await Promise.all([
    readFile(sourceRouteUrl, 'utf8'),
    readFile(handoffRouteUrl, 'utf8'),
    readFile(handoffClientUrl, 'utf8'),
  ])
  assert.match(sourceRoute, /persisted: true/)
  assert.match(sourceRoute, /strategic_source_document_id: document\.id/)
  assert.match(sourceRoute, /Close the minutes before creating/)
  assert.match(handoffRoute, /confirm_handoff === true/)
  assert.match(handoffRoute, /handed_off: false/)
  assert.match(handoffRoute, /handed_off: true/)
  assert.match(handoffRoute, /creative_os_artifact_id: artifact\.id/)
  assert.match(client, /attempts < 2/)
  assert.match(client, /response\.status >= 500/)
  assert.match(client, /response\.status >= 500 \? 'failed' : 'rejected'/)
  assert.match(client, /CREATIVE_OS_HANDOFF_ENABLED/)
  assert.doesNotMatch(client, /console\.(log|error)/)
})

test('page reads cannot mutate Creative OS and the founder sees one explicit handoff', async () => {
  const [adapter, screen] = await Promise.all([
    readFile(adapterUrl, 'utf8'),
    readFile(boardScreenUrl, 'utf8'),
  ])
  const enrich = adapter.slice(adapter.indexOf('export async function enrichDecisionRoomReadout'))
  assert.doesNotMatch(enrich, /upsertCreativeOSCompany/)
  assert.equal((enrich.match(/runCapability\(/g) ?? []).length, 1)
  assert.match(adapter, /CREATIVE_OS_LEGACY_CAPABILITIES_ENABLED/)
  assert.match(screen, /Criar Fonte Estratégica/)
  assert.match(screen, /Continuar no Creative OS/)
  assert.match(screen, /confirm_handoff: true/)
  assert.match(screen, /Conexão protegida/)
  assert.match(screen, /readableContributionBody\(item\.body\)/)
  assert.match(screen, /object Object/)
})
