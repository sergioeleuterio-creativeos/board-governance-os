import 'server-only'

import { serviceClient } from '@/lib/auth-server'
import type {
  BoardBrief,
  DecisionRoomReadout,
  ExecutionOutput,
  RoleBrief,
  StrategyDiagnosis,
} from '@/lib/decision-room/types'
import type { CurrentCompany } from '@/lib/shadow-board/current-company-server'
import {
  evidenceStatusLabel,
  normalizeEvidenceStatus,
  normalizeOutputType,
  normalizeRoleBrief,
} from '@/lib/creative-os/contract'

export type CreativeOSMode = 'mock' | 'http' | 'worker'

type CapabilityName =
  | 'runStrategyDiagnosis'
  | 'createBoardBrief'
  | 'createRoleBriefs'
  | 'createCampaignPlan'
  | 'compressRoomOutcome'

type CapabilityFallbacks = {
  company?: CreativeOSCompanyContext
  diagnosis: StrategyDiagnosis
  boardBrief: BoardBrief
  outputs: ExecutionOutput[]
}

type CapabilityResponse = Partial<{
  company: Partial<CreativeOSCompanyLink>
  diagnosis: Partial<StrategyDiagnosis>
  boardBrief: Partial<BoardBrief>
  roleBriefs: Array<Partial<RoleBrief>>
  outputs: Array<Partial<ExecutionOutput>>
  brands: CreativeOSBrandLink[]
}>

type CreativeOSPayload = {
  capability: CapabilityName
  company?: CreativeOSCompanyContext
  diagnosis: StrategyDiagnosis
  boardBrief: BoardBrief
  outputs: ExecutionOutput[]
}

const DEFAULT_TIMEOUT_MS = 30_000

export type CreativeOSBrandLink = {
  creativeOsBrandId: string
  name: string
}

export type CreativeOSCompanyLink = {
  boardOsCompanyId: string
  creativeOsCompanyId: string
  canonicalCompanyKey: string
  linkStatus?: string
}

export type CreativeOSCompanyContext = {
  boardOsCompanyId: string
  creativeOsCompanyId?: string
  canonicalCompanyKey: string
  name: string
  website?: string
  industry?: string
  market?: string
  stage?: string
  businessModel?: string
  revenueRange?: string
  description?: string
  brands?: CreativeOSBrandLink[]
}

type CompanyUpsertResponse = Partial<{
  ok: boolean
  link: Partial<CreativeOSCompanyLink>
  created: {
    creativeOsCompany?: boolean
  }
  brands: CreativeOSBrandLink[]
}>

function creativeOSMode(): CreativeOSMode {
  const mode = (process.env.CREATIVE_OS_MODE ?? 'mock').toLowerCase()
  if (mode === 'http' || mode === 'worker') return mode
  return 'mock'
}

