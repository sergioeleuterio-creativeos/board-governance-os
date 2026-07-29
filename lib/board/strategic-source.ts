import { createHash } from 'node:crypto'

export const STRATEGIC_SOURCE_SCHEMA_VERSION = '1.0' as const

export type StrategicSourceContribution = {
  id: string
  phase: string
  contributionType: string
  body: string
  participantType: 'human' | 'synthetic'
  displayName: string
  roleLabel: string
  sourceReferences: string[]
}

export type StrategicSourceInput = {
  company: { id: string; name: string }
  plan: {
    id: string
    title: string
    planType: string
    period: string | null
    businessFront: string | null
    version: number
    diagnosis: string | null
    priorities: unknown[]
    kpis: unknown[]
    workstreams: unknown[]
    risks: unknown[]
    assumptions: unknown[]
    normalizedContent: Record<string, unknown>
  } | null
  boardPack: {
    id: string
    version: number
    contentHash: string
    executiveSummary: string | null
    strategicQuestions: unknown[]
    risks: unknown[]
    decisionCandidates: unknown[]
  }
  boardSession: {
    id: string
    activeQuestion: string
    sourceSnapshotId: string | null
    sourceSnapshotHash: string | null
  }
  contributions: StrategicSourceContribution[]
  minutes: {
    id: string
    minutes: string | null
    finalRecommendation: string | null
    conflicts: unknown[]
  } | null
  decisions: Array<{
    id: string
    title: string
    decision: string | null
    rationale: string | null
    conditions: unknown[]
    owner: string | null
    reviewDate: string | null
  }>
  commitments: Array<{
    id: string
    title: string
    action: string | null
    owner: string | null
    dueDate: string | null
    status: string
  }>
  createdAt: string
}

export type StrategicSourceContent = {
  schemaVersion: typeof STRATEGIC_SOURCE_SCHEMA_VERSION
  company: StrategicSourceInput['company']
  decisionInQuestion: string
  selectedPlan: StrategicSourceInput['plan']
  intakeDiagnosis: string | null
  frozenContext: {
    boardPackId: string
    boardPackVersion: number
    boardPackHash: string
    sourceSnapshotId: string | null
    sourceSnapshotHash: string | null
    executiveSummary: string | null
  }
  advisorViewpoints: Array<{
    contributionId: string
    advisor: string
    role: string
    phase: string
    pointOfView: string
  }>
  founderAnswers: Array<{
    contributionId: string
    founder: string
    phase: string
    answer: string
  }>
  chairSynthesis: string | null
  approvedDirection: {
    decisionId: string | null
    title: string
    decision: string | null
    rationale: string | null
    conditions: unknown[]
    owner: string | null
    reviewDate: string | null
  } | null
  unresolvedQuestions: string[]
  kpis: unknown[]
  risks: unknown[]
  assumptions: unknown[]
  commitments: StrategicSourceInput['commitments']
  meetingMinutes: string | null
  sourceReferences: string[]
  generatedAt: string
}

export type StrategicSourceDocument = {
  title: string
  content: StrategicSourceContent
  markdown: string
  sourceReferences: string[]
  immutableHash: string
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim()
    : null
}

function readable(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value || typeof value !== 'object') return ''
  const item = record(value)
  const parts = [
    item.title,
    item.name,
    item.kpi,
    item.metric,
    item.priority,
    item.risk,
    item.question,
    item.description,
    item.recommendation,
    item.target,
    item.owner,
  ].map(text).filter(Boolean)
  return [...new Set(parts)].join(' — ')
}

function readableList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(readable).filter(Boolean)
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableValue(item)]),
  )
}

function immutableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function markdownList(items: unknown[], empty = 'Não registrado.') {
  const lines = readableList(items)
  return lines.length ? lines.map(item => `- ${item}`).join('\n') : empty
}

