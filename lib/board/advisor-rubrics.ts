import type { AdvisorKey } from '@/lib/shadow-board/domain'
import { BOARD_CASE_LIBRARY } from './training-sources'

export { ADVISOR_SOURCE_REFERENCES, BOARD_CASE_LIBRARY, TRAINING_COMPANY_PACKS } from './training-sources'

export type AdvisorAdherenceKey =
  | AdvisorKey

export type AdvisorRubric = {
  key: AdvisorAdherenceKey
  name: string
  roleDefinition: string
  boardQuestion: string
  requiredEvidence: string[]
  requiredOutputs: string[]
  outOfScopeWarnings: string[]
  sourceBasis: string[]
  scoringKeywords: {
    scope: string[]
    evidence: string[]
    boardLevel: string[]
    closure: string[]
  }
}

export type AdvisorReviewLike = {
  advisor_key: string
  advisor_name?: string | null
  perspective?: string | null
  strategic_questions?: unknown
  recommendations?: unknown
  closure_recommendation?: string | null
  risk_score?: number | null
  confidence_score?: number | null
}

export type AdvisorAdherenceScore = {
  advisor_key: string
  advisor_name: string
  total: number
  scope_fidelity: number
  evidence_discipline: number
  board_level_relevance: number
  closure_contribution: number
  missing_requirements: string[]
}

