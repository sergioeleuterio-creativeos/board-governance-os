#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const migrationPath = path.join(process.cwd(), 'supabase/migrations/0001_board_governance_os_foundation.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

const requiredRlsTables = [
  'organizations',
  'organization_memberships',
  'companies',
  'company_memberships',
  'uploaded_documents',
  'document_extractions',
  'company_brain_entries',
  'governance_cycles',
  'governance_inputs',
  'business_plans',
  'board_packs',
  'board_sessions',
  'agent_reviews',
  'agent_conversations',
  'decisions',
  'follow_ups',
  'referral_requests',
  'export_artifacts',
  'audit_events',
]

const requiredPolicyFragments = [
  'create policy "Org members can read organizations"',
  'create policy "Org admins can manage organizations"',
  'create policy "Org members can read memberships"',
  'create policy "Company members can read companies"',
  'create policy "Company members can read company memberships"',
  'create policy "Company members can read uploaded documents"',
  'create policy "Company members can read brain entries"',
  'create policy "Company members can read governance cycles"',
  'create policy "Company members can read board packs"',
  'create policy "Company members can read board sessions"',
  'create policy "Company members can read decisions"',
  'create policy "Company members can read follow ups"',
  'create policy "Org members can read audit events"',
]

const requiredStorageFragments = [
  "insert into storage.buckets",
  "'company-documents'",
  "'board-exports'",
]

const failures = []

for (const table of requiredRlsTables) {
  if (!sql.includes(`alter table public.${table} enable row level security`)) {
    failures.push(`Missing RLS enablement for ${table}`)
  }
}

for (const fragment of requiredPolicyFragments) {
  if (!sql.includes(fragment)) failures.push(`Missing policy fragment: ${fragment}`)
}

for (const fragment of requiredStorageFragments) {
  if (!sql.includes(fragment)) failures.push(`Missing storage fragment: ${fragment}`)
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  checked_rls_tables: requiredRlsTables.length,
  checked_policy_fragments: requiredPolicyFragments.length,
  checked_storage_fragments: requiredStorageFragments.length,
}, null, 2))
