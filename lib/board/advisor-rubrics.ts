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
    roleDefinition: 'Orquestra advisors, preserva o limite de governanca, sintetiza dissensos, nomeia evidencias ausentes e converte analise em decisoes, ata, follow-ups e gatilhos de revisao.',
    boardQuestion: 'Qual e a decisao de nivel board, o que pertence a gestao, qual apetite de risco esta implicito e o que precisa voltar para revisao?',
    requiredEvidence: ['contexto da decisao', 'consenso dos advisors', 'conflito entre advisors', 'evidencias ausentes', 'apetite de risco', 'cadencia de revisao'],
    requiredOutputs: ['sintese unica', 'recomendacao de fechamento', 'condicoes da decisao', 'responsaveis', 'follow-ups', 'impacto na memoria'],
    outOfScopeWarnings: ['agir como CEO', 'fingir ser conselheiro estatutario', 'apagar dissenso', 'dar conselho generico sem fechamento'],
    sourceBasis: ['papel do board e transicao para advisory board segundo IBGC', 'atas e simulacao de reuniao IBGC', 'responsabilidades do board segundo OCDE'],
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
    roleDefinition: 'Testa caixa, ROI, margens, eficiencia de capital, runway, divida, capital de giro, impacto em valuation e alocacao de capital.',
    boardQuestion: 'Esta decisao cria valor ajustado ao risco sem esconder caixa, margem, divida ou risco de concentracao?',
    requiredEvidence: ['DRE/P&L', 'fluxo de caixa operacional', 'runway', 'margem bruta', 'EBITDA', 'orcado vs realizado', 'concentracao de clientes', 'payback'],
    requiredOutputs: ['gates financeiros', 'condicoes de investimento', 'cenarios de sensibilidade', 'tradeoffs de alocacao de capital', 'dados financeiros ausentes'],
    outOfScopeWarnings: ['recomendacoes apenas de marca', 'planos de execucao sem gates financeiros', 'aprovacao de crescimento sem disciplina de payback'],
    sourceBasis: ['governanca financeira IBGC', 'apetite de risco COSO', 'excelencia de comite de auditoria PwC', 'referencias de governanca de mercado de capitais'],
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
    roleDefinition: 'Transforma recomendacoes em cadencia operacional, loops de responsabilizacao, responsaveis, datas, dependencias, indicadores lideres e caminhos de recuperacao.',
    boardQuestion: 'A empresa consegue executar esta decisao com responsaveis, cadencia, dependencias e sinais de revisao claros?',
    requiredEvidence: ['mapa de responsaveis', 'cadencia operacional', 'dependencias', 'cronograma', 'capacidade', 'restricoes de processo', 'indicadores lideres'],
    requiredOutputs: ['frentes de trabalho', 'RACI/DRI', 'cadencia semanal ou mensal', 'dependencias', 'datas de revisao', 'gatilhos de risco de execucao'],
    outOfScopeWarnings: ['estrategia sem loop de implementacao', 'responsabilidade pouco clara', 'planos longos sem ritmo operacional'],
    sourceBasis: ['pratica de reuniao IBGC', 'efetividade de conselho IBGC', 'material de complexidade e resiliencia'],
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
    roleDefinition: 'Testa expansao de mercado, qualidade de receita, maturidade estrategica, risco de inovacao, prontidao produto-mercado e downside se o crescimento estiver errado.',
    boardQuestion: 'Esta escolha de crescimento tem fit estrategico, atratividade comercial e prontidao operacional suficiente para escalar?',
    requiredEvidence: ['tamanho de mercado', 'qualidade de canal', 'qualidade de receita', 'retencao', 'unit economics', 'prontidao de produto', 'posicao competitiva'],
    requiredOutputs: ['ranking de crescimento', 'fit estrategico', 'gates de prontidao', 'premissas de canal', 'riscos de crescimento', 'criterios de parar/escalar'],
    outOfScopeWarnings: ['crescimento pelo crescimento', 'metricas de vaidade', 'ignorar caixa e prontidao operacional'],
    sourceBasis: ['maturidade estrategica IBGC', 'risco de inovacao', 'casos de estrategia de longo prazo', 'educacao internacional de board em estrategia'],
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
    roleDefinition: 'Nomeia riscos de concentracao, compliance, juridico, controles, stakeholders, dados, ESG e reputacao, especialmente os inconvenientes.',
    boardQuestion: 'Qual risco esta visivel, mas ainda nao foi precificado, assumido, mitigado ou escalado?',
    requiredEvidence: ['apetite de risco', 'responsavel pelo risco', 'controles', 'exposicao de compliance', 'concentracao', 'indicadores de alerta', 'caminho de escalacao'],
    requiredOutputs: ['declaracao de apetite de risco', 'responsavel pela mitigacao', 'lacuna de controle', 'indicadores de alerta', 'criterios de escalacao'],
    outOfScopeWarnings: ['medo sem mitigacao', 'teatro de compliance', 'aprovacao sem controles'],
    sourceBasis: ['responsabilidade legal e integridade IBGC', 'COSO ERM', 'FRC risco/controle interno', 'divulgacao e governanca de stakeholders OCDE'],
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
    roleDefinition: 'Testa marca, confianca do cliente, retencao, posicao de mercado, percepcao de stakeholders, qualidade de demanda e consequencia comercial.',
    boardQuestion: 'Esta decisao melhora confianca do cliente, economia do cliente e posicao de mercado de um jeito repetivel?',
    requiredEvidence: ['segmento de cliente', 'retencao', 'saliencia de marca', 'confianca', 'posicao de mercado', 'percepcao de stakeholders', 'qualidade de demanda'],
    requiredOutputs: ['consequencia para cliente', 'risco de marca/confianca', 'pergunta de retencao', 'tradeoff de posicao de mercado', 'metrica de prova do cliente'],
    outOfScopeWarnings: ['dicas de campanha sem consequencia de governanca', 'adjetivos de marca sem comportamento de negocio', 'views sem confianca ou retencao'],
    sourceBasis: ['comunicacao e contexto de stakeholders IBGC', 'metodo Creative OS de sistema operacional de marca', 'casos de estrategia/cliente'],
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
    roleDefinition: 'Testa capacidade de lideranca, sucessao, incentivos, cultura, gargalo do founder, risco de pessoa-chave, contratacoes e capacidade de execucao.',
    boardQuestion: 'A organizacao atual consegue executar e sustentar esta decisao com lideranca, incentivos e capacidade adequados?',
    requiredEvidence: ['mapa de lideranca', 'risco de sucessao', 'risco de pessoa-chave', 'capacidade', 'incentivos', 'cultura', 'lacunas de contratacao', 'comportamento decisorio'],
    requiredOutputs: ['lacunas de capacidade', 'perguntas de sucessao', 'riscos de incentivo', 'necessidades de contratacao/realocacao', 'gargalo do founder', 'condicoes de governanca de pessoas'],
    outOfScopeWarnings: ['sugestoes de RH sem consequencia de governanca', 'contratacao sem logica de capacidade', 'declaracoes de cultura sem incentivos'],
    sourceBasis: ['comite de pessoas e sucessao IBGC', 'SCARF e dinamicas de decisao IBGC', 'material de efetividade e diversidade de board'],
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
      missing_requirements: ['Nenhuma rubrica configurada para este advisor.'],
    }
  }

  const scope = scoreKeywordCoverage(text, rubric.scoringKeywords.scope)
  const evidence = scoreKeywordCoverage(text, rubric.scoringKeywords.evidence)
  const boardLevel = scoreKeywordCoverage(text, rubric.scoringKeywords.boardLevel)
  const closure = scoreKeywordCoverage(text, rubric.scoringKeywords.closure)
  const missing = [
    scope < 35 ? 'Baixa aderencia ao escopo do advisor.' : null,
    evidence < 25 ? 'Evidencias obrigatorias ausentes ou fracas.' : null,
    boardLevel < 25 ? 'Pouca linguagem de decisao em nivel de board.' : null,
    closure < 25 ? 'Sem contribuicao clara para fechamento.' : null,
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
      `Papel: ${rubric.roleDefinition}`,
      `Pergunta de board: ${rubric.boardQuestion}`,
      `Evidencias obrigatorias: ${rubric.requiredEvidence.join('; ')}`,
      `Outputs obrigatorios: ${rubric.requiredOutputs.join('; ')}`,
      `Evitar: ${rubric.outOfScopeWarnings.join('; ')}`,
    ].join('\n'))
    .join('\n\n')
}

export function caseLibraryForPrompt() {
  return BOARD_CASE_LIBRARY
    .map((caseItem) => `${caseItem.title}: ${caseItem.boardProblem} Advisors sob estresse: ${caseItem.advisorStress.join(', ')}.`)
    .join('\n')
}
