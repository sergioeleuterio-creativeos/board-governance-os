#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const outputDir = process.argv[2] || path.join('/tmp', 'board-os-export-qa')

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

fs.mkdirSync(outputDir, { recursive: true })

const { data: artifacts, error } = await service
  .from('export_artifacts')
  .select('id, export_type, storage_bucket, storage_path, metadata, status, created_at')
  .eq('status', 'ready')
  .order('created_at', { ascending: false })
  .limit(12)

if (error) throw new Error(error.message)
if (!artifacts?.length) throw new Error('No ready export artifacts found.')

const downloaded = []

for (const artifact of artifacts) {
  const { data: signed, error: signedError } = await service.storage
    .from(artifact.storage_bucket)
    .createSignedUrl(artifact.storage_path, 60 * 10)
  if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? `No signed URL for ${artifact.id}`)

  const response = await fetch(signed.signedUrl)
  if (!response.ok) throw new Error(`${artifact.id} download failed: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const filename = `${artifact.created_at.replace(/[:.]/g, '-')}-${artifact.id}.${artifact.export_type}`
  const filePath = path.join(outputDir, filename)
  fs.writeFileSync(filePath, buffer)
  downloaded.push({
    artifact_id: artifact.id,
    export_type: artifact.export_type,
    content_type: artifact.metadata?.content_type ?? null,
    bytes: buffer.byteLength,
    path: filePath,
  })
}

console.log(JSON.stringify({ output_dir: outputDir, downloaded }, null, 2))
