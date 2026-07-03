import { getDecisionRoomAdapter } from './adapter'
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

export async function getDecisionRoomReadout(): Promise<DecisionRoomReadout> {
  return getDecisionRoomAdapter().readout()
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

export async function createExecutionOutputs(input?: { queue?: string[] }): Promise<ExecutionOutput[]> {
  return getDecisionRoomAdapter().createOutputs(input)
}
