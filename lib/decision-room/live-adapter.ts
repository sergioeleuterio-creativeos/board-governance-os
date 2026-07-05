import 'server-only'

import { callJSONAI } from '@/lib/board/model-router'
import { buildGenericDecisionRoomPack } from './generic-data'
import type {
  AgentCode,
  BoardTurn,
  DecisionCaptureRequest,
  DecisionRecord,
  DecisionRoomReadout,
  ExecutionOutput,
  FollowUp,
  InterventionRequest,
  TurnRequest,
} from './types'

type LiveTurnOutput = {
  code?: string
  text?: string
  tag?: string
  synth?: {
    agreements?: string[]
    disagreements?: string[]
    risks?: string[]
  }
}

type LiveDecisionOutput = {
  decision?: Partial<DecisionRecord>
  followUps?: Array<Partial<FollowUp>>
  queue?: string[]
}

const SYSTEM = `Você é o Board OS Decision Room.
Escreva todos os textos visíveis ao usuário em pt-BR natural, com acentuação correta.
Use apenas o contexto recebido. Não invente fatos, números, nomes de cliente ou evidências.
Quando faltarem dados, marque a recomendação como condicional e peça o dado específico.
Responda somente JSON válido.`

function compactTurnLog(log: BoardTurn[] | undefined) {
  return (log ?? []).slice(-12).map(turn => ({
    code: turn.code,
    tag: turn.tag,
    text: turn.text,
    synth: turn.synth,
  }))
}

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 6) : []
}

function findAgentCode(code: string | undefined, readout: DecisionRoomReadout, fallback: BoardTurn['code']): BoardTurn['code'] {
  if (!code) return fallback
  const valid = new Set<string>([...readout.boardAgents.map(agent => agent.code), ...readout.studioAgents.map(agent => agent.code)])
  return valid.has(code) ? code as BoardTurn['code'] : fallback
}

function sanitizeTurn(output: LiveTurnOutput, readout: DecisionRoomReadout, fallback: BoardTurn): BoardTurn {
  return {
    code: findAgentCode(output.code, readout, fallback.code),
    tag: output.tag?.trim().slice(0, 34).toUpperCase() || fallback.tag,
    text: output.text?.trim() || fallback.text,
    studio: fallback.studio || output.code === 'RE',
    synth: {
      agreements: textArray(output.synth?.agreements).length ? textArray(output.synth?.agreements) : fallback.synth?.agreements,
      disagreements: textArray(output.synth?.disagreements).length ? textArray(output.synth?.disagreements) : fallback.synth?.disagreements,
      risks: textArray(output.synth?.risks).length ? textArray(output.synth?.risks) : fallback.synth?.risks,
    },
  }
}

function selectedBoardAgents(readout: DecisionRoomReadout, selectedAgents: AgentCode[] | undefined) {
  const selected = new Set(selectedAgents?.length ? selectedAgents : ['BB'])
  const filtered = readout.boardAgents.filter(agent => selected.has(agent.code))
  return filtered.length ? filtered : readout.boardAgents
}

function selectedTranscript(transcript: BoardTurn[], selectedAgents: AgentCode[] | undefined) {
  const selected = new Set(selectedAgents?.length ? selectedAgents : ['BB'])
  const filtered = transcript.filter(turn => turn.studio || selected.has(turn.code as AgentCode))
  return filtered.length ? filtered : transcript
}

function decisionFallbackQueue(input: DecisionCaptureRequest, fallbackOutputs: ExecutionOutput[]) {
  if (input.state !== 'approved') return input.queue ?? []
  if (input.sessionKind === 'advisory') {
    return Array.from(new Set([
      ...(input.queue ?? []),
      'Resumo executivo consultivo',
      fallbackOutputs.find(output => output.title.toLowerCase().includes('plano consultivo'))?.title ?? 'Plano consultivo',
      'Workstreams e KPIs',
    ]))
  }
  return Array.from(new Set([
    ...(input.queue ?? []),
    fallbackOutputs.find(output => output.type === 'memo')?.title ?? 'Memo da decisão',
    fallbackOutputs.find(output => output.type === 'plan')?.title ?? 'Plano de validação em 30 dias',
  ]))
}

