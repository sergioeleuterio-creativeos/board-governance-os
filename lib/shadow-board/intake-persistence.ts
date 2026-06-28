import 'server-only'

import type { User } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/auth-server'
import { ensureUserWorkspace } from '@/lib/shadow-board/bootstrap'
import type { CompanyBrainIntakeDraft, IntakeBuildResult } from '@/lib/shadow-board/intake'

export interface PersistCompanyBrainIntakeResult {
  organizationId: string
  companyId: string
  governanceCycleId: string
  inputsCreated: number
  memoryEntriesCreated: number
  queuedFiles: number
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)

  return slug || 'company'
}

function integerOrNull(value: string): number | null {
  const cleaned = value.replace(/[^\d]/g, '')
  if (!cleaned) return null
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function compactContent(lines: Array<string | null | undefined>): string {
  return lines
    .map(line => line?.trim())
    .filter(Boolean)
    .join('\n')
}

function intakeMetadata(draft: CompanyBrainIntakeDraft, result: IntakeBuildResult) {
  return {
    source: 'company_brain_intake',
    intake_draft_id: draft.id,
    locale: draft.locale,
    quality: result.quality,
    files: draft.files,
    saved_at: new Date().toISOString(),
  }
}

async function ensureCompany(
  organizationId: string,
  userId: string,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
) {
  const service = serviceClient()
  const companyName = draft.company.name.trim() || 'Untitled company'
  const slug = slugify(companyName)
  const metadata = {
    ...intakeMetadata(draft, result),
    strategy: draft.strategy,
    finance: draft.finance,
    team: draft.team,
    notes_count: draft.notes.length,
  }

  const payload = {
    organization_id: organizationId,
    user_id: userId,
    name: companyName,
    slug,
    industry: draft.company.industry || null,
    business_model: draft.company.businessModel || null,
    revenue_range: draft.company.revenueRange || null,
    employee_count: integerOrNull(draft.company.employeeCount),
    stage: draft.company.stage || null,
    jurisdiction: draft.company.jurisdiction || null,
    default_locale: draft.locale,
    goals: draft.strategy.goals || null,
    main_challenge: draft.strategy.mainChallenge || null,
    status: 'active',
    metadata,
  }

  const { data: existing, error: lookupError } = await service
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)

  if (existing?.id) {
    const { data: company, error } = await service
      .from('companies')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error || !company) throw new Error(error?.message || 'Failed to update company')
    return company
  }

  const { data: company, error } = await service
    .from('companies')
    .insert(payload)
    .select('id')
    .single()

  if (error || !company) throw new Error(error?.message || 'Failed to create company')
  return company
}

async function ensureCompanyMembership(companyId: string, userId: string) {
  const service = serviceClient()
  const { error } = await service
    .from('company_memberships')
    .upsert({
      company_id: companyId,
      user_id: userId,
      role: 'founder',
      status: 'active',
    }, { onConflict: 'company_id,user_id' })

  if (error) throw new Error(error.message)
}

async function ensureGovernanceCycle(
  organizationId: string,
  companyId: string,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
) {
  const service = serviceClient()
  const metadata = {
    ...intakeMetadata(draft, result),
    source_company_name: draft.company.name,
    queued_files_count: draft.files.length,
  }
  const payload = {
    organization_id: organizationId,
    company_id: companyId,
    title: `Diagnostic intake - ${draft.company.name.trim() || 'Company'}`,
    cycle_type: 'diagnostic',
    status: 'intake',
    current_stage: 'intake',
    data_quality_score: result.quality.total,
    metadata,
  }

  const { data: existing, error: lookupError } = await service
    .from('governance_cycles')
    .select('id')
    .eq('company_id', companyId)
    .contains('metadata', { intake_draft_id: draft.id })
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)

  if (existing?.id) {
    const { data: cycle, error } = await service
      .from('governance_cycles')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error || !cycle) throw new Error(error?.message || 'Failed to update governance cycle')
    return cycle
  }

  const { data: cycle, error } = await service
    .from('governance_cycles')
    .insert(payload)
    .select('id')
    .single()

  if (error || !cycle) throw new Error(error?.message || 'Failed to create governance cycle')
  return cycle
}