function decisionsMarkdown(direction: StrategicSourceContent['approvedDirection']) {
  if (!direction) return 'Nenhuma decisão final registrada.'
  return [
    direction.title,
    direction.decision,
    direction.rationale ? `Racional: ${direction.rationale}` : null,
    direction.owner ? `Responsável: ${direction.owner}` : null,
    direction.reviewDate ? `Revisão: ${direction.reviewDate}` : null,
    readableList(direction.conditions).length
      ? `Condições:\n${readableList(direction.conditions).map(item => `- ${item}`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n\n')
}

export function buildStrategicSourceDocument(input: StrategicSourceInput): StrategicSourceDocument {
  const advisorViewpoints = input.contributions
    .filter(item => (
      item.participantType === 'synthetic'
      && ['independent_analysis', 'final_positions'].includes(item.phase)
    ))
    .map(item => ({
      contributionId: item.id,
      advisor: item.displayName,
      role: item.roleLabel,
      phase: item.phase,
      pointOfView: item.body,
    }))

  const founderAnswers = input.contributions
    .filter(item => (
      item.participantType === 'human'
      && ['pack_review', 'founder_decision'].includes(item.phase)
    ))
    .map(item => ({
      contributionId: item.id,
      founder: item.displayName,
      phase: item.phase,
      answer: item.body,
    }))

  const chairSynthesis = input.contributions
    .filter(item => item.contributionType === 'chair_synthesis')
    .at(-1)?.body
    ?? input.minutes?.finalRecommendation
    ?? null

  const selectedDecision = input.decisions.at(-1) ?? null
  const founderDecision = input.contributions
    .filter(item => item.contributionType === 'decision')
    .at(-1)

  const approvedDirection = selectedDecision
    ? {
      decisionId: selectedDecision.id,
      title: selectedDecision.title,
      decision: selectedDecision.decision,
      rationale: selectedDecision.rationale,
      conditions: selectedDecision.conditions,
      owner: selectedDecision.owner,
      reviewDate: selectedDecision.reviewDate,
    }
    : founderDecision
      ? {
        decisionId: null,
        title: 'Decisão registrada na reunião',
        decision: founderDecision.body,
        rationale: null,
        conditions: [],
        owner: null,
        reviewDate: null,
      }
      : null

  const unresolvedQuestions = unique([
    ...readableList(input.boardPack.strategicQuestions),
    ...input.contributions
      .filter(item => item.contributionType === 'challenge')
      .map(item => text(item.body)),
  ]).slice(0, 16)

  const sourceReferences = unique([
    `company:${input.company.id}`,
    input.plan ? `business_plan:${input.plan.id}:v${input.plan.version}` : null,
    `board_pack:${input.boardPack.id}:v${input.boardPack.version}`,
    `board_session:${input.boardSession.id}`,
    input.minutes ? `meeting_minutes:${input.minutes.id}` : null,
    ...input.decisions.map(item => `decision:${item.id}`),
    ...input.commitments.map(item => `follow_up:${item.id}`),
    ...input.contributions.flatMap(item => [
      `board_contribution:${item.id}`,
      ...item.sourceReferences,
    ]),
  ])

  const content: StrategicSourceContent = {
    schemaVersion: STRATEGIC_SOURCE_SCHEMA_VERSION,
    company: input.company,
    decisionInQuestion: input.boardSession.activeQuestion,
    selectedPlan: input.plan,
    intakeDiagnosis: input.plan?.diagnosis ?? null,
    frozenContext: {
      boardPackId: input.boardPack.id,
      boardPackVersion: input.boardPack.version,
      boardPackHash: input.boardPack.contentHash,
      sourceSnapshotId: input.boardSession.sourceSnapshotId,
      sourceSnapshotHash: input.boardSession.sourceSnapshotHash,
      executiveSummary: input.boardPack.executiveSummary,
    },
    advisorViewpoints,
    founderAnswers,
    chairSynthesis,
    approvedDirection,
    unresolvedQuestions,
    kpis: input.plan?.kpis ?? [],
    risks: [
      ...(input.plan?.risks ?? []),
      ...input.boardPack.risks,
    ],
    assumptions: input.plan?.assumptions ?? [],
    commitments: input.commitments,
    meetingMinutes: input.minutes?.minutes ?? null,
    sourceReferences,
    generatedAt: input.createdAt,
  }

  const title = `Fonte estratégica — ${input.company.name} — Board Pack v${input.boardPack.version}`
  const markdown = [
    `# ${title}`,
    '',
    `Documento v1 · Schema ${STRATEGIC_SOURCE_SCHEMA_VERSION} · Gerado em ${input.createdAt}`,
    '',
    '## A decisão',
    '',
    input.boardSession.activeQuestion,
    '',
    '## Contexto travado',
    '',
    input.boardPack.executiveSummary || 'Sem resumo executivo.',
    '',
    `- Board Pack: v${input.boardPack.version} · ${input.boardPack.contentHash}`,
    `- Source snapshot: ${input.boardSession.sourceSnapshotId ?? 'não disponível'} · ${input.boardSession.sourceSnapshotHash ?? 'não disponível'}`,
    input.plan ? `- Plano: ${input.plan.title} · v${input.plan.version}` : '- Plano: não associado',
    '',
    '## Diagnóstico de entrada',
    '',
    input.plan?.diagnosis || 'Não registrado.',
    '',
    '## O que o board viu',
    '',
    advisorViewpoints.length
      ? advisorViewpoints.map(item => `### ${item.advisor} — ${item.role}\n\n${item.pointOfView}`).join('\n\n')
      : 'Nenhuma posição de advisor registrada.',
    '',
    '## O que o founder esclareceu',
    '',
    founderAnswers.length
      ? founderAnswers.map(item => `- **${item.founder}:** ${item.answer}`).join('\n')
      : 'Nenhuma resposta do founder registrada.',
    '',
    '## Síntese do Chair',
    '',
    chairSynthesis || 'Não registrada.',
    '',
    '## Direção aprovada',
    '',
    decisionsMarkdown(approvedDirection),
    '',
    '## KPIs que governam a execução',
    '',
    markdownList(content.kpis),
    '',
    '## Riscos e premissas',
    '',
    markdownList(content.risks),
    '',
    '### Premissas',
    '',
    markdownList(content.assumptions),
    '',
    '## Questões ainda abertas',
    '',
    unresolvedQuestions.length ? unresolvedQuestions.map(item => `- ${item}`).join('\n') : 'Nenhuma.',
    '',
    '## Compromissos',
    '',
    input.commitments.length
      ? input.commitments.map(item => (
        `- **${item.title}**${item.owner ? ` · ${item.owner}` : ''}${item.dueDate ? ` · ${item.dueDate}` : ''}${item.action ? ` — ${item.action}` : ''}`
      )).join('\n')
      : 'Nenhum compromisso registrado.',
    '',
    '## Proveniência',
    '',
    sourceReferences.map(item => `- ${item}`).join('\n'),
  ].join('\n')

  return {
    title,
    content,
    markdown,
    sourceReferences,
    immutableHash: immutableHash({
      schemaVersion: STRATEGIC_SOURCE_SCHEMA_VERSION,
      content,
      markdown,
      sourceReferences,
    }),
  }
}
