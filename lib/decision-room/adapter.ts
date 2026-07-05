import { buildGenericDecisionRoomPack } from './generic-data'
import { liveDecisionRoomAdapter } from './live-adapter'
import type {
  AgentCode,
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

const genericAdapter: DecisionRoomAdapter = {
  async readout() {
    return (await buildGenericDecisionRoomPack()).readout
  },
  async nextTurn(input) {
    const pack = await buildGenericDecisionRoomPack()
    const baseTranscript = pack.advisoryTranscripts[input.sessionId] ?? pack.transcript
    const transcript = selectedTranscript(baseTranscript, input.selectedAgents)
    return transcript[input.index] ?? null
  },
  async intervention(input) {
    const pack = await buildGenericDecisionRoomPack()
    return pack.cannedTurns[input.kind]
  },
  async captureDecision(input) {
    const pack = await buildGenericDecisionRoomPack()
    const approvedQueue = input.sessionKind === 'advisory'
      ? ['Resumo executivo consultivo', 'Plano consultivo', 'Workstreams e KPIs']
      : ['Memo da decisão', 'Plano de validação em 30 dias']
    const queue = input.state === 'approved'
      ? Array.from(new Set([...(input.queue ?? []), ...approvedQueue]))
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
      if ([...normalized].some(item => item.includes('plano') || item.includes('workstreams')) && output.type === 'plan') return true
      if (normalized.has('narrativa comercial') && output.type === 'sales') return true
      if (normalized.has('ata da sala') && output.type === 'minutes') return true
      return normalized.size === 0
    })
  },
}

function selectedTranscript(transcript: BoardTurn[], selectedAgents: AgentCode[] | undefined) {
  const selected = new Set(selectedAgents?.length ? selectedAgents : ['BB'])
  const filtered = transcript.filter(turn => turn.studio || selected.has(turn.code as AgentCode))
  return filtered.length ? filtered : transcript
}

export function getDecisionRoomAdapter(): DecisionRoomAdapter {
  const mode = process.env.DECISION_ROOM_ADAPTER ?? 'mock'
  if (mode === 'live') return liveDecisionRoomAdapter
  return genericAdapter
}
