import {
  lanceCannedTurns,
  lanceDecisionRoomReadout,
  lanceDecisions,
  lanceFollowUps,
  lanceOutputs,
  lanceTranscript,
} from './lance-data'
import { buildGenericDecisionRoomPack } from './generic-data'
import { liveDecisionRoomAdapter } from './live-adapter'
import type {
  BoardTurn,
  DecisionCaptureRequest,
  DecisionRecord,
  DecisionRoomReadout,
  ExecutionOutput,
  InterventionRequest,
  TurnRequest,
  FollowUp,
} from './types'

export interface DecisionRoomAdapter {
  readout(): Promise<DecisionRoomReadout>
  nextTurn(input: TurnRequest): Promise<BoardTurn | null>
  intervention(input: InterventionRequest): Promise<BoardTurn>
  captureDecision(input: DecisionCaptureRequest): Promise<{
    decision: DecisionRecord
    followUps: FollowUp[]
    queue: string[]
  }>
  createOutputs(input?: { queue?: string[] }): Promise<ExecutionOutput[]>
}

const lanceSeedAdapter: DecisionRoomAdapter = {
  async readout() {
    return lanceDecisionRoomReadout
  },
  async nextTurn(input) {
    return lanceTranscript[input.index] ?? null
  },
  async intervention(input) {
    return lanceCannedTurns[input.kind]
  },
  async captureDecision(input) {
    const queue = input.state === 'approved'
      ? Array.from(new Set([...(input.queue ?? []), 'Memo da decisão LANCE!', 'Plano de validação em 30 dias']))
      : input.queue ?? []
    return {
      decision: lanceDecisions[0],
      followUps: lanceFollowUps,
      queue,
    }
  },
  async createOutputs(input) {
    if (!input?.queue?.length) return lanceOutputs
    const normalized = new Set(input.queue.map(item => item.toLowerCase()))
    return lanceOutputs.filter(output => {
      if ((normalized.has('memo do conselho') || normalized.has('memo da decisão lance!')) && output.type === 'memo') return true
      if ((normalized.has('brief de estratégia') || normalized.has('brief de estrategia')) && output.type === 'strategy') return true
      if ((normalized.has('plano operacional') || normalized.has('plano de validação em 30 dias')) && output.type === 'plan') return true
      return normalized.size === 0
    })
  },
}

const genericAdapter: DecisionRoomAdapter = {
  async readout() {
    return (await buildGenericDecisionRoomPack()).readout
  },
  async nextTurn(input) {
    const pack = await buildGenericDecisionRoomPack()
    return pack.transcript[input.index] ?? null
  },
  async intervention(input) {
    const pack = await buildGenericDecisionRoomPack()
    return pack.cannedTurns[input.kind]
  },
  async captureDecision(input) {
    const pack = await buildGenericDecisionRoomPack()
    const queue = input.state === 'approved'
      ? Array.from(new Set([...(input.queue ?? []), 'Memo da decisão', 'Plano de validação em 30 dias']))
      : input.queue ?? []
    return {
      decision: pack.decisions[0],
      followUps: pack.followUps,
      queue,
    }
  },
  async createOutputs(input) {
    const pack = await buildGenericDecisionRoomPack()
    if (!input?.queue?.length) return pack.outputs
    const normalized = new Set(input.queue.map(item => item.toLowerCase()))
    return pack.outputs.filter(output => {
      if ((normalized.has('memo do conselho') || normalized.has('memo da decisão')) && output.type === 'memo') return true
      if ((normalized.has('brief de estratégia') || normalized.has('brief de estrategia')) && output.type === 'strategy') return true
      if ((normalized.has('plano operacional') || normalized.has('plano de validação em 30 dias')) && output.type === 'plan') return true
      if (normalized.has('narrativa comercial') && output.type === 'sales') return true
      if (normalized.has('ata da sala') && output.type === 'minutes') return true
      return normalized.size === 0
    })
  },
}

export function getDecisionRoomAdapter(): DecisionRoomAdapter {
  const mode = process.env.DECISION_ROOM_ADAPTER ?? 'mock'
  const seed = process.env.DECISION_ROOM_SEED ?? ''
  if (seed === 'lance') {
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error('DECISION_ROOM_SEED="lance" is disabled in production.')
    }
    return lanceSeedAdapter
  }
  if (mode === 'live') return liveDecisionRoomAdapter
  return genericAdapter
}