function sanitizeDecision(
  output: LiveDecisionOutput,
  fallbackDecision: DecisionRecord,
  fallbackFollowUps: FollowUp[],
  fallbackQueue: string[],
) {
  const decision = output.decision ?? {}
  const followUps = (output.followUps ?? [])
    .map((item, index): FollowUp => ({
      title: item.title?.trim() || fallbackFollowUps[index]?.title || 'Follow-up da decisão',
      owner: item.owner?.trim() || fallbackFollowUps[index]?.owner || 'Founder + Board Brain',
      due: /^\d{4}-\d{2}-\d{2}$/.test(item.due ?? '') ? item.due! : fallbackFollowUps[index]?.due || fallbackDecision.reviewDate,
      status: item.status === 'Em andamento' || item.status === 'Bloqueado' || item.status === 'Concluído' ? item.status : 'Aberto',
      dependency: item.dependency?.trim() || fallbackFollowUps[index]?.dependency || 'Evidências mínimas',
      escalation: item.escalation?.trim() || fallbackFollowUps[index]?.escalation || 'Escalar se a decisão avançar sem dono, prazo ou evidência.',
    }))
    .slice(0, 6)

  return {
    decision: {
      id: fallbackDecision.id,
      statement: decision.statement?.trim() || fallbackDecision.statement,
      rationale: decision.rationale?.trim() || fallbackDecision.rationale,
      rejectedOptions: textArray(decision.rejectedOptions).length ? textArray(decision.rejectedOptions) : fallbackDecision.rejectedOptions,
      confidence: typeof decision.confidence === 'number'
        ? Math.max(0, Math.min(100, Math.round(decision.confidence)))
        : fallbackDecision.confidence,
      owner: decision.owner?.trim() || fallbackDecision.owner,
      conditions: textArray(decision.conditions).length ? textArray(decision.conditions) : fallbackDecision.conditions,
      reviewDate: /^\d{4}-\d{2}-\d{2}$/.test(decision.reviewDate ?? '') ? decision.reviewDate! : fallbackDecision.reviewDate,
      linked: textArray(decision.linked).length ? textArray(decision.linked) : fallbackDecision.linked,
    },
    followUps: followUps.length ? followUps : fallbackFollowUps,
    queue: textArray(output.queue).length ? Array.from(new Set([...fallbackQueue, ...textArray(output.queue)])) : fallbackQueue,
  }
}

