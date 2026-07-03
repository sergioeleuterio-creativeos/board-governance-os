import { getDecisionRoomAdapter } from './adapter'
import { enrichDecisionRoomReadout } from '@/lib/creative-os/adapter'
import type {
  BoardBrief,
  BoardTurn,
  DecisionCaptureRequest,
  DecisionRoomReadout,
  ExecutionOutput,
  InterventionRequest,
  StrategyDiagnosis,
  TurnRequest,
} from './types'
import type { CurrentCompany } from '@/lib/shadow-board/current-company-server'

export async function getDecisionRoomReadout(context?: { company?: CurrentCompany | null }): Promise<DecisionRoomReadout> {
  const readout = await getDecisionRoomAdapter().readout()
  return enrichDecisionRoomReadout(readout, context)
}

export async function runStrategyDiagnosis(): Promise<StrategyDiagnosis> {
  return (await getDecisionRoomReadout()).diagnosis
}

export async function createBoardBrief(): Promise<BoardBrief> {
  return (await getDecisionRoomReadout()).boardBrief
}

export async function nextBoardTurn(input: TurnRequest): Promise<BoardTurn | null> {
  return getDecisionRoomAdapter().nextTurn(input)
}

export async function requestRoomIntervention(input: InterventionRequest): Promise<BoardTurn> {
  return getDecisionRoomAdapter().intervention(input)
}

export async function captureRoomDecision(input: DecisionCaptureRequest) {
  return getDecisionRoomAdapter().captureDecision(input)
}

export async function createExecutionOutputs(input?: { queue?: string[]; company?: CurrentCompany | null }): Promise<ExecutionOutput[]> {
  const adapter = getDecisionRoomAdapter()
  const [readout, outputs] = await Promise.all([
    adapter.readout(),
    adapter.createOutputs(input),
  ])
  const enriched = await enrichDecisionRoomReadout({ ...readout, outputs }, { company: input?.company })
  return enriched.outputs
}