function timeoutMs() {
  const parsed = Number.parseInt(process.env.CREATIVE_OS_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

function creativeOSSyncEnabled() {
  return (process.env.CREATIVE_OS_SYNC_ENABLED ?? 'false').toLowerCase() === 'true'
}

function legacyCapabilitiesEnabled() {
  return (process.env.CREATIVE_OS_LEGACY_CAPABILITIES_ENABLED ?? 'false').toLowerCase() === 'true'
}

function creativeOSConfig() {
  return {
    baseUrl: process.env.CREATIVE_OS_URL?.replace(/\/+$/, ''),
    apiKey: process.env.CREATIVE_OS_API_KEY,
  }
}

export function creativeOSReadiness() {
  const mode = creativeOSMode()
  const syncEnabled = creativeOSSyncEnabled()
  const capabilitiesEnabled = legacyCapabilitiesEnabled()
  const { baseUrl, apiKey } = creativeOSConfig()
  const missing: string[] = []

  if (mode === 'http' && !baseUrl) missing.push('CREATIVE_OS_URL')
  if (mode === 'http' && !apiKey) missing.push('CREATIVE_OS_API_KEY')

  return {
    mode,
    syncEnabled,
    capabilitiesEnabled,
    timeoutMs: timeoutMs(),
    httpConfigured: Boolean(baseUrl && apiKey),
    baseUrlConfigured: Boolean(baseUrl),
    apiKeyConfigured: Boolean(apiKey),
    missing,
    status: mode === 'mock'
      ? 'fallback_local'
      : mode === 'worker'
        ? 'worker_reserved'
        : missing.length
          ? 'needs_configuration'
          : syncEnabled
            ? 'ready_with_company_sync'
            : capabilitiesEnabled
              ? 'ready_legacy_capability_only'
              : 'ready_handoff_only',
    sourceOfTruth: 'board_os',
    boundary: 'Creative OS enriches strategy, brief, campaign, and room-compression outputs. Board OS remains source of truth for company memory, decisions, board sessions, and follow-ups.',
  }
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberInRange(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const cleaned = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return cleaned.length ? cleaned.slice(0, 12) : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeCanonicalKey(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'company'
}

function normalizeWebsite(value: unknown) {
  const raw = optionalText(value)
  if (!raw) return undefined
  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(`https://${raw}`)
    return url.origin
  } catch {
    return raw
  }
}

function normalizeBrands(value: unknown): CreativeOSBrandLink[] | undefined {
  if (!Array.isArray(value)) return undefined
  const brands = value.flatMap((item) => {
    const record = asRecord(item)
    const creativeOsBrandId = optionalText(record.creativeOsBrandId ?? record.creative_os_brand_id ?? record.id)
    const name = optionalText(record.name)
    return creativeOsBrandId && name ? [{ creativeOsBrandId, name }] : []
  })
  return brands.length ? brands.slice(0, 20) : undefined
}

function creativeOSMetadata(metadata: Record<string, unknown>) {
  return asRecord(metadata.creative_os ?? metadata.creativeOs)
}

export function creativeOSCompanyContext(company: CurrentCompany): CreativeOSCompanyContext {
  const metadata = asRecord(company.metadata)
  const integration = creativeOSMetadata(metadata)
  const website = normalizeWebsite(
    integration.website
    ?? metadata.website
    ?? metadata.primary_domain
    ?? metadata.source_url
    ?? (Array.isArray(metadata.source_urls) ? metadata.source_urls[0] : undefined)
  )

  return {
    boardOsCompanyId: company.id,
    creativeOsCompanyId: optionalText(
      integration.creativeOsCompanyId
      ?? integration.creative_os_company_id
      ?? metadata.creativeOsCompanyId
      ?? metadata.creative_os_company_id
    ),
    canonicalCompanyKey: optionalText(integration.canonicalCompanyKey ?? integration.canonical_company_key)
      ?? normalizeCanonicalKey(company.slug || company.name),
    name: company.name,
    website,
    industry: optionalText(company.industry),
    market: optionalText(company.jurisdiction),
    stage: optionalText(company.stage),
    businessModel: optionalText(company.business_model),
    revenueRange: optionalText(company.revenue_range),
    description: optionalText(metadata.description ?? metadata.summary ?? metadata.company_description),
    brands: normalizeBrands(integration.brands),
  }
}

function mergeCreativeOSMetadata(company: CreativeOSCompanyContext, response: CompanyUpsertResponse) {
  const link = response.link ?? {}
  const creativeOsCompanyId = optionalText(link.creativeOsCompanyId) ?? company.creativeOsCompanyId
  const canonicalCompanyKey = optionalText(link.canonicalCompanyKey) ?? company.canonicalCompanyKey
  return {
    creativeOsCompanyId,
    creative_os_company_id: creativeOsCompanyId,
    canonicalCompanyKey,
    canonical_company_key: canonicalCompanyKey,
    linkStatus: optionalText(link.linkStatus) ?? 'linked',
    brands: normalizeBrands(response.brands) ?? company.brands ?? [],
    lastSyncedAt: new Date().toISOString(),
  }
}

async function persistCreativeOSCompanyLink(company: CreativeOSCompanyContext, response: CompanyUpsertResponse) {
  const service = serviceClient()
  const { data: existing, error: loadError } = await service
    .from('companies')
    .select('metadata')
    .eq('id', company.boardOsCompanyId)
    .maybeSingle()

  if (loadError) return

  const metadata = asRecord(existing?.metadata)
  const nextMetadata = {
    ...metadata,
    creative_os: {
      ...creativeOSMetadata(metadata),
      ...mergeCreativeOSMetadata(company, response),
    },
  }

  await service
    .from('companies')
    .update({ metadata: nextMetadata })
    .eq('id', company.boardOsCompanyId)
}

async function upsertCreativeOSCompany(company: CreativeOSCompanyContext): Promise<CreativeOSCompanyContext> {
  if (creativeOSMode() !== 'http' || !creativeOSSyncEnabled()) return company

  const { baseUrl, apiKey } = creativeOSConfig()
  if (!baseUrl || !apiKey) return company

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs())

  try {
    const response = await fetch(`${baseUrl}/api/board-os/companies/upsert`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        sourceSystem: 'board_os',
        idempotencyKey: `board-os-company-upsert:${company.boardOsCompanyId}`,
        company,
        context: {
          boardOsReason: 'Company selected in Board OS Decision Room.',
          availableEvidence: ['Board OS company profile', 'Board OS Company Brain summary'],
          missingEvidence: [],
        },
      }),
    })

    if (!response.ok) return company
    const body = await response.json() as CompanyUpsertResponse
    await persistCreativeOSCompanyLink(company, body)

    const link = body.link ?? {}
    return {
      ...company,
      creativeOsCompanyId: optionalText(link.creativeOsCompanyId) ?? company.creativeOsCompanyId,
      canonicalCompanyKey: optionalText(link.canonicalCompanyKey) ?? company.canonicalCompanyKey,
      brands: normalizeBrands(body.brands) ?? company.brands,
    }
  } catch {
    return company
  } finally {
    clearTimeout(timeout)
  }
}