export const ADVISOR_RUBRICS: Record<AdvisorAdherenceKey, AdvisorRubric> = {
  board_brain: {
    key: 'board_brain',
    name: 'Board Brain',
    roleDefinition: 'Orchestrates advisors, preserves governance boundary, synthesizes dissent, names missing evidence, and converts analysis into decisions, minutes, follow-ups, and review triggers.',
    boardQuestion: 'What is the board-level decision, what belongs to management, what risk appetite is implied, and what must be reviewed later?',
    requiredEvidence: ['decision context', 'advisor consensus', 'advisor conflict', 'missing evidence', 'risk appetite', 'review cadence'],
    requiredOutputs: ['single synthesis', 'closure recommendation', 'decision conditions', 'owners', 'follow-ups', 'memory impact'],
    outOfScopeWarnings: ['acting as CEO', 'pretending to be a statutory board member', 'erasing dissent', 'giving generic advice without closure'],
    sourceBasis: ['IBGC board role and advisory transition', 'IBGC minutes and meeting simulation', 'OECD board responsibilities'],
    scoringKeywords: {
      scope: ['orchestrate|orquestra|sintese|synthesis', 'consensus|converge|alinhad', 'conflict|dissent|diverg', 'board-level|questao de board|governanca'],
      evidence: ['missing evidence|lacuna|ausencia', 'risk appetite|apetite de risco', 'advisor|assessor', 'minutes|minuta|ata', 'source|fonte'],
      boardLevel: ['decision|decisao', 'condition|condicao|condicionar', 'owner|responsavel', 'review|revisao|revista', 'follow-up|follow up|acompanhamento', 'tradeoff'],
      closure: ['commit|comprometer|aprovar', 'conditions|condicoes|condicionado', 'defer|adiar', 'reject|rejeitar', 'request more data|pedir dados|solicitar dados', 'escalate|escalar'],
    },
  },
  finance: {
    key: 'finance',
    name: 'Finance Advisor',
    roleDefinition: 'Tests cash, ROI, margins, capital efficiency, runway, debt, working capital, valuation impact, and capital allocation.',
    boardQuestion: 'Can this decision create risk-adjusted value without hiding cash, margin, debt, or concentration risk?',
    requiredEvidence: ['DRE/P&L', 'operating cash flow', 'runway', 'gross margin', 'EBITDA', 'budget vs actual', 'customer concentration', 'payback'],
    requiredOutputs: ['financial gates', 'investment conditions', 'sensitivity scenarios', 'capital allocation tradeoffs', 'missing financial data'],
    outOfScopeWarnings: ['brand-only recommendations', 'execution plans without financial gates', 'growth approval without payback discipline'],
    sourceBasis: ['IBGC financial governance', 'COSO risk appetite', 'PwC audit committee excellence', 'capital-market governance references'],
    scoringKeywords: {
      scope: ['cash|caixa', 'ROI|retorno|payback', 'margin|margem', 'runway|liquidez', 'debt|divida', 'working capital|capital de giro', 'DRE|P&L|OCF|EBITDA'],
      evidence: ['budget|orcamento', 'forecast|previsao', 'variance|variancia|desvio', 'concentration|concentracao', 'liquidity|liquidez', 'covenant|restricao'],
      boardLevel: ['capital allocation|alocacao de capital', 'investment gate|gate de investimento|milestone', 'risk-adjusted|ajustado ao risco', 'approval|aprovacao', 'scenario|cenario'],
      closure: ['financial condition|condicao financeira', 'gate', 'approve with conditions|aprovar com condicoes|commit_with_conditions', 'request data|pedir dados|solicitar dados', 'defer|adiar'],
    },
  },
  operator: {
    key: 'operator',
    name: 'Operator Advisor',
    roleDefinition: 'Turns recommendations into operating cadence, accountability loops, owners, dates, dependencies, leading indicators, and recovery paths.',
    boardQuestion: 'Can the company execute this decision with clear owners, cadence, dependencies, and review signals?',
    requiredEvidence: ['owner map', 'operating cadence', 'dependencies', 'timeline', 'capacity', 'process constraints', 'leading indicators'],
    requiredOutputs: ['workstreams', 'RACI/DRI', 'weekly or monthly cadence', 'dependencies', 'review dates', 'execution risk triggers'],
    outOfScopeWarnings: ['strategy without implementation loop', 'unclear ownership', 'long plans without operating rhythm'],
    sourceBasis: ['IBGC meeting practice', 'IBGC board effectiveness', 'complexity/resilience material'],
    scoringKeywords: {
      scope: ['owner|responsavel', 'cadence|cadencia|ritual', 'process|processo', 'execution|execucao', 'workflow|fluxo', 'accountability|prestacao de contas', 'dependency|dependencia', 'RACI|DRI'],
      evidence: ['timeline|prazo', 'capacity|capacidade', 'leading indicator|indicador', 'review date|data de revisao', 'blocked|bloqueio', 'handoff'],
      boardLevel: ['workstream|frente', 'decision loop|loop de decisao', 'operating rhythm|ritmo operacional|war room', 'escalation|escalacao', 'checkpoint|marco'],
      closure: ['assign|atribuir|nomear', 'schedule|agendar', 'review|revisar', 'trigger|gatilho', 'condition|condicao|commit_with_conditions'],
    },
  },
  growth: {
    key: 'growth',
    name: 'Growth Advisor',
    roleDefinition: 'Tests market expansion, revenue quality, strategic maturity, innovation risk, product-market readiness, and downside if growth is wrong.',
    boardQuestion: 'Is this growth choice strategically fit, commercially attractive, and operationally ready enough to scale?',
    requiredEvidence: ['market size', 'channel quality', 'revenue quality', 'retention', 'unit economics', 'product readiness', 'competitive position'],
    requiredOutputs: ['growth ranking', 'strategic fit', 'readiness gates', 'channel assumptions', 'growth risks', 'stop/scale criteria'],
    outOfScopeWarnings: ['growth for its own sake', 'vanity metrics', 'ignoring cash and operating readiness'],
    sourceBasis: ['IBGC strategic maturity', 'innovation risk', 'long-term strategy cases', 'international strategy board education'],
    scoringKeywords: {
      scope: ['growth|crescimento', 'market|mercado', 'expansion|expansao', 'scale|escala|escalar', 'channel|canal', 'revenue quality|receita de qualidade', 'retention|retencao', 'product-market|produto-mercado'],
      evidence: ['CAC|LTV|unit economics', 'cohort|coorte', 'conversion|conversao', 'readiness|prontidao', 'competition|competicao', 'pricing|preco'],
      boardLevel: ['strategic fit|fit estrategico|tese', 'prioritize|priorizar', 'scale gate|gate de escala', 'stop criteria|criterio de parada', 'downside|risco se errado'],
      closure: ['scale|escalar', 'test|teste|POC', 'pause|pausar', 'gate', 'commit|comprometer'],
    },
  },
  risk: {
    key: 'risk',
    name: 'Risk Advisor',
    roleDefinition: 'Names concentration, compliance, legal, control, stakeholder, data, ESG, and reputation risks, especially inconvenient ones.',
    boardQuestion: 'What risk is visible but not priced, owned, mitigated, or escalated?',
    requiredEvidence: ['risk appetite', 'risk owner', 'controls', 'compliance exposure', 'concentration', 'early-warning indicators', 'escalation path'],
    requiredOutputs: ['risk appetite statement', 'mitigation owner', 'control gap', 'early warning indicators', 'escalation criteria'],
    outOfScopeWarnings: ['fear without mitigation', 'compliance theater', 'approval without controls'],
    sourceBasis: ['IBGC legal responsibility and integrity', 'COSO ERM', 'FRC risk/internal control', 'OECD disclosure and stakeholder governance'],
    scoringKeywords: {
      scope: ['risk|risco', 'compliance|conformidade', 'control|controle', 'concentration|concentracao', 'legal|juridico', 'reputation|reputacional', 'LGPD|dados pessoais', 'ESG|audit'],
      evidence: ['risk appetite|apetite de risco', 'owner|responsavel', 'mitigation|mitigacao', 'early warning|alerta', 'escalation|escalacao', 'policy|politica', 'control gap|lacuna de controle'],
      boardLevel: ['acceptable risk|risco aceitavel', 'unpriced risk|risco nao precificado', 'board oversight|supervisao do board', 'limit|limite', 'guardrail'],
      closure: ['mitigate|mitigar', 'escalate|escalar', 'condition|condicao|commit_with_conditions', 'reject|rejeitar', 'defer|adiar'],
    },
  },
  customer: {
    key: 'customer',
    name: 'Customer Advisor',
    roleDefinition: 'Tests brand, customer trust, retention, market position, stakeholder perception, demand quality, and commercial consequence.',
    boardQuestion: 'Does this decision improve customer trust, customer economics, and market position in a way the company can repeat?',
    requiredEvidence: ['customer segment', 'retention', 'brand salience', 'trust', 'market position', 'stakeholder perception', 'demand quality'],
    requiredOutputs: ['customer consequence', 'brand/trust risk', 'retention question', 'market-position tradeoff', 'customer proof metric'],
    outOfScopeWarnings: ['campaign tips without governance consequence', 'brand adjectives without business behavior', 'views without trust or retention'],
    sourceBasis: ['IBGC communication and stakeholder context', 'Creative OS brand operating-system method', 'strategy/customer cases'],
    scoringKeywords: {
      scope: ['customer|cliente|torcedor', 'brand|marca', 'trust|confianca', 'retention|retencao', 'market|mercado', 'demand|demanda', 'stakeholder|publico', 'salience|saliencia|lembranca'],
      evidence: ['NPS', 'cohort|coorte', 'awareness|reconhecimento', 'perception|percepcao', 'behavior|comportamento', 'segment|segmento|18-32', 'churn'],
      boardLevel: ['market position|posicao de mercado', 'customer economics|economia do cliente', 'reputation|reputacao', 'choice|escolha', 'tradeoff'],
      closure: ['prove|provar', 'measure|medir', 'protect|proteger', 'prioritize|priorizar', 'condition|condicao|commit_with_conditions'],
    },
  },
  talent: {
    key: 'talent',
    name: 'Talent Advisor',
    roleDefinition: 'Tests leadership capacity, succession, incentives, culture, founder bottleneck, key-person risk, hiring, and execution capacity.',
    boardQuestion: 'Can the current organization execute and sustain this decision with the right leadership, incentives, and capacity?',
    requiredEvidence: ['leadership map', 'succession risk', 'key-person risk', 'capacity', 'incentives', 'culture', 'hiring gaps', 'decision behavior'],
    requiredOutputs: ['capability gaps', 'succession questions', 'incentive risks', 'hiring/reallocation needs', 'founder bottleneck', 'people governance conditions'],
    outOfScopeWarnings: ['HR suggestions without governance consequence', 'hiring without capacity logic', 'culture statements without incentives'],
    sourceBasis: ['IBGC people committee and succession', 'IBGC SCARF and decision dynamics', 'board effectiveness and diversity material'],
    scoringKeywords: {
      scope: ['leadership|lideranca', 'talent|talento|pessoas', 'succession|sucessao', 'capacity|capacidade', 'incentive|incentivo', 'culture|cultura', 'hiring|contratar|contratada', 'founder|fundador'],
      evidence: ['key-person|pessoa-chave', 'role|papel', 'span|amplitude', 'capability|capabilidade|competencia', 'compensation|remuneracao', 'decision behavior|comportamento decisorio', 'team|time'],
      boardLevel: ['continuity|continuidade', 'people governance|governanca de pessoas', 'execution capacity|capacidade de execucao', 'succession plan|plano de sucessao', 'bottleneck|gargalo'],
      closure: ['hire|contratar', 'assign|atribuir', 'realign|realocar|realinhar', 'succession|sucessao', 'condition|condicao|commit_with_conditions'],
    },
  },
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeText).join(' ')
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(normalizeText).join(' ')
  return ''
}

