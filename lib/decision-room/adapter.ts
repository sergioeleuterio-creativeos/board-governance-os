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

function assertSourceSnapshot(readout: DecisionRoomReadout, sourceSnapshotId: string | undefined) {
  if (
    sourceSnapshotId
    && readout.sourceSnapshot?.id
    && sourceSnapshotId !== readout.sourceSnapshot.id
  ) {
    throw new Error('O contexto da empresa mudou. Reabra a sessão para confirmar a nova versão das fontes.')
  }
}

const genericAdapter: DecisionRoomAdapter = {
  async readout() {
    return (await buildGenericDecisionRoomPack()).readout
  },
  async nextTurn(input) {
    const pack = await buildGenericDecisionRoomPack()
    assertSourceSnapshot(pack.readout, input.sourceSnapshotId)
    const baseTranscript = pack.advisoryTranscripts[input.sessionId] ?? pack.transcript
    const transcript = selectedTranscript(baseTranscript, input.selectedAgents)
    return transcript[input.index] ?? null
  },
  async intervention(input) {
    const pack = await buildGenericDecisionRoomPack()
    assertSourceSnapshot(pack.readout, input.sourceSnapshotId)
    return pack.cannedTurns[input.kind]
  },
  async captureDecision(input) {
    const pack = await buildGenericDecisionRoomPack()
    assertSourceSnapshot(pack.readout, input.sourceSnapshotId)
    const approvedQueue = input.sessionKind === 'advisory'
      ? ['Resumo executivo consultivo', 'Plano consultivo', 'Workstreams e KPIs']
      : ['Memo da decisão', 'Plano de validação em 30 dias']
    const queue = input.state === 'approved'
      ? Array.from(new Set([...(input.queue ?? []), ...approvedQueue]))
      : input.queue ?? []
    const baseDecision = pack.decisions[0]
    const namedQuestion = input.activeQuestion?.trim()
    const decision = namedQuestion
      ? {
        ...baseDecision,
        statement: input.sessionKind === 'advisory'
          ? `Plano consultivo para responder: ${namedQuestion}`
          : `${input.state === 'approved' ? 'Decisão aprovada' : 'Decisão adiada'}: ${namedQuestion}`,
        rationale: `A sala avaliou a pergunta “${namedQuestion}” contra as fontes congeladas, as lacunas declaradas e as condições registradas na sessão.`,
        linked: pack.readout.sourceSnapshot?.sourceRefs.slice(0, 8) ?? baseDecision.linked,
      }
      : baseDecision
    return {
      decision,
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