function sanitizeDiagnosis(input: Partial<StrategyDiagnosis> | undefined, fallback: StrategyDiagnosis): StrategyDiagnosis {
  if (!input) return fallback
  return {
    statedProblem: text(input.statedProblem, fallback.statedProblem),
    inferredProblem: text(input.inferredProblem, fallback.inferredProblem),
    tension: {
      a: text(input.tension?.a, fallback.tension.a),
      b: text(input.tension?.b, fallback.tension.b),
    },
    frames: Array.isArray(input.frames) && input.frames.length
      ? input.frames.map((frame, index) => ({
        title: text(frame?.title, fallback.frames[index]?.title ?? 'Enquadramento'),
        detail: text(frame?.detail, fallback.frames[index]?.detail ?? ''),
        selected: typeof frame?.selected === 'boolean' ? frame.selected : fallback.frames[index]?.selected,
      })).slice(0, 6)
      : fallback.frames,
    evidenceMap: Array.isArray(input.evidenceMap) && input.evidenceMap.length
      ? input.evidenceMap.map((item, index) => ({
        claim: text(item?.claim, fallback.evidenceMap[index]?.claim ?? 'Evidência a confirmar'),
        source: text(item?.source, fallback.evidenceMap[index]?.source ?? 'Creative OS'),
        status: evidenceStatusLabel(normalizeEvidenceStatus(
          item?.status ?? fallback.evidenceMap[index]?.status ?? 'partial',
        )),
      })).slice(0, 12)
      : fallback.evidenceMap,
    recommendedQuestion: text(input.recommendedQuestion, fallback.recommendedQuestion),
    decisionQuestions: stringArray(input.decisionQuestions, fallback.decisionQuestions ?? [fallback.recommendedQuestion]),
    confidence: numberInRange(input.confidence, fallback.confidence),
    missingContext: stringArray(input.missingContext, fallback.missingContext),
  }
}

function sanitizeRoleBriefs(input: Array<Partial<RoleBrief>> | undefined, fallback: RoleBrief[]) {
  if (!input?.length) return fallback
  const normalized = input
    .map(item => normalizeRoleBrief(item))
    .filter((item): item is NonNullable<ReturnType<typeof normalizeRoleBrief>> => Boolean(item))
  return fallback.map((roleFallback) => {
    const matched = normalized.find(item => item.code === roleFallback.code)
    return {
      code: roleFallback.code,
      angle: text(matched?.angle, roleFallback.angle),
      evidence: text(matched?.evidence, roleFallback.evidence),
      pressure: text(matched?.pressure, roleFallback.pressure),
    }
  })
}

function sanitizeBoardBrief(input: Partial<BoardBrief> | undefined, fallback: BoardBrief): BoardBrief {
  if (!input) return fallback
  return {
    boardBrief: text(input.boardBrief, fallback.boardBrief),
    roleBriefs: sanitizeRoleBriefs(input.roleBriefs, fallback.roleBriefs),
  }
}