function scoreKeywordCoverage(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  const hits = keywords.filter((keyword) => (
    keyword
      .split('|')
      .map((candidate) => candidate.trim().toLowerCase())
      .some((candidate) => candidate && lower.includes(candidate))
  )).length
  return keywords.length ? Math.round((hits / keywords.length) * 100) : 0
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function scoreAdvisorAdherence(review: AdvisorReviewLike): AdvisorAdherenceScore {
  const advisorKey = review.advisor_key as AdvisorAdherenceKey
  const rubric = ADVISOR_RUBRICS[advisorKey]
  const text = [
    review.perspective,
    normalizeText(review.strategic_questions),
    normalizeText(review.recommendations),
    review.closure_recommendation,
  ].filter(Boolean).join(' ')

  if (!rubric) {
    return {
      advisor_key: review.advisor_key,
      advisor_name: review.advisor_name ?? review.advisor_key,
      total: 0,
      scope_fidelity: 0,
      evidence_discipline: 0,
      board_level_relevance: 0,
      closure_contribution: 0,
      missing_requirements: ['No rubric configured for this advisor.'],
    }
  }

  const scope = scoreKeywordCoverage(text, rubric.scoringKeywords.scope)
  const evidence = scoreKeywordCoverage(text, rubric.scoringKeywords.evidence)
  const boardLevel = scoreKeywordCoverage(text, rubric.scoringKeywords.boardLevel)
  const closure = scoreKeywordCoverage(text, rubric.scoringKeywords.closure)
  const missing = [
    scope < 35 ? 'Weak scope fidelity for advisor role.' : null,
    evidence < 25 ? 'Missing or weak evidence requirements.' : null,
    boardLevel < 25 ? 'Not enough board-level decision language.' : null,
    closure < 25 ? 'No clear contribution to closure.' : null,
  ].filter(Boolean) as string[]

  const total = clampScore(scope * 0.3 + evidence * 0.25 + boardLevel * 0.25 + closure * 0.2)

  return {
    advisor_key: review.advisor_key,
    advisor_name: review.advisor_name ?? rubric.name,
    total,
    scope_fidelity: clampScore(scope),
    evidence_discipline: clampScore(evidence),
    board_level_relevance: clampScore(boardLevel),
    closure_contribution: clampScore(closure),
    missing_requirements: missing,
  }
}

export function advisorRubricsForPrompt() {
  return Object.values(ADVISOR_RUBRICS)
    .map((rubric) => [
      `${rubric.name} (${rubric.key})`,
      `Role: ${rubric.roleDefinition}`,
      `Board question: ${rubric.boardQuestion}`,
      `Required evidence: ${rubric.requiredEvidence.join('; ')}`,
      `Required outputs: ${rubric.requiredOutputs.join('; ')}`,
      `Avoid: ${rubric.outOfScopeWarnings.join('; ')}`,
    ].join('\n'))
    .join('\n\n')
}

export function caseLibraryForPrompt() {
  return BOARD_CASE_LIBRARY
    .map((caseItem) => `${caseItem.title}: ${caseItem.boardProblem} Stress advisors: ${caseItem.advisorStress.join(', ')}.`)
    .join('\n')
}
