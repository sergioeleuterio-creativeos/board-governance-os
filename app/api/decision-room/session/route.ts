import { NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin } from '@/lib/auth-server'
import { persistDecisionRoomSession } from '@/lib/decision-room/persistence'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import type { BoardTurn, DecisionRoomSessionSaveRequest, DecisionState, SessionTypeId } from '@/lib/decision-room/types'

const sessionIds = new Set(['problem', 'hotseat', 'prep', 'reset', 'campaign', 'review'])
const states = new Set(['approved', 'deferred'])

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

function roomLog(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is BoardTurn => {
    return !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string'
  }).slice(-60) : undefined
}

function parseBody(value: unknown): DecisionRoomSessionSaveRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.clientRoomId !== 'string' || body.clientRoomId.length < 8) return null
  if (typeof body.sessionId !== 'string' || !sessionIds.has(body.sessionId)) return null
  if (body.decided !== null && body.decided !== undefined && (typeof body.decided !== 'string' || !states.has(body.decided))) return null

  return {
    clientRoomId: body.clientRoomId,
    sessionId: body.sessionId as SessionTypeId,
    activeQuestion: typeof body.activeQuestion === 'string' ? body.activeQuestion : undefined,
    queue: stringArray(body.queue),
    log: roomLog(body.log),
    requestedData: stringArray(body.requestedData),
    bypassedData: stringArray(body.bypassedData),
    baseIdx: typeof body.baseIdx === 'number' && Number.isInteger(body.baseIdx) ? body.baseIdx : undefined,
    baseComplete: typeof body.baseComplete === 'boolean' ? body.baseComplete : undefined,
    decided: typeof body.decided === 'string' ? body.decided as DecisionState : null,
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = parseBody(await req.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid session save request' }, { status: 400 })

    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({
        persistence: { persisted: false, reason: 'no_active_company' },
      })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const persistence = await persistDecisionRoomSession({
      company,
      userId: user.id,
      state: input,
    })

    return NextResponse.json({ persistence })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save decision-room session' },
      { status: 500 },
    )
  }
}
