#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const purposes = [
  ['default', 'AI_MODEL'],
  ['intake', 'OPENAI_MODEL_INTAKE'],
  ['document_extraction', 'OPENAI_MODEL_DOCUMENT_EXTRACTION'],
  ['advisor_review', 'OPENAI_MODEL_ADVISOR_REVIEW'],
  ['governance_synthesis', 'OPENAI_MODEL_BOARD_BRAIN_SYNTHESIS'],
  ['agent_challenge', 'OPENAI_MODEL_AGENT_CHALLENGE'],
  ['final_decision', 'OPENAI_MODEL_FINAL_DECISION'],
]

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n')
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

const provider = (process.env.AI_PROVIDER || '').toLowerCase() || (process.env.OPENAI_API_KEY ? 'openai' : 'mock')

function modelFor(envName) {
  return process.env[envName] || process.env.AI_MODEL || 'gpt-4.1'
}

async function checkOpenAI(model, modelPurposes) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 80,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: 'Return {"ok":true,"label":"board-governance-os-ai-health"}.' },
      ],
    }),
  })

  const body = await response.text()
  let parsed = null
  try {
    parsed = JSON.parse(body)
  } catch {
    parsed = null
  }

  return {
    provider: 'openai',
    model,
    purposes: modelPurposes,
    status: response.status,
    ok: response.ok,
    response: response.ok
      ? JSON.parse(parsed?.choices?.[0]?.message?.content ?? '{}')
      : parsed?.error ?? body.slice(0, 500),
  }
}

async function main() {
  if (provider !== 'openai') {
    console.log(JSON.stringify({
      provider,
      ok: provider === 'mock',
      message: provider === 'mock' ? 'AI provider is mock; no external health check needed.' : 'Only OpenAI health checks are implemented in this script.',
    }, null, 2))
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing.')
  }

  const groups = new Map()
  for (const [purpose, envName] of purposes) {
    const model = modelFor(envName)
    groups.set(model, [...(groups.get(model) ?? []), purpose])
  }

  const results = []
  for (const [model, modelPurposes] of groups.entries()) {
    results.push(await checkOpenAI(model, modelPurposes))
  }

  const ok = results.every((result) => result.ok && result.response?.ok === true)
  console.log(JSON.stringify({
    provider,
    ok,
    results,
  }, null, 2))

  if (!ok) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
