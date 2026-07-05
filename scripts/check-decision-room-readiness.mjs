const adapter = process.env.DECISION_ROOM_ADAPTER || 'mock'
const vercelEnv = process.env.VERCEL_ENV || ''
const aiProvider = (process.env.AI_PROVIDER || '').toLowerCase()
const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY)
const creativeOSMode = (process.env.CREATIVE_OS_MODE || 'mock').toLowerCase()
const hasCreativeOSUrl = Boolean(process.env.CREATIVE_OS_URL)
const hasCreativeOSKey = Boolean(process.env.CREATIVE_OS_API_KEY)

const errors = []
const warnings = []

if (!['mock', 'live'].includes(adapter)) {
  errors.push(`DECISION_ROOM_ADAPTER must be "mock" or "live"; received "${adapter}".`)
}

if (!['mock', 'http', 'worker'].includes(creativeOSMode)) {
  errors.push(`CREATIVE_OS_MODE must be "mock", "http", or "worker"; received "${creativeOSMode}".`)
}

if (process.env.DECISION_ROOM_SEED) {
  errors.push('DECISION_ROOM_SEED is no longer supported. Use current-company data or training packs instead.')
}

if (adapter === 'live') {
  if (aiProvider && aiProvider !== 'openai') {
    warnings.push(`DECISION_ROOM_ADAPTER="live" is optimized for OpenAI; current AI_PROVIDER="${aiProvider}".`)
  }

  if (!hasOpenAIKey) {
    errors.push('DECISION_ROOM_ADAPTER="live" requires OPENAI_API_KEY.')
  }
}

if (adapter === 'mock' && vercelEnv === 'production') {
  warnings.push('Production is using DECISION_ROOM_ADAPTER="mock"; advisor turns will be deterministic.')
}

if (creativeOSMode === 'http') {
  if (!hasCreativeOSUrl) errors.push('CREATIVE_OS_MODE="http" requires CREATIVE_OS_URL.')
  if (!hasCreativeOSKey) errors.push('CREATIVE_OS_MODE="http" requires CREATIVE_OS_API_KEY.')
}

if (creativeOSMode === 'worker') {
  warnings.push('CREATIVE_OS_MODE="worker" is reserved for a server-side Creative OS worker and currently falls back to Board OS output.')
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`)
}

if (errors.length) {
  for (const error of errors) {
    console.error(`FAIL ${error}`)
  }
  process.exit(1)
}

console.log(`OK Decision Room readiness: adapter=${adapter}, creative_os=${creativeOSMode}, env=${vercelEnv || 'local'}`)