export const liveDecisionRoomAdapter = {
  async readout() {
    const pack = await buildGenericDecisionRoomPack()
    return { ...pack.readout, mode: 'live' as const }
  },

  async nextTurn(input: TurnRequest) {
    const pack = await buildGenericDecisionRoomPack()
    const isAdvisory = input.sessionId === 'problem' || input.sessionId === 'reset' || input.sessionId === 'campaign'
    const baseTranscript = pack.advisoryTranscripts[input.sessionId] ?? pack.transcript
    const transcript = selectedTranscript(baseTranscript, input.selectedAgents)
    const fallback = transcript[input.index] ?? null
    if (!fallback) return null

    const agent = pack.readout.boardAgents.find(item => item.code === fallback.code)
    const aiResult = await callJSONAI<LiveTurnOutput>({
      purpose: 'advisor_review',
      temperature: 0.35,
      maxTokens: 1400,
      system: SYSTEM,
      prompt: JSON.stringify({
        task: isAdvisory
          ? 'Generate the next consulting advisor turn. The user needs diagnosis, advice, plan, workstreams and KPIs before any future decision is suggested.'
          : 'Generate the next advisor turn for a live board decision room.',
        sessionId: input.sessionId,
        sessionKind: isAdvisory ? 'advisory' : 'board',
        turnIndex: input.index,
        advisor: agent,
        selectedAdvisors: selectedBoardAgents(pack.readout, input.selectedAgents),
        diagnosis: pack.readout.diagnosis,
        boardBrief: pack.readout.boardBrief,
        expectedShape: {
          code: fallback.code,
          tag: 'short uppercase pt-BR tag',
          text: 'one concise but substantive advisor turn in pt-BR',
          synth: {
            agreements: ['optional agreement'],
            disagreements: ['optional disagreement'],
            risks: ['optional risk'],
          },
        },
      }),
      fallback: () => fallback,
    })

    return sanitizeTurn(aiResult.output, pack.readout, fallback)
  },

  async intervention(input: InterventionRequest) {
    const pack = await buildGenericDecisionRoomPack()
    const fallback = pack.cannedTurns[input.kind]
    const aiResult = await callJSONAI<LiveTurnOutput>({
      purpose: input.kind === 'challenge' ? 'agent_challenge' : 'advisor_review',
      temperature: 0.35,
      maxTokens: 1400,
      system: SYSTEM,
      prompt: JSON.stringify({
        task: 'Generate a live room intervention grounded in the current decision-room log.',
        interventionKind: input.kind,
        diagnosis: pack.readout.diagnosis,
        boardAgents: selectedBoardAgents(pack.readout, input.selectedAgents),
        recentLog: compactTurnLog(input.log),
        expectedShape: {
          code: input.kind === 'evidence' ? 'RE' : 'CAT',
          tag: 'short uppercase pt-BR tag',
          text: 'intervention in pt-BR',
          synth: {
            agreements: ['optional agreement'],
            disagreements: ['optional disagreement'],
            risks: ['optional risk'],
          },
        },
      }),
      fallback: () => fallback,
    })

    return sanitizeTurn(aiResult.output, pack.readout, fallback)
  },

  async captureDecision(input: DecisionCaptureRequest) {
    const pack = await buildGenericDecisionRoomPack()
    const fallbackDecision = pack.decisions[0]
    const fallbackQueue = decisionFallbackQueue(input, pack.outputs)

    const aiResult = await callJSONAI<LiveDecisionOutput>({
      purpose: 'final_decision',
      temperature: 0.2,
      maxTokens: 1800,
      system: SYSTEM,
      prompt: JSON.stringify({
        task: input.sessionKind === 'advisory'
          ? 'Capture the consulting plan from a live advisory session. This is a diagnostic plan with suggested future decisions, not an approved board decision.'
          : 'Capture the decision from a live decision-room session.',
        state: input.state,
        sessionId: input.sessionId,
        activeQuestion: input.activeQuestion,
        sessionKind: input.sessionKind,
        selectedAdvisors: selectedBoardAgents(pack.readout, input.selectedAgents),
        requestedData: input.requestedData,
        bypassedData: input.bypassedData,
        outputQueue: input.queue,
        diagnosis: pack.readout.diagnosis,
        recentLog: compactTurnLog(input.log),
        expectedShape: {
          decision: {
            statement: input.sessionKind === 'advisory' ? 'consulting plan statement in pt-BR' : 'decision statement in pt-BR',
            rationale: input.sessionKind === 'advisory' ? 'diagnostic and recommendation grounded in the room log' : 'rationale grounded in the room log',
            rejectedOptions: input.sessionKind === 'advisory' ? ['paths not recommended yet or questions still open'] : ['options not chosen'],
            confidence: 0,
            owner: 'owner label',
            conditions: ['conditions and accepted gaps'],
            reviewDate: 'YYYY-MM-DD',
            linked: ['source labels'],
          },
          followUps: [
            { title: 'follow-up', owner: 'owner', due: 'YYYY-MM-DD', status: 'Aberto', dependency: 'dependency', escalation: 'escalation trigger' },
          ],
          queue: ['artifact names'],
        },
      }),
      fallback: () => ({
        decision: fallbackDecision,
        followUps: pack.followUps,
        queue: fallbackQueue,
      }),
    })

    return sanitizeDecision(aiResult.output, fallbackDecision, pack.followUps, fallbackQueue)
  },

  async createOutputs(input?: { queue?: string[] }) {
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
