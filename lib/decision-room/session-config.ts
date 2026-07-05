import type { AgentCode, SessionKind, SessionTypeId } from './types'

const sessionKinds: Record<SessionTypeId, SessionKind> = {
  problem: 'advisory',
  reset: 'advisory',
  campaign: 'advisory',
  hotseat: 'board',
  prep: 'board',
  review: 'board',
}

const sessionTurnLimits: Record<SessionTypeId, number> = {
  problem: 5,
  reset: 6,
  campaign: 6,
  hotseat: 8,
  prep: 6,
  review: 5,
}

const validAgentCodes = new Set<AgentCode>(['BB', 'CEO', 'CFO', 'CMO', 'CRO', 'PRD', 'CAT', 'MDA', 'CRM', 'RED'])

export function sessionKindFor(id: SessionTypeId): SessionKind {
  return sessionKinds[id]
}

export function maxTurnsForSession(id: SessionTypeId): number {
  return sessionTurnLimits[id]
}

export function normalizeSelectedAgents(value: unknown): AgentCode[] {
  const selected = Array.isArray(value)
    ? value.filter((item): item is AgentCode => typeof item === 'string' && validAgentCodes.has(item as AgentCode))
    : []
  const unique = Array.from(new Set(['BB' as AgentCode, ...selected]))
  return unique.length ? unique : ['BB']
}

export function sessionIds(): Set<SessionTypeId> {
  return new Set(Object.keys(sessionKinds) as SessionTypeId[])
}
