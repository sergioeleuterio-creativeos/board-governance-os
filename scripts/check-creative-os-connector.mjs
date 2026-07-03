import fs from 'node:fs'
import crypto from 'node:crypto'

const envFile = process.argv[2] || '.env.local'

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
  }
}

function fail(message) {
  console.error(`FAIL Creative OS connector: ${message}`)
  process.exit(1)
}

function ok(message) {
  console.log(`OK ${message}`)
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) fail(`${name} is required`)
  return value
}

async function postJson(url, apiKey, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // Keep the smoke output structured without dumping arbitrary service text.
  }
  return { response, json }
}

loadEnvFile(envFile)

const mode = (process.env.CREATIVE_OS_MODE || 'mock').toLowerCase()
if (mode !== 'http') {
  ok(`Creative OS connector smoke skipped: CREATIVE_OS_MODE=${mode}. Set CREATIVE_OS_MODE=http with CREATIVE_OS_URL and CREATIVE_OS_API_KEY for live cross-system QA.`)
  process.exit(0)
}

const baseUrl = requiredEnv('CREATIVE_OS_URL').replace(/\/+$/, '')
const apiKey = requiredEnv('CREATIVE_OS_API_KEY')
const boardOsCompanyId = process.env.CREATIVE_OS_SMOKE_COMPANY_ID || '00000000-0000-4000-8000-000000000703'
const canonicalCompanyKey = 'board-os-connector-smoke-test'
const runId = crypto.createHash('sha256').update(`${boardOsCompanyId}:${canonicalCompanyKey}`).digest('hex').slice(0, 12)

const company = {
  boardOsCompanyId,
  creativeOsCompanyId: null,
  canonicalCompanyKey,
  name: 'Board OS Connector Smoke Test',
  website: 'https://www.board-os.ai',
  industry: 'B2B SaaS',
  market: 'Brazil',
  stage: 'Integration QA',
  businessModel: 'Subscription',
  revenueRange: 'Test',
  description: 'Idempotent connector smoke-test company created by Board OS QA.',
}

const diagnosis = {
  statedProblem: 'Board OS needs to verify the Creative OS connector.',
  inferredProblem: 'The real risk is company identity drifting between the two systems.',
  tension: {
    a: 'The integration needs to create a company-level link.',
    b: 'Brand-level work should remain optional until Creative OS onboarding creates brands.',
  },
  frames: [],
  evidenceMap: [
    {
      claim: 'Creative OS exposes a Board OS integration endpoint.',
      source: 'Production connector smoke test',
      status: 'PARCIAL',
    },
  ],
  recommendedQuestion: 'Can Board OS link a company and request Creative OS strategy support safely?',
  decisionQuestions: [
    'Can Board OS link a company and request Creative OS strategy support safely?',
    'Does the connector preserve company-level identity separately from brand children?',
  ],
  confidence: 70,
  missingContext: ['Live client materials', 'Brand-level Creative OS onboarding'],
}

const boardBrief = {
  boardBrief: 'Validate the company-level connector before enabling broader sync.',
  roleBriefs: [],
}

const outputs = []

const unauth = await fetch(`${baseUrl}/api/board-os/capabilities`, { method: 'POST' })
if (unauth.status !== 401) fail(`unauthenticated capability call should return 401, got ${unauth.status}`)
ok('Creative OS capability route rejects unauthenticated calls')

const upsert = await postJson(`${baseUrl}/api/board-os/companies/upsert`, apiKey, {
  sourceSystem: 'board_os',
  idempotencyKey: `board-os-connector-smoke:${runId}`,
  company,
  context: {
    boardOsReason: 'Connector smoke test from Board OS.',
    availableEvidence: ['company profile'],
    missingEvidence: ['client-specific brand strategy'],
  },
})

if (!upsert.response.ok) fail(`company upsert returned ${upsert.response.status}`)
if (!upsert.json?.link?.creativeOsCompanyId) fail('company upsert did not return link.creativeOsCompanyId')
ok(`Creative OS company upsert linked company; brands=${Array.isArray(upsert.json.brands) ? upsert.json.brands.length : 0}`)

const capability = await postJson(`${baseUrl}/api/board-os/capabilities`, apiKey, {
  capability: 'runStrategyDiagnosis',
  company: {
    ...company,
    creativeOsCompanyId: upsert.json.link.creativeOsCompanyId,
  },
  diagnosis,
  boardBrief,
  outputs,
})

if (!capability.response.ok) fail(`runStrategyDiagnosis returned ${capability.response.status}`)
if (!capability.json || typeof capability.json !== 'object') fail('runStrategyDiagnosis did not return JSON')
ok(`Creative OS runStrategyDiagnosis responded with keys: ${Object.keys(capability.json).sort().join(', ') || 'none'}`)
