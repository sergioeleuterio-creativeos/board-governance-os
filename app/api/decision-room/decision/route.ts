import { NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin } from '@/lib/auth-server'
import { captureRoomDecision } from '@/lib/decision-room/contracts'
import { persistDecisionRoomCapture } from '@/lib/decision-room/persistence'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { normalizeSelectedAgents, sessionIds, sessionKindFor } from '@/lib/decision-room/session-config'
import { resolveBoardSourceSnapshot } from '@/lib/board/source-resolver'
import { validateDecisionContinuity } from '@/lib/board/artifact-invariants'
import type { BoardTurn, DecisionCaptureRequest, DecisionState, SessionTypeId } from '@/lib/decision-room/types'

const validSessionIds = sessionIds()
const states = new Set(['approved', 'deferred'])

function persistenceErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/schema cache|column .* does not exist|could not find the .* column/i.test(message)) {
    return 'A atualização de contexto desta versão ainda não foi aplicada. Seu conteúdo continua nesta tela.'
  }
  return message || 'Failed to persist decision-room capture'
}

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
  if (typeof body.activeQuestion !== 'string' || body.activeQuestion.trim().length < 10) return null
  if (body.questionConfirmed !== true) return null
  if (typeof body.sourceSnapshotId !== 'string' || body.sourceSnapshotId.trim().length < 10) return null
  const sessionId = body.sessionId as SessionTypeId
  return {
    sessionId,
    state: body.state as DecisionState,
    sessionKind: sessionKindFor(sessionId),
    clientRoomId: typeof body.clientRoomId === 'string' ? body.clientRoomId : undefined,
    activeQuestion: body.activeQuestion.trim(),
    queue: stringArray(body.queue),
    log: roomLog(body.log),
    requestedData: stringArray(body.requestedData),
    bypassedData: stringArray(body.bypassedData),
    selectedAgents: normalizeSelectedAgents(body.selectedAgents),
    questionConfirmed: true,
    sourceSnapshotId: body.sourceSnapshotId,
    sourceSnapshotHash: typeof body.sourceSnapshotHash === 'string' ? body.sourceSnapshotHash : undefined,
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const input = parseBody(await req.json().catch(() => null))
    if (!input) return NextResponse.json({ error: 'Invalid decision capture request' }, { status: 400 })

    const result = await captureRoomDecision(input)
    const continuity = validateDecisionContinuity({
      activeQuestion: input.activeQuestion,
      decisionStatement: result.decision.statement,
      rationale: result.decision.rationale,
      sourceSnapshotId: input.sourceSnapshotId,
      sourceSnapshotHash: input.sourceSnapshotHash,
    })
    if (!continuity.valid) {
      return NextResponse.json(
        {
          error: 'Generated output lost the named decision or its source lineage.',
          issues: continuity.issues,
          persistence: { persisted: false, reason: 'artifact_continuity_failed' },
        },
        { status: 422 },
      )
    }
    const company = await getCurrentCompanyForUser(user)

    if (!company) {
      return NextResponse.json({
        ...result,
        error: 'Create or select a company before recording a decision.',
        persistence: { persisted: false, reason: 'no_active_company' },
      }, { status: 409 })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access
    const sourceSnapshot = await resolveBoardSourceSnapshot({ company })
    if (
      input.sourceSnapshotId !== sourceSnapshot.id
      || (input.sourceSnapshotHash && input.sourceSnapshotHash !== sourceSnapshot.hash)
    ) {
      return NextResponse.json(
        { error: 'Company context changed. Reopen the session before recording the decision.' },
        { status: 409 },
      )
    }

    try {
      const persistence = await persistDecisionRoomCapture({
        company,
        userId: user.id,
        request: input,
        decision: result.decision,
        followUps: result.followUps,
      })
      if (!persistence.persisted || !persistence.boardSessionId || !persistence.decisionId) {
        return NextResponse.json(
          {
            ...result,
            error: 'Decision persistence could not be confirmed.',
            persistence,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ ...result, persistence })
    } catch (persistenceError) {
      const errorMessage = persistenceErrorMessage(persistenceError)
      return NextResponse.json(
        {
          ...result,
          error: errorMessage,
          persistence: {
            persisted: false,
            error: errorMessage,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture decision' },
      { status: 500 },
    )
  }
}
