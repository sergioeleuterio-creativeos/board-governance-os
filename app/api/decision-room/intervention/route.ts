import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { requestRoomIntervention } from '@/lib/decision-room/contracts'
import { maxTurnsForSession, normalizeSelectedAgents, sessionIds } from '@/lib/decision-room/session-config'
import type { BoardTurn, InterventionRequest, SessionTypeId } from '@/lib/decision-room/types'

const validSessionIds = sessionIds()
const kinds = new Set(['challenge', 'evidence', 'invite'])

function parseBody(value: unknown): InterventionRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.sessionId !== 'string' || !validSessionIds.has(body.sessionId as SessionTypeId)) return null
  if (typeof body.kind !== 'string' || !kinds.has(body.kind)) return null
  const sessionId = body.sessionId as SessionTypeId
  const log = Array.isArray(body.log) ? body.log.filter((item): item is BoardTurn => {
    return !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string'
  }).slice(-(maxTurnsForSession(sessionId) + 4)) : undefined
  const advisorTurns = (log ?? []).filter(turn => !turn.studio).length
  if (advisorTurns >= maxTurnsForSession(sessionId)) return null
  return {
    sessionId,
    kind: body.kind as InterventionRequest['kind'],
    log,
    selectedAgents: normalizeSelectedAgents(body.selectedAgents),
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = parseBody(await req.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid intervention request' }, { status: 400 })

    return NextResponse.json({ turn: await requestRoomIntervention(input) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request intervention' },
      { status: 500 },
    )
  }
}
