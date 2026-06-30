#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const MIN_BYTES = 128

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

loadEnvFile(`${ROOT}/.env.local`)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await supabase
  .from('export_artifacts')
  .select('id, export_type, status, storage_bucket, storage_path, metadata, created_at')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) throw new Error(error.message)
const artifacts = data ?? []
if (!artifacts.length) {
  throw new Error('No export artifacts found. Create at least one Board Pack export before QA.')
}

const failures = []
const warnings = []
for (const artifact of artifacts) {
  const metadata = asRecord(artifact.metadata)
  const bytes = Number(metadata.bytes ?? 0)
  const contentType = String(metadata.content_type ?? '')
  const ttl = metadata.signed_url_ttl_seconds == null ? null : Number(metadata.signed_url_ttl_seconds)

  if (artifact.status !== 'ready') failures.push(`${artifact.id}: status is ${artifact.status}`)
  if (artifact.storage_bucket !== 'board-exports') failures.push(`${artifact.id}: unexpected bucket ${artifact.storage_bucket}`)
  if (!artifact.storage_path) failures.push(`${artifact.id}: missing storage path`)
  if (!contentType) failures.push(`${artifact.id}: missing content type`)
  if (!Number.isFinite(bytes) || bytes < MIN_BYTES) failures.push(`${artifact.id}: artifact too small (${bytes} bytes)`)
  if (ttl == null) {
    warnings.push(`${artifact.id}: legacy artifact without signed URL TTL metadata`)
  } else if (!Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_SIGNED_URL_TTL_SECONDS) {
    failures.push(`${artifact.id}: signed URL TTL out of policy (${ttl})`)
  }
}

if (failures.length) {
  console.error('Export artifact QA failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  checked: artifacts.length,
  warnings,
  latest: artifacts[0]?.created_at,
  export_types: [...new Set(artifacts.map((artifact) => artifact.export_type))],
}, null, 2))
