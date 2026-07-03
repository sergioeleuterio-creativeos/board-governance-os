import 'server-only'

import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { getDecisionRoomReadout } from './contracts'
import type { DecisionRecord, DecisionRoomReadout, FollowUp } from './types'

type DecisionRow = {
  id: string
  title: string | null
  rationale: string | null
  risks: string | null
  tradeoffs: unknown
  confidence_score: number | null
  conditions: unknown
  owner_label: string | null
  owner: string | null
  review_date: string | null
  metadata: Record<string, unknown> | null
}

type FollowUpRow = {
  id: string
  title: string | null
  action: string | null
  description: string | null
  status: string | null
  owner_label: string | null
  owner: string | null
  due_date: string | null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function lines(value: string | null | undefined): string[] {
  return (value ?? '').split('\n').map(item => item.trim()).filter(Boolean)
}

function decisionRecord(row: DecisionRow): DecisionRecord {
  const metadata = row.metadata ?? {}
  const rejectedOptions = stringArray(row.tradeoffs)
  const linked = stringArray(metadata.linked_sources)
  const sourceId = typeof metadata.decision_room_source_id === 'string'
    ? metadata.decision_room_source_id
    : `DEC-${row.id.slice(0, 8).toUpperCase()}`
  const riskLines = lines(row.risks)
  const rejectedFallback = riskLines.length && !['low', 'medium', 'high', 'critical'].includes(riskLines[0])
    ? riskLines
    : ['Não registrado']

  return {
    id: sourceId,
    statement: row.title ?? 'Decisão sem título',
    rationale: row.rationale ?? 'Racional ainda não registrado.',
    rejectedOptions: rejectedOptions.length ? rejectedOptions : rejectedFallback,
    confidence: row.confidence_score ?? 0,
    owner: row.owner_label ?? row.owner ?? 'Sem responsável',
    conditions: stringArray(row.conditions).length ? stringArray(row.conditions) : ['Não registrado'],
    reviewDate: row.review_date ?? 'Sem revisão',
    linked,
  }
}

function followUpStatus(status: string | null | undefined): FollowUp['status'] {
  if (status === 'in_progress') return 'Em andamento'
  if (status === 'blocked') return 'Bloqueado'
  if (status === 'done') return 'Concluído'
  return 'Aberto'
}

function followUpRecord(row: FollowUpRow): FollowUp {
  const [dependency = 'Sem dependência registrada', escalation = 'Sem escalada registrada'] = lines(row.description)

  return {
    title: row.title ?? row.action ?? 'Follow-up sem título',
    owner: row.owner_label ?? row.owner ?? 'Sem dono',
    due: row.due_date ?? 'Sem prazo',
    status: followUpStatus(row.status),
    dependency,
    escalation,
  }
}

export async function getDecisionRoomReadoutWithMemory(): Promise<DecisionRoomReadout> {
  const readout = await getDecisionRoomReadout()
  const user = await getSessionUser()
  if (!user) return readout

  const company = await getCurrentCompanyForUser(user)
  if (!company) return readout

  const service = serviceClient()
  const [{ data: decisions, error: decisionsError }, { data: followUps, error: followUpsError }] = await Promise.all([
    service
      .from('decisions')
      .select('id, title, rationale, risks, tradeoffs, confidence_score, conditions, owner_label, owner, review_date, metadata')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(100),
    service
      .from('follow_ups')
      .select('id, title, action, description, status, owner_label, owner, due_date')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(150),
  ])

  if (decisionsError || followUpsError) {
    return readout
  }

  return {
    ...readout,
    decisions: decisions?.length ? (decisions as DecisionRow[]).map(decisionRecord) : readout.decisions,
    followUps: followUps?.length ? (followUps as FollowUpRow[]).map(followUpRecord) : readout.followUps,
  }
}
