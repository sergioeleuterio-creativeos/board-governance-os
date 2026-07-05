import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { nextBoardTurn } from '@/lib/decision-room/contracts'
import { maxTurnsForSession, normalizeSelectedAgents, sessionIds } from '@/lib/decision-room/session-config'
import type { SessionTypeId, TurnRequest } from '@/lib/decision-room/types'

const validSessionIds = sessionIds()

function parseBody(value: unknown): TurnRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.sessionId !== 'string' || !validSessionIds.has(body.sessionId as SessionTypeId)) return null
  if (typeof body.index !== 'number' || !Number.isInteger(body.index) || body.index < 0) return null
  const sessionId = body.sessionId as SessionTypeId
  if (body.index >= maxTurnsForSession(sessionId)) return null
  return {
    sessionId,
    index: body.index,
    selectedAgents: normalizeSelectedAgents(body.selectedAgents),
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = parseBody(await req.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid turn request' }, { status: 400 })

    return NextResponse.json({ turn: await nextBoardTurn(input) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get next turn' },
      { status: 500 },
    )
  }
}