function buildGovernanceInputs(
  organizationId: string,
  companyId: string,
  governanceCycleId: string,
  userId: string,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
) {
  const metadata = intakeMetadata(draft, result)
  const base = {
    organization_id: organizationId,
    company_id: companyId,
    governance_cycle_id: governanceCycleId,
    created_by: userId,
    metadata,
  }

  const inputs = [
    {
      ...base,
      mode: 'form',
      prompt: 'Company profile',
      content: compactContent([
        draft.company.name,
        draft.company.industry,
        draft.company.businessModel,
        draft.company.revenueRange,
        draft.company.employeeCount,
        draft.company.stage,
        draft.company.jurisdiction,
      ]),
      structured_data: draft.company,
    },
    {
      ...base,
      mode: 'form',
      prompt: 'Strategy and challenge',
      content: compactContent([
        draft.strategy.goals,
        draft.strategy.mainChallenge,
        draft.strategy.currentPlan,
        draft.strategy.strategicQuestions,
      ]),
      structured_data: draft.strategy,
    },
    {
      ...base,
      mode: 'form',
      prompt: 'Financial snapshot',
      content: compactContent([
        draft.finance.revenue,
        draft.finance.margin,
        draft.finance.cashRunway,
        draft.finance.topCustomerConcentration,
        draft.finance.financialRisks,
      ]),
      structured_data: draft.finance,
    },
    {
      ...base,
      mode: 'form',
      prompt: 'Team and operating cadence',
      content: compactContent([
        draft.team.leadership,
        draft.team.keyRoles,
        draft.team.operatingCadence,
        draft.team.talentRisks,
      ]),
      structured_data: draft.team,
    },
    ...draft.notes.map(note => ({
      ...base,
      mode: note.mode,
      prompt: note.mode === 'voice' ? 'Voice intake note' : 'Chat intake note',
      content: note.content,
      structured_data: note,
    })),
    ...(draft.voiceTranscript.trim()
      ? [{
          ...base,
          mode: 'voice',
          prompt: 'Voice transcript draft',
          content: draft.voiceTranscript,
          structured_data: { transcript: draft.voiceTranscript },
        }]
      : []),
    ...(draft.files.length
      ? [{
          ...base,
          mode: 'file',
          prompt: 'Queued intake files',
          content: draft.files.map(file => `${file.name} (${file.type || 'unknown'}, ${file.size} bytes)`).join('\n'),
          structured_data: { files: draft.files },
        }]
      : []),
  ]

  return inputs.filter(input => input.content.trim().length > 0)
}

async function replaceGovernanceInputs(
  organizationId: string,
  companyId: string,
  governanceCycleId: string,
  userId: string,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
) {
  const service = serviceClient()

  const { error: deleteError } = await service
    .from('governance_inputs')
    .delete()
    .eq('governance_cycle_id', governanceCycleId)
    .contains('metadata', { intake_draft_id: draft.id })

  if (deleteError) throw new Error(deleteError.message)

  const inputs = buildGovernanceInputs(organizationId, companyId, governanceCycleId, userId, draft, result)
  if (inputs.length === 0) return 0

  const { error } = await service.from('governance_inputs').insert(inputs)
  if (error) throw new Error(error.message)
  return inputs.length
}

async function replaceMemoryEntries(
  organizationId: string,
  companyId: string,
  userId: string,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
) {
  const service = serviceClient()

  const { error: deleteError } = await service
    .from('company_brain_entries')
    .delete()
    .eq('company_id', companyId)
    .contains('metadata', { intake_draft_id: draft.id })

  if (deleteError) throw new Error(deleteError.message)

  const entries = result.memoryCandidates.map((candidate, index) => ({
    organization_id: organizationId,
    company_id: companyId,
    created_by: userId,
    category: candidate.category,
    source_type: candidate.sourceType,
    title: candidate.title,
    content: candidate.content,
    confidence_score: Math.max(55, Math.min(95, result.quality.total)),
    status: 'active',
    metadata: {
      ...intakeMetadata(draft, result),
      candidate_index: index,
    },
  }))

  if (entries.length === 0) return 0

  const { error } = await service.from('company_brain_entries').insert(entries)
  if (error) throw new Error(error.message)
  return entries.length
}

async function writeAuditEvent(
  organizationId: string,
  companyId: string,
  userId: string,
  draft: CompanyBrainIntakeDraft,
  result: PersistCompanyBrainIntakeResult
) {
  const service = serviceClient()
  await service.from('audit_events').insert({
    organization_id: organizationId,
    company_id: companyId,
    actor_user_id: userId,
    event_type: 'company_brain.intake_saved',
    entity_type: 'governance_cycle',
    entity_id: result.governanceCycleId,
    metadata: {
      intake_draft_id: draft.id,
      inputs_created: result.inputsCreated,
      memory_entries_created: result.memoryEntriesCreated,
      queued_files: result.queuedFiles,
    },
  })
}

export async function persistCompanyBrainIntake(
  user: User,
  draft: CompanyBrainIntakeDraft,
  result: IntakeBuildResult
): Promise<PersistCompanyBrainIntakeResult> {
  const workspace = await ensureUserWorkspace(user)
  const organizationId = workspace.organization?.id
  if (!organizationId) throw new Error('No organization available for authenticated user')

  const company = await ensureCompany(organizationId, user.id, draft, result)
  await ensureCompanyMembership(company.id, user.id)

  const cycle = await ensureGovernanceCycle(organizationId, company.id, draft, result)
  const inputsCreated = await replaceGovernanceInputs(organizationId, company.id, cycle.id, user.id, draft, result)
  const memoryEntriesCreated = await replaceMemoryEntries(organizationId, company.id, user.id, draft, result)

  const persistence = {
    organizationId,
    companyId: company.id,
    governanceCycleId: cycle.id,
    inputsCreated,
    memoryEntriesCreated,
    queuedFiles: draft.files.length,
  }

  await writeAuditEvent(organizationId, company.id, user.id, draft, persistence)

  return persistence
}
