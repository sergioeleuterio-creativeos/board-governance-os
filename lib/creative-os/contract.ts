import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const CREATIVE_OS_CONTRACT_VERSION = '1.0' as const
export const CREATIVE_OS_HANDOFF_SCHEMA_VERSION = '1.0' as const

export type CreativeOSEvidenceStatus =
  | 'confirmed'
  | 'derived'
  | 'active_risk'
  | 'missing'
  | 'partial'

export type CreativeOSOperation =
  | 'analyze'
  | 'link_company'
  | 'import_handoff'
  | 'publish_result'

export type CreativeOSEnvelope = {
  contractVersion: typeof CREATIVE_OS_CONTRACT_VERSION
  requestId: string
  idempotencyKey: string
  operation: CreativeOSOperation
  sourceSystem: 'board_os'
  companyRef: {
    boardOsCompanyId: string
    creativeOsCompanyId?: string
  }
  sourceSnapshot: {
    id: string
    version: number
    hash: string
  }
  payload: Record<string, unknown>
}

export type CreativeOSResponse = {
  contractVersion: typeof CREATIVE_OS_CONTRACT_VERSION
  requestId: string
  status: 'completed' | 'accepted' | 'rejected' | 'degraded'
  artifact: {
    type: string
    schemaVersion: string
    id: string
    url?: string
    payload: Record<string, unknown>
  } | null
  companyRef?: {
    creativeOsCompanyId?: string
  }
  provenance: {
    sourceIds: string[]
    inferredFields: string[]
    missingEvidence: string[]
    generatedAt: string
    provider: 'creative_os'
  }
  warnings: string[]
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString)
}

function isUuid(value: unknown): value is string {
  return nonEmptyString(value)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizeEvidenceStatus(value: unknown): CreativeOSEvidenceStatus {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, '_')
    : ''
  const aliases: Record<string, CreativeOSEvidenceStatus> = {
    confirmed: 'confirmed',
    confirmado: 'confirmed',
    derived: 'derived',
    derivado: 'derived',
    active_risk: 'active_risk',
    'risco_ativo': 'active_risk',
    missing: 'missing',
    faltando: 'missing',
    partial: 'partial',
    parcial: 'partial',
  }
  return aliases[normalized] ?? 'partial'
}

export function evidenceStatusLabel(
  value: CreativeOSEvidenceStatus,
): 'CONFIRMADO' | 'DERIVADO' | 'RISCO ATIVO' | 'FALTANDO' | 'PARCIAL' {
  const labels: Record<
    CreativeOSEvidenceStatus,
    'CONFIRMADO' | 'DERIVADO' | 'RISCO ATIVO' | 'FALTANDO' | 'PARCIAL'
  > = {
    confirmed: 'CONFIRMADO',
    derived: 'DERIVADO',
    active_risk: 'RISCO ATIVO',
    missing: 'FALTANDO',
    partial: 'PARCIAL',
  }
  return labels[value]
}

export function normalizeRoleBrief(value: unknown): {
  code: string
  angle: string
  evidence: string
  pressure: string
} | null {
  const item = record(value)
  const code = [item.code, item.role].find(nonEmptyString)
  if (!code) return null
  const brief = nonEmptyString(item.brief) ? item.brief : ''
  return {
    code: code.toUpperCase(),
    angle: nonEmptyString(item.angle) ? item.angle : brief,
    evidence: nonEmptyString(item.evidence) ? item.evidence : brief,
    pressure: nonEmptyString(item.pressure) ? item.pressure : brief,
  }
}

export function normalizeOutputType(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  const aliases: Record<string, string> = {
    campaign_plan: 'campaign',
    room_outcome_summary: 'minutes',
    campaign: 'campaign',
    minutes: 'minutes',
    memo: 'memo',
    strategy: 'strategy',
    sales: 'sales',
    plan: 'plan',
  }
  return aliases[normalized] ?? null
}

export function createRequestSignature(input: {
  secret: string
  timestamp: string
  body: string
}) {
  const bodyHash = createHash('sha256').update(input.body).digest('hex')
  const signature = createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${bodyHash}`)
    .digest('hex')
  return { bodyHash, signature }
}

export function verifyRequestSignature(input: {
  secret: string
  timestamp: string
  body: string
  signature: string
  now?: number
  maxAgeMs?: number
}) {
  const timestamp = Date.parse(input.timestamp)
  const now = input.now ?? Date.now()
  const maxAgeMs = input.maxAgeMs ?? 5 * 60 * 1000
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > maxAgeMs) return false
  const expected = createRequestSignature(input).signature
  if (expected.length !== input.signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature))
}

export function validateCreativeOSEnvelope(value: unknown): {
  ok: true
  value: CreativeOSEnvelope
} | {
  ok: false
  error: string
} {
  const item = record(value)
  const companyRef = record(item.companyRef)
  const snapshot = record(item.sourceSnapshot)
  const operations: CreativeOSOperation[] = ['analyze', 'link_company', 'import_handoff', 'publish_result']
  if (item.contractVersion !== CREATIVE_OS_CONTRACT_VERSION) return { ok: false, error: 'unsupported contractVersion' }
  if (!isUuid(item.requestId)) return { ok: false, error: 'requestId must be a UUID' }
  if (!nonEmptyString(item.idempotencyKey) || item.idempotencyKey.length > 240) return { ok: false, error: 'invalid idempotencyKey' }
  if (!operations.includes(item.operation as CreativeOSOperation)) return { ok: false, error: 'unsupported operation' }
  if (item.sourceSystem !== 'board_os') return { ok: false, error: 'invalid sourceSystem' }
  if (!isUuid(companyRef.boardOsCompanyId)) return { ok: false, error: 'invalid boardOsCompanyId' }
  if (!nonEmptyString(snapshot.id) || !nonEmptyString(snapshot.hash)) return { ok: false, error: 'source snapshot identity is required' }
  if (!Number.isInteger(snapshot.version) || Number(snapshot.version) < 1) return { ok: false, error: 'invalid source snapshot version' }
  if (!item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload)) return { ok: false, error: 'payload must be an object' }
  return { ok: true, value: item as CreativeOSEnvelope }
}

export function validateCreativeOSResponse(value: unknown, expectedRequestId: string): {
  ok: true
  value: CreativeOSResponse
} | {
  ok: false
  error: string
} {
  const item = record(value)
  const provenance = record(item.provenance)
  const artifact = item.artifact === null ? null : record(item.artifact)
  if (item.contractVersion !== CREATIVE_OS_CONTRACT_VERSION) return { ok: false, error: 'unsupported response contractVersion' }
  if (item.requestId !== expectedRequestId) return { ok: false, error: 'response requestId mismatch' }
  if (!['completed', 'accepted', 'rejected', 'degraded'].includes(String(item.status))) return { ok: false, error: 'invalid response status' }
  if (artifact && (
    !nonEmptyString(artifact.id)
    || !nonEmptyString(artifact.type)
    || !nonEmptyString(artifact.schemaVersion)
  )) return { ok: false, error: 'invalid response artifact' }
  if (
    !stringArray(provenance.sourceIds)
    || !stringArray(provenance.inferredFields)
    || !stringArray(provenance.missingEvidence)
    || !nonEmptyString(provenance.generatedAt)
    || provenance.provider !== 'creative_os'
  ) return { ok: false, error: 'invalid response provenance' }
  if (!stringArray(item.warnings)) return { ok: false, error: 'invalid response warnings' }
  return { ok: true, value: item as CreativeOSResponse }
}
