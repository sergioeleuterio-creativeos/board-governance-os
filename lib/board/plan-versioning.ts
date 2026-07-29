export type PlanSourceType =
  | 'founder_input'
  | 'file'
  | 'whatsapp'
  | 'advisory_session'
  | 'consolidated'

export type PlanVersionInput = {
  title: string
  planType: string
  period: string | null
  businessFront: string | null
  sourceType: PlanSourceType
  rawSource: unknown
  normalizedContent: Record<string, unknown>
  parentPlanId: string | null
  consolidateFromPlanIds: string[]
}

function text(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function normalizePlanVersionInput(value: unknown): PlanVersionInput | null {
  const input = record(value)
  const title = text(input.title)
  const planType = text(input.planType ?? input.plan_type, 60).toLowerCase()
  const sourceType = text(input.sourceType ?? input.source_type, 40) as PlanSourceType
  const allowedSources = new Set<PlanSourceType>([
    'founder_input',
    'file',
    'whatsapp',
    'advisory_session',
    'consolidated',
  ])
  if (title.length < 3 || planType.length < 3 || !allowedSources.has(sourceType)) return null

  const rawSource = input.rawSource ?? input.raw_source
  if (
    (typeof rawSource !== 'string' || rawSource.trim().length < 4)
    && Object.keys(record(rawSource)).length === 0
    && !Array.isArray(rawSource)
  ) return null
  const consolidationIds = input.consolidateFromPlanIds ?? input.consolidate_from_plan_ids

  return {
    title,
    planType,
    period: text(input.period, 40) || null,
    businessFront: text(input.businessFront ?? input.business_front, 80) || null,
    sourceType,
    rawSource,
    normalizedContent: record(input.normalizedContent ?? input.normalized_content),
    parentPlanId: text(input.parentPlanId ?? input.parent_plan_id, 80) || null,
    consolidateFromPlanIds: Array.isArray(consolidationIds)
      ? consolidationIds
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())
        .slice(0, 20)
      : [],
  }
}

export function nextPlanVersion(existingVersions: number[]) {
  const valid = existingVersions.filter(value => Number.isInteger(value) && value > 0)
  return valid.length ? Math.max(...valid) + 1 : 1
}

export function planScopeKey(input: Pick<PlanVersionInput, 'planType' | 'period' | 'businessFront'>) {
  return [
    input.planType.toLowerCase(),
    input.businessFront?.toLowerCase() ?? '',
    input.period?.toLowerCase() ?? '',
  ].join(':')
}
