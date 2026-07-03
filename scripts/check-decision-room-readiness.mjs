const adapter = process.env.DECISION_ROOM_ADAPTER || 'mock'
const seed = process.env.DECISION_ROOM_SEED || ''
const vercelEnv = process.env.VERCEL_ENV || ''
const aiProvider = (process.env.AI_PROVIDER || '').toLowerCase()
const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY)

const errors = []
const warnings = []

if (!['mock', 'live'].includes(adapter)) {
  errors.push(`DECISION_ROOM_ADAPTER must be "mock" or "live"; received "${adapter}".`)
}

if (vercelEnv === 'production' && seed === 'lance') {
  errors.push('DECISION_ROOM_SEED="lance" is disabled in production.')
}

if (seed && seed !== 'lance') {
  errors.push(`DECISION_ROOM_SEED supports only "lance" or blank; received "${seed}".`)
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

for (const warning of warnings) {
  console.warn(`WARN ${warning}`)
}

if (errors.length) {
  for (const error of errors) {
    console.error(`FAIL ${error}`)
  }
  process.exit(1)
}

console.log(`OK Decision Room readiness: adapter=${adapter}, seed=${seed || 'blank'}, env=${vercelEnv || 'local'}`)