function sanitizeOutputs(input: Array<Partial<ExecutionOutput>> | undefined, fallback: ExecutionOutput[]) {
  if (!input?.length) return fallback
  return fallback.map((outputFallback) => {
    const matched = input.find(item => normalizeOutputType(item.type) === outputFallback.type)
    return {
      type: outputFallback.type,
      title: text(matched?.title, outputFallback.title),
      body: text(matched?.body, outputFallback.body),
      sources: stringArray(matched?.sources, outputFallback.sources),
      pages: typeof matched?.pages === 'number' && matched.pages > 0 ? Math.round(matched.pages) : outputFallback.pages,
    }
  })
}

async function httpCapability(capability: CapabilityName, payload: CreativeOSPayload): Promise<CapabilityResponse | null> {
  const { baseUrl, apiKey } = creativeOSConfig()
  if (!baseUrl || !apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs())

  try {
    const response = await fetch(`${baseUrl}/api/board-os/capabilities`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...payload, capability }),
    })

    if (!response.ok) return null
    return await response.json() as CapabilityResponse
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function workerCapability(_capability: CapabilityName, _payload: CreativeOSPayload): Promise<CapabilityResponse | null> {
  // Reserved for an in-process Creative OS worker/package. Until that code is
  // intentionally added to this server bundle, fail closed to Board OS output.
  return null
}

async function runCapability(capability: CapabilityName, payload: CreativeOSPayload) {
  const mode = creativeOSMode()
  if (mode === 'mock' || !legacyCapabilitiesEnabled()) return null
  if (mode === 'http') return httpCapability(capability, payload)
  return workerCapability(capability, payload)
}

export async function runStrategyDiagnosis(input: CapabilityFallbacks): Promise<StrategyDiagnosis> {
  const response = await runCapability('runStrategyDiagnosis', {
    capability: 'runStrategyDiagnosis',
    company: input.company,
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeDiagnosis(response?.diagnosis, input.diagnosis)
}

export async function createBoardBrief(input: CapabilityFallbacks): Promise<BoardBrief> {
  const response = await runCapability('createBoardBrief', {
    capability: 'createBoardBrief',
    company: input.company,
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  const brief = sanitizeBoardBrief(response?.boardBrief, input.boardBrief)
  return response?.roleBriefs?.length
    ? { ...brief, roleBriefs: sanitizeRoleBriefs(response.roleBriefs, brief.roleBriefs) }
    : brief
}

export async function createRoleBriefs(input: CapabilityFallbacks): Promise<RoleBrief[]> {
  const response = await runCapability('createRoleBriefs', {
    capability: 'createRoleBriefs',
    company: input.company,
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeRoleBriefs(response?.roleBriefs, input.boardBrief.roleBriefs)
}

export async function createCampaignPlan(input: CapabilityFallbacks): Promise<ExecutionOutput[]> {
  const response = await runCapability('createCampaignPlan', {
    capability: 'createCampaignPlan',
    company: input.company,
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeOutputs(response?.outputs, input.outputs)
}

export async function compressRoomOutcome(input: CapabilityFallbacks): Promise<ExecutionOutput[]> {
  const response = await runCapability('compressRoomOutcome', {
    capability: 'compressRoomOutcome',
    company: input.company,
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeOutputs(response?.outputs, input.outputs)
}

export async function enrichDecisionRoomReadout(readout: DecisionRoomReadout, context?: { company?: CurrentCompany | null }): Promise<DecisionRoomReadout> {
  // Reading a Board OS page must never create or mutate a Creative OS company.
  // Company linking and handoff now happen only through explicit founder actions.
  const company = context?.company ? creativeOSCompanyContext(context.company) : undefined
  const fallback = {
    company,
    diagnosis: readout.diagnosis,
    boardBrief: readout.boardBrief,
    outputs: readout.outputs,
  }

  // Compatibility window: the legacy connector is opt-in and receives one
  // consolidated request. Production defaults to the versioned handoff path.
  const response = await runCapability('runStrategyDiagnosis', {
    capability: 'runStrategyDiagnosis',
    ...fallback,
  })
  const diagnosis = sanitizeDiagnosis(response?.diagnosis, readout.diagnosis)
  const boardBrief = sanitizeBoardBrief(response?.boardBrief, readout.boardBrief)
  const roleBriefs = sanitizeRoleBriefs(response?.roleBriefs, boardBrief.roleBriefs)
  const outputs = sanitizeOutputs(response?.outputs, readout.outputs)

  return {
    ...readout,
    diagnosis,
    boardBrief: { ...boardBrief, roleBriefs },
    outputs,
  }
}
