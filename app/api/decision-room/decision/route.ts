import { NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin } from '@/lib/auth-server'
import { captureRoomDecision } from '@/lib/decision-room/contracts'
import { persistDecisionRoomCapture } from '@/lib/decision-room/persistence'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { normalizeSelectedAgents, sessionIds, sessionKindFor } from '@/lib/decision-room/session-config'
import type { BoardTurn, DecisionCaptureRequest, DecisionState, SessionTypeId } from '@/lib/decision-room/types'

const validSessionIds = sessionIds()
const states = new Set(['approved', 'deferred'])

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

function roomLog(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is BoardTurn => {
    return !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string'
  }).slice(-60) : undefined
}

function parseBody(value: unknown): DecisionCaptureRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.sessionId !== 'string' || !validSessionIds.has(body.sessionId as SessionTypeId)) return null
  if (typeof body.state !== 'string' || !states.has(body.state)) return null
  const sessionId = body.sessionId as SessionTypeId
  return {
    sessionId,
    state: body.state as DecisionState,
    sessionKind: sessionKindFor(sessionId),
    clientRoomId: typeof body.clientRoomId === 'string' ? body.clientRoomId : undefined,
    activeQuestion: typeof body.activeQuestion === 'string' ? body.activeQuestion : undefined,
    queue: stringArray(body.queue),
    log: roomLog(body.log),
    requestedData: stringArray(body.requestedData),
    bypassedData: stringArray(body.bypassedData),
    selectedAgents: normalizeSelectedAgents(body.selectedAgents),
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = parseBody(await req.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid decision capture request' }, { status: 400 })

    const result = await captureRoomDecision(input)
    const company = await getCurrentCompanyForUser(user)

    if (!company) {
      return NextResponse.json({
        ...result,
        persistence: { persisted: false, reason: 'no_active_company' },
      })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    try {
      const persistence = await persistDecisionRoomCapture({
        company,
        userId: user.id,
        request: input,
        decision: result.decision,
        followUps: result.followUps,
      })

      return NextResponse.json({ ...result, persistence })
    } catch (persistenceError) {
      return NextResponse.json({
        ...result,
        persistence: {
          persisted: false,
          error: persistenceError instanceof Error ? persistenceError.message : 'Failed to persist decision-room capture',
        },
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture decision' },
      { status: 500 },
    )
  }
}
