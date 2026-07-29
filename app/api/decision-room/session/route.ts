import { NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin } from '@/lib/auth-server'
import { persistDecisionRoomSession } from '@/lib/decision-room/persistence'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { normalizeSelectedAgents, sessionIds, sessionKindFor } from '@/lib/decision-room/session-config'
import { resolveBoardSourceSnapshot } from '@/lib/board/source-resolver'
import type { BoardTurn, DecisionRoomSessionSaveRequest, DecisionState, SessionTypeId } from '@/lib/decision-room/types'

const validSessionIds = sessionIds()
const states = new Set(['approved', 'deferred'])

function persistenceErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/schema cache|column .* does not exist|could not find the .* column/i.test(message)) {
    return 'A atualização de contexto desta versão ainda não foi aplicada. Seu conteúdo continua nesta tela.'
  }
  return message || 'Failed to save decision-room session'
}

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
  if (typeof body.sessionId !== 'string' || !validSessionIds.has(body.sessionId as SessionTypeId)) return null
  if (body.decided !== null && body.decided !== undefined && (typeof body.decided !== 'string' || !states.has(body.decided))) return null
  const sessionId = body.sessionId as SessionTypeId

  return {
    clientRoomId: body.clientRoomId,
    sessionId,
    activeQuestion: typeof body.activeQuestion === 'string' ? body.activeQuestion : undefined,
    queue: stringArray(body.queue),
    log: roomLog(body.log),
    requestedData: stringArray(body.requestedData),
    bypassedData: stringArray(body.bypassedData),
    baseIdx: typeof body.baseIdx === 'number' && Number.isInteger(body.baseIdx) ? body.baseIdx : undefined,
    baseComplete: typeof body.baseComplete === 'boolean' ? body.baseComplete : undefined,
    sessionKind: sessionKindFor(sessionId),
    selectedAgents: normalizeSelectedAgents(body.selectedAgents),
    decided: typeof body.decided === 'string' ? body.decided as DecisionState : null,
    questionConfirmed: body.questionConfirmed === true,
    sourceSnapshotId: typeof body.sourceSnapshotId === 'string' ? body.sourceSnapshotId : undefined,
    sourceSnapshotHash: typeof body.sourceSnapshotHash === 'string' ? body.sourceSnapshotHash : undefined,
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
        error: 'Create or select a company before saving a session.',
        persistence: { persisted: false, reason: 'no_active_company' },
      }, { status: 409 })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access
    const sourceSnapshot = await resolveBoardSourceSnapshot({ company })
    if (
      input.sourceSnapshotId
      && (
        input.sourceSnapshotId !== sourceSnapshot.id
        || (input.sourceSnapshotHash && input.sourceSnapshotHash !== sourceSnapshot.hash)
      )
    ) {
      return NextResponse.json(
        { error: 'Company context changed. Reopen the session before saving.' },
        { status: 409 },
      )
    }

    const persistence = await persistDecisionRoomSession({
      company,
      userId: user.id,
      state: input,
    })
    if (!persistence.persisted || !persistence.boardSessionId) {
      return NextResponse.json(
        {
          error: 'Session persistence could not be confirmed.',
          persistence,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ persistence })
  } catch (error) {
    return NextResponse.json(
      { error: persistenceErrorMessage(error) },
      { status: 500 },
    )
  }
}
