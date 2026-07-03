import 'server-only'

import type {
  BoardBrief,
  DecisionRoomReadout,
  ExecutionOutput,
  RoleBrief,
  StrategyDiagnosis,
} from '@/lib/decision-room/types'

export type CreativeOSMode = 'mock' | 'http' | 'worker'

type CapabilityName =
  | 'runStrategyDiagnosis'
  | 'createBoardBrief'
  | 'createRoleBriefs'
  | 'createCampaignPlan'
  | 'compressRoomOutcome'

type CapabilityFallbacks = {
  diagnosis: StrategyDiagnosis
  boardBrief: BoardBrief
  outputs: ExecutionOutput[]
}

type CapabilityResponse = Partial<{
  diagnosis: Partial<StrategyDiagnosis>
  boardBrief: Partial<BoardBrief>
  roleBriefs: Array<Partial<RoleBrief>>
  outputs: Array<Partial<ExecutionOutput>>
}>

type CreativeOSPayload = {
  capability: CapabilityName
  company?: {
    name?: string
  }
  diagnosis: StrategyDiagnosis
  boardBrief: BoardBrief
  outputs: ExecutionOutput[]
}

const DEFAULT_TIMEOUT_MS = 45_000

function creativeOSMode(): CreativeOSMode {
  const mode = (process.env.CREATIVE_OS_MODE ?? 'mock').toLowerCase()
  if (mode === 'http' || mode === 'worker') return mode
  return 'mock'
}

function timeoutMs() {
  const parsed = Number.parseInt(process.env.CREATIVE_OS_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
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
        status: item?.status ?? fallback.evidenceMap[index]?.status ?? 'PARCIAL',
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
  return fallback.map((roleFallback) => {
    const matched = input.find(item => item.code === roleFallback.code)
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
    const matched = input.find(item => item.type === outputFallback.type)
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
  const baseUrl = process.env.CREATIVE_OS_URL?.replace(/\/+$/, '')
  const apiKey = process.env.CREATIVE_OS_API_KEY
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
  if (mode === 'mock') return null
  if (mode === 'http') return httpCapability(capability, payload)
  return workerCapability(capability, payload)
}

export async function runStrategyDiagnosis(input: CapabilityFallbacks): Promise<StrategyDiagnosis> {
  const response = await runCapability('runStrategyDiagnosis', {
    capability: 'runStrategyDiagnosis',
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeDiagnosis(response?.diagnosis, input.diagnosis)
}

export async function createBoardBrief(input: CapabilityFallbacks): Promise<BoardBrief> {
  const response = await runCapability('createBoardBrief', {
    capability: 'createBoardBrief',
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
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeRoleBriefs(response?.roleBriefs, input.boardBrief.roleBriefs)
}

export async function createCampaignPlan(input: CapabilityFallbacks): Promise<ExecutionOutput[]> {
  const response = await runCapability('createCampaignPlan', {
    capability: 'createCampaignPlan',
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeOutputs(response?.outputs, input.outputs)
}

export async function compressRoomOutcome(input: CapabilityFallbacks): Promise<ExecutionOutput[]> {
  const response = await runCapability('compressRoomOutcome', {
    capability: 'compressRoomOutcome',
    diagnosis: input.diagnosis,
    boardBrief: input.boardBrief,
    outputs: input.outputs,
  })
  return sanitizeOutputs(response?.outputs, input.outputs)
}

export async function enrichDecisionRoomReadout(readout: DecisionRoomReadout): Promise<DecisionRoomReadout> {
  const fallback = {
    diagnosis: readout.diagnosis,
    boardBrief: readout.boardBrief,
    outputs: readout.outputs,
  }

  const diagnosis = await runStrategyDiagnosis(fallback)
  const withDiagnosis = { ...fallback, diagnosis }
  const [boardBrief, outputs] = await Promise.all([
    createBoardBrief(withDiagnosis),
    createCampaignPlan(withDiagnosis),
  ])

  return {
    ...readout,
    diagnosis,
    boardBrief,
    outputs,
  }
}
