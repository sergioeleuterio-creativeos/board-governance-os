#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { TRAINING_COMPANY_PACKS } from '../lib/board/training-sources.ts'
import { seedTrainingPackCompany } from '../lib/board/training-pack-seed.ts'

const ROOT = process.cwd()

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

function adminEmails() {
  return [
    process.env.BOARD_GOVERNANCE_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

async function must(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

async function resolveAdmin() {
  const emails = adminEmails()
  if (emails.length) {
    const profiles = await must('load admin profile by email', service
      .from('user_profiles')
      .select('id, email, is_super_admin, status')
      .in('email', emails)
      .eq('status', 'active')
      .order('created_at', { ascending: false }))
    if (profiles?.[0]) return profiles[0]
  }

  const profile = await must('load super admin profile', service
    .from('user_profiles')
    .select('id, email, is_super_admin, status')
    .eq('is_super_admin', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (!profile) throw new Error('No active super admin profile found.')
  return profile
}

async function resolveOrganization(userId) {
  const membership = await must('load admin organization', service
    .from('organization_memberships')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (!membership?.organization_id) throw new Error('No organization membership found for admin.')
  return membership.organization_id
}

const reset = process.argv.includes('--reset')
const admin = await resolveAdmin()
const organizationId = await resolveOrganization(admin.id)
const results = []

for (const pack of TRAINING_COMPANY_PACKS) {
  const result = await seedTrainingPackCompany({
    service,
    pack,
    organizationId,
    actorUserId: admin.id,
    reset,
  })
  results.push({ pack_id: pack.id, company_id: result.company_id, created: result.created })
}

console.log(JSON.stringify({ organization_id: organizationId, count: results.length, results }, null, 2))
