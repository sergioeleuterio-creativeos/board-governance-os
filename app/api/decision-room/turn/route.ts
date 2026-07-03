import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { nextBoardTurn } from '@/lib/decision-room/contracts'
import type { SessionTypeId } from '@/lib/decision-room/types'

const sessionIds = new Set(['problem', 'hotseat', 'prep', 'reset', 'campaign', 'review'])

function parseBody(value: unknown): { sessionId: SessionTypeId; index: number } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.sessionId !== 'string' || !sessionIds.has(body.sessionId)) return null
  if (typeof body.index !== 'number' || !Number.isInteger(body.index) || body.index < 0) return null
  return { sessionId: body.sessionId as SessionTypeId, index: body.index }
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
