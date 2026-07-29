export function readableRecommendation(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const item = value as Record<string, unknown>
  return [
    item.title,
    item.recommendation,
    item.action,
    item.detail,
    item.rationale,
    item.owner,
  ]
    .filter(part => typeof part === 'string' && part.trim())
    .map(String)
    .join(' — ')
}
