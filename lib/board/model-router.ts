import 'server-only'

export type AIProvider = 'openai' | 'anthropic' | 'mock'

export type ModelPurpose =
  | 'default'
  | 'intake'
  | 'document_extraction'
  | 'advisor_review'
  | 'governance_synthesis'
  | 'agent_challenge'
  | 'final_decision'

type JSONCallOptions<T> = {
  purpose?: ModelPurpose
  system: string
  prompt: string
  fallback: () => T
  temperature?: number
  maxTokens?: number
  fallbackOnError?: boolean
}

type JSONCallResult<T> = {
  provider: AIProvider
  model: string
  output: T
  usedFallback: boolean
  error?: string
}

const openAIModelEnv: Partial<Record<ModelPurpose, string>> = {
  default: 'AI_MODEL',
  intake: 'OPENAI_MODEL_INTAKE',
  document_extraction: 'OPENAI_MODEL_DOCUMENT_EXTRACTION',
  advisor_review: 'OPENAI_MODEL_ADVISOR_REVIEW',
  governance_synthesis: 'OPENAI_MODEL_BOARD_BRAIN_SYNTHESIS',
  agent_challenge: 'OPENAI_MODEL_AGENT_CHALLENGE',
  final_decision: 'OPENAI_MODEL_FINAL_DECISION',
}

export function resolveAIProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase()
  if (configured === 'openai' || configured === 'anthropic' || configured === 'mock') return configured
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'mock'
}

export function resolveModel(provider: AIProvider, purpose: ModelPurpose = 'default'): string {
  if (provider === 'openai') {
    const purposeEnv = openAIModelEnv[purpose]
    const routedModel = purposeEnv ? process.env[purposeEnv] : ''
    if (routedModel) return routedModel
    if (process.env.AI_MODEL) return process.env.AI_MODEL
    return 'gpt-4.1'
  }

  if (provider === 'anthropic') {
    if (process.env.AI_MODEL) return process.env.AI_MODEL
    return 'claude-sonnet-4-6'
  }

  return `mock-${purpose}-v1`
}

export function cleanJSONText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

export function parseJSON<T>(text: string): T {
  return JSON.parse(cleanJSONText(text)) as T
}

function classifyAIError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)

  try {
    const parsed = JSON.parse(raw) as { error?: { code?: string | null; type?: string | null; message?: string | null } }
    const code = parsed.error?.code || parsed.error?.type
    if (code) return code
  } catch {
    // Fall through to string classification.
  }

  const lower = raw.toLowerCase()
  if (lower.includes('insufficient_quota')) return 'insufficient_quota'
  if (lower.includes('rate_limit')) return 'rate_limit_exceeded'
  if (lower.includes('invalid_api_key') || lower.includes('incorrect api key')) return 'invalid_api_key'
  return 'ai_call_failed'
}

export async function callJSONAI<T>({
  purpose = 'default',
  system,
  prompt,
  fallback,
  temperature = 0.2,
  maxTokens = 4096,
  fallbackOnError = true,
}: JSONCallOptions<T>): Promise<JSONCallResult<T>> {
  const provider = resolveAIProvider()
  const model = resolveModel(provider, purpose)

  if (provider === 'mock') {
    return { provider, model, output: fallback(), usedFallback: true }
  }

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return {
        provider,
        model,
        output: parseJSON<T>(data.choices?.[0]?.message?.content ?? '{}'),
        usedFallback: false,
      }
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return {
      provider,
      model,
      output: parseJSON<T>(data.content?.[0]?.text ?? '{}'),
      usedFallback: false,
    }
  } catch (error) {
    const classifiedError = classifyAIError(error)
    if (!fallbackOnError) throw new Error(classifiedError)

    return {
      provider,
      model,
      output: fallback(),
      usedFallback: true,
      error: classifiedError,
    }
  }
}
