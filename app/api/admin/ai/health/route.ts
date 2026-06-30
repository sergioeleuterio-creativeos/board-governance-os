import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'
import { callJSONAI, resolveAIProvider, resolveModel, type ModelPurpose } from '@/lib/board/model-router'

type HealthOutput = {
  ok: boolean
  label: string
}

const purposes: ModelPurpose[] = [
  'default',
  'intake',
  'document_extraction',
  'advisor_review',
  'governance_synthesis',
  'agent_challenge',
  'final_decision',
]

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const provider = resolveAIProvider()
  const models = purposes.map((purpose) => ({
    purpose,
    provider,
    model: resolveModel(provider, purpose),
  }))

  return NextResponse.json({
    provider,
    configured: provider !== 'mock',
    openai_key_present: !!process.env.OPENAI_API_KEY,
    models,
  })
}

export async function POST() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const provider = resolveAIProvider()
  const groups = new Map<string, ModelPurpose[]>()
  for (const purpose of purposes) {
    const model = resolveModel(provider, purpose)
    groups.set(model, [...(groups.get(model) ?? []), purpose])
  }

  const results = []
  for (const [model, modelPurposes] of groups.entries()) {
    const purpose = modelPurposes[0] ?? 'default'
    try {
      const result = await callJSONAI<HealthOutput>({
        purpose,
        temperature: 0,
        maxTokens: 80,
        fallbackOnError: false,
        system: 'Return a small valid JSON health response only.',
        prompt: 'Return exactly this JSON shape with ok true and label "board-governance-os-ai-health".',
        fallback: () => ({ ok: false, label: 'fallback' }),
      })

      results.push({
        provider: result.provider,
        model: result.model,
        purposes: modelPurposes,
        ok: result.output.ok === true,
        label: result.output.label,
        used_fallback: result.usedFallback,
      })
    } catch (error) {
      results.push({
        provider,
        model,
        purposes: modelPurposes,
        ok: false,
        error: error instanceof Error ? error.message : 'ai_health_failed',
      })
    }
  }

  const ok = results.length > 0 && results.every((result) => result.ok)
  const service = serviceClient()
  await service.from('audit_events').insert({
    actor_user_id: admin.id,
    event_type: 'ai.health_check',
    entity_type: 'ai_provider',
    metadata: {
      provider,
      ok,
      model_count: results.length,
      results,
    },
  })

  return NextResponse.json({
    provider,
    ok,
    results,
  }, { status: ok ? 200 : 502 })
}
