import 'server-only'

import {
  createRequestSignature,
  validateCreativeOSEnvelope,
  validateCreativeOSResponse,
  type CreativeOSEnvelope,
  type CreativeOSResponse,
} from '@/lib/creative-os/contract'

const DEFAULT_TIMEOUT_MS = 30_000
const FAILURE_THRESHOLD = 3
const CIRCUIT_OPEN_MS = 5 * 60 * 1000

let consecutiveFailures = 0
let circuitOpenedAt = 0

export type CreativeOSHandoffResult =
  | {
    ok: true
    status: 'accepted' | 'completed'
    response: CreativeOSResponse
    attempts: number
    durationMs: number
  }
  | {
    ok: false
    status: 'disabled' | 'not_configured' | 'circuit_open' | 'rejected' | 'degraded' | 'failed'
    error: string
    response?: CreativeOSResponse
    attempts: number
    durationMs: number
  }

function enabled() {
  return (process.env.CREATIVE_OS_HANDOFF_ENABLED ?? 'false').toLowerCase() === 'true'
}

function config() {
  return {
    mode: (process.env.CREATIVE_OS_MODE ?? 'mock').toLowerCase(),
    baseUrl: process.env.CREATIVE_OS_URL?.replace(/\/+$/, ''),
    apiKey: process.env.CREATIVE_OS_API_KEY,
    signingSecret: process.env.CREATIVE_OS_SIGNING_SECRET ?? process.env.CREATIVE_OS_API_KEY,
  }
}

function timeoutMs() {
  const configured = Number.parseInt(process.env.CREATIVE_OS_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_TIMEOUT_MS
  return Math.min(configured, DEFAULT_TIMEOUT_MS)
}

function circuitIsOpen(now = Date.now()) {
  if (consecutiveFailures < FAILURE_THRESHOLD) return false
  if (now - circuitOpenedAt >= CIRCUIT_OPEN_MS) {
    consecutiveFailures = 0
    circuitOpenedAt = 0
    return false
  }
  return true
}

function recordFailure() {
  consecutiveFailures += 1
  if (consecutiveFailures >= FAILURE_THRESHOLD && !circuitOpenedAt) circuitOpenedAt = Date.now()
}

function recordSuccess() {
  consecutiveFailures = 0
  circuitOpenedAt = 0
}

export function creativeOSHandoffReadiness() {
  const current = config()
  const missing = enabled()
    ? [
      !current.baseUrl ? 'CREATIVE_OS_URL' : null,
      !current.apiKey ? 'CREATIVE_OS_API_KEY' : null,
      !current.signingSecret ? 'CREATIVE_OS_SIGNING_SECRET' : null,
    ].filter(Boolean)
    : []
  const active = enabled() && current.mode === 'http' && missing.length === 0
  return {
    contractVersion: '1.0',
    enabled: active,
    requestedEnabled: enabled(),
    mode: current.mode,
    configured: missing.length === 0,
    missing,
    circuit: circuitIsOpen() ? 'open' : 'closed',
    status: active
      ? circuitIsOpen() ? 'temporarily_unavailable' : 'ready'
      : enabled() ? 'needs_configuration' : 'disabled',
    sourceOfTruth: 'board_os',
  }
}

async function requestOnce(
  envelope: CreativeOSEnvelope,
  configValue: ReturnType<typeof config>,
  signal: AbortSignal,
) {
  const body = JSON.stringify(envelope)
  const timestamp = new Date().toISOString()
  const signed = createRequestSignature({
    secret: configValue.signingSecret!,
    timestamp,
    body,
  })
  return fetch(`${configValue.baseUrl}/api/integrations/board-os/v1/handoffs`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${configValue.apiKey}`,
      'X-Board-OS-API-Key': configValue.apiKey!,
      'X-Board-OS-Contract': envelope.contractVersion,
      'X-Board-OS-Timestamp': timestamp,
      'X-Board-OS-Content-SHA256': signed.bodyHash,
      'X-Board-OS-Signature': signed.signature,
      'X-Idempotency-Key': envelope.idempotencyKey,
    },
    body,
  })
}

export async function sendStrategicSourceHandoff(
  envelope: CreativeOSEnvelope,
): Promise<CreativeOSHandoffResult> {
  const startedAt = Date.now()
  const validated = validateCreativeOSEnvelope(envelope)
  if (!validated.ok) {
    return { ok: false, status: 'rejected', error: validated.error, attempts: 0, durationMs: 0 }
  }

  const readiness = creativeOSHandoffReadiness()
  if (!readiness.requestedEnabled) {
    return {
      ok: false,
      status: 'disabled',
      error: 'Creative OS handoff is disabled until the founder and receiving contract are ready.',
      attempts: 0,
      durationMs: Date.now() - startedAt,
    }
  }
  if (!readiness.enabled) {
    return {
      ok: false,
      status: readiness.circuit === 'open' ? 'circuit_open' : 'not_configured',
      error: readiness.circuit === 'open'
        ? 'Creative OS handoff is temporarily paused after repeated failures.'
        : 'Creative OS handoff is not fully configured.',
      attempts: 0,
      durationMs: Date.now() - startedAt,
    }
  }

  const current = config()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs())
  let attempts = 0

  try {
    while (attempts < 2) {
      attempts += 1
      let response: Response
      try {
        response = await requestOnce(envelope, current, controller.signal)
      } catch (error) {
        if (attempts < 2 && !controller.signal.aborted) continue
        recordFailure()
        return {
          ok: false,
          status: 'failed',
          error: controller.signal.aborted
            ? 'Creative OS did not respond within the connector budget.'
            : error instanceof Error ? error.message : 'Creative OS request failed.',
          attempts,
          durationMs: Date.now() - startedAt,
        }
      }

      if (response.status >= 500 && attempts < 2) continue
      if (!response.ok) {
        recordFailure()
        return {
          ok: false,
          status: response.status >= 500 ? 'failed' : 'rejected',
          error: `Creative OS rejected the handoff with status ${response.status}.`,
          attempts,
          durationMs: Date.now() - startedAt,
        }
      }

      const payload = await response.json().catch(() => null)
      const parsed = validateCreativeOSResponse(payload, envelope.requestId)
      if (!parsed.ok) {
        recordFailure()
        return {
          ok: false,
          status: 'degraded',
          error: `Creative OS returned an incompatible response: ${parsed.error}.`,
          attempts,
          durationMs: Date.now() - startedAt,
        }
      }

      if (
        (parsed.value.status !== 'accepted' && parsed.value.status !== 'completed')
        || !parsed.value.artifact?.id
      ) {
        recordFailure()
        return {
          ok: false,
          status: parsed.value.status === 'degraded' ? 'degraded' : 'rejected',
          error: 'Creative OS did not accept a durable artifact.',
          response: parsed.value,
          attempts,
          durationMs: Date.now() - startedAt,
        }
      }

      recordSuccess()
      return {
        ok: true,
        status: parsed.value.status,
        response: parsed.value,
        attempts,
        durationMs: Date.now() - startedAt,
      }
    }
  } finally {
    clearTimeout(timer)
  }

  recordFailure()
  return {
    ok: false,
    status: 'failed',
    error: 'Creative OS handoff failed.',
    attempts,
    durationMs: Date.now() - startedAt,
  }
}
