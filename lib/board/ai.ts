import { BOARD_PERSONAS, BoardCompany, GovernanceAIOutput, GovernanceRunInput } from './types'
import { INJECTION_GUARD, wrapUserContent } from '@/lib/prompts'
import { callJSONAI } from './model-router'
import { advisorRubricsForPrompt, caseLibraryForPrompt } from './advisor-rubrics'

export { resolveAIProvider, resolveModel } from './model-router'

function buildPrompt(company: BoardCompany, input: GovernanceRunInput): string {
  return `You are Board Governance OS, an AI governance layer for founder-led companies.

Positioning guardrail: you are not a board member, not a board replacement, and not a virtual CEO. You create decision architecture: clearer risks, sharper priorities, better questions, and decision memory.

Language rule: all user-facing string values must be written in pt-BR. Keep JSON keys, enum values, persona keys, and product names exactly as specified.

Company:
${wrapUserContent(JSON.stringify(company, null, 2))}

Governance run input:
${wrapUserContent(JSON.stringify(input, null, 2))}

Use these governance personas:
${BOARD_PERSONAS.map(p => `- ${p.name}: ${p.focus}`).join('\n')}

Advisor adherence rubrics:
${advisorRubricsForPrompt()}

Open case-library patterns to use as board reasoning analogies, not copied case text:
${caseLibraryForPrompt()}

Advisor output rules:
- Each advisor must stay inside its role definition.
- Each advisor must ask board-level questions, not generic management tips.
- Each advisor must name missing evidence from its required evidence list.
- Each advisor must contribute to a clear closing path: aprovar, aprovar com condicoes, adiar, rejeitar, pedir mais dados, or escalar.
- The Board Brain must preserve consensus and dissent instead of averaging them away.
- All summaries, questions, risks, recommendations, rationales, tradeoffs, conditions, agenda items, and follow-ups must be natural pt-BR.

Return one JSON object only. No markdown. Match this shape exactly:
{
  "run": { "title": "", "summary": "", "risk_score": 0, "confidence_score": 0 },
  "governance_score": {
    "total": 0,
    "strategic_clarity": 0,
    "financial_discipline": 0,
    "execution_cadence": 0,
    "risk_visibility": 0,
    "decision_quality": 0,
    "explanation": ""
  },
  "persona_reviews": [
    {
      "persona_key": "finance",
      "persona_name": "Finance Advisor",
      "focus_area": "ROI, cash, capital efficiency",
      "stance": "approve_with_conditions",
      "risk_score": 0,
      "confidence_score": 0,
      "summary": "",
      "questions": [],
      "risks": [{ "title": "", "severity": "medium", "detail": "" }],
      "recommendations": [{ "title": "", "detail": "", "priority": "medium" }]
    }
  ],
  "board_pack": {
    "executive_summary": "",
    "strategic_questions": [],
    "risk_map": [{ "risk": "", "severity": "medium", "mitigation": "" }],
    "priority_ranking": [{ "priority": "", "rationale": "", "owner_suggestion": "" }],
    "meeting_agenda": []
  },
  "decision": {
    "title": "",
    "decision": "proceed_with_conditions",
    "rationale": "",
    "risk_level": "medium",
    "confidence_score": 0,
    "tradeoffs": [{ "upside": "", "downside": "" }],
    "conditions": [{ "title": "", "detail": "" }]
  },
  "follow_ups": [
    { "title": "", "description": "", "owner_label": "", "priority": "medium", "due_in_days": 14, "source_persona_key": "operator" }
  ]
}`
}

export async function runGovernanceAI(company: BoardCompany, input: GovernanceRunInput) {
  const prompt = buildPrompt(company, input)
  const system = `Voce produz analise de governanca estruturada para empresas lideradas por founders. Escreva todos os textos visiveis ao usuario em pt-BR. Preserve JSON keys e enum values exatamente como solicitado. Retorne apenas JSON valido.${INJECTION_GUARD}`
  const result = await callJSONAI<GovernanceAIOutput>({
    purpose: 'governance_synthesis',
    system,
    prompt,
    fallback: () => mockGovernanceOutput(company, input),
    fallbackOnError: true,
  })

  return {
    provider: result.provider,
    model: result.model,
    output: result.output,
    usedFallback: result.usedFallback,
    fallbackReason: result.error ?? null,
  }
}

function mockGovernanceOutput(company: BoardCompany, input: GovernanceRunInput): GovernanceAIOutput {
  const challenge = company.main_challenge || input.risks || 'complexidade crescente'
  return {
    run: {
      title: `Revisao de governanca - ${company.name || 'Empresa'}`,
      summary: `A empresa precisa transformar ${challenge} em uma decisao governavel. O proximo ciclo deve reduzir dispersao de prioridades, explicitar caixa e riscos de execucao, e converter decisoes abertas em follow-ups com responsaveis.`,
      risk_score: 58,
      confidence_score: 72,
    },
    governance_score: {
      total: 64,
      strategic_clarity: 62,
      financial_discipline: 58,
      execution_cadence: 66,
      risk_visibility: 60,
      decision_quality: 74,
      explanation: 'A empresa tem contexto suficiente para agir, mas precisa apertar a cadencia operacional e a visibilidade de riscos.',
    },
    persona_reviews: BOARD_PERSONAS.map(persona => ({
      persona_key: persona.key,
      persona_name: persona.name,
      focus_area: persona.focus,
      stance: 'approve_with_conditions',
      risk_score: 55,
      confidence_score: 70,
      summary: `${persona.name} ve tracao, mas pede evidencias mais claras antes de ampliar compromissos.`,
      questions: ['O que tornaria esta prioridade claramente errada em 30 dias?', 'Quem responde pelo proximo ponto de prova mensuravel?'],
      risks: [{ title: 'Risco de execucao sem responsavel', severity: 'medium', detail: 'O plano nomeia prioridades, mas ainda nao define checkpoints suficientes de responsabilizacao.' }],
      recommendations: [{ title: 'Nomear um responsavel por prioridade', detail: 'Converter as tres prioridades principais em loops com responsavel, data e prestacao de contas.', priority: 'high' }],
    })),
    board_pack: {
      executive_summary: 'Board Governance OS recomenda um ciclo operacional focado: proteger visibilidade de caixa, ranquear as tres prioridades principais e revisar decisoes contra resultados esperados.',
      strategic_questions: [
        'Qual e a restricao unica que mais importa neste trimestre?',
        'Qual prioridade deve ser interrompida se a capacidade apertar?',
        'Qual risco ja esta visivel, mas ainda e desconfortavel nomear?',
      ],
      risk_map: [
        { risk: 'Dispersao de prioridades', severity: 'high', mitigation: 'Limitar o ciclo a tres prioridades de nivel empresa.' },
        { risk: 'Decisoes sem retorno', severity: 'medium', mitigation: 'Adicionar data de revisao a toda decisao relevante.' },
      ],
      priority_ranking: [
        { priority: 'Clarificar a principal restricao operacional', rationale: 'Sem isso, cada funcao pode otimizar localmente sem resolver o problema da empresa.', owner_suggestion: 'Fundador/CEO' },
        { priority: 'Instalar cadencia de follow-up', rationale: 'Governanca so importa se as decisoes voltarem para revisao.', owner_suggestion: 'Operacoes' },
      ],
      meeting_agenda: ['Revisar movimento dos KPIs', 'Discutir principais riscos', 'Confirmar ranking de prioridades', 'Registrar decisoes', 'Atribuir follow-ups'],
    },
    decision: {
      title: 'Avancar com um ciclo de governanca mais estreito',
      decision: 'proceed_with_conditions',
      rationale: 'A empresa tem contexto suficiente para avancar, mas deve reduzir escopo e definir pontos de revisao antes de adicionar novas iniciativas.',
      risk_level: 'medium',
      confidence_score: 72,
      tradeoffs: [{ upside: 'Alinhamento mais rapido e menos fadiga decisoria do founder.', downside: 'Algumas iniciativas terao de esperar.' }],
      conditions: [{ title: 'Nomear responsaveis', detail: 'Toda prioridade principal precisa de um responsavel e uma data de revisao.' }],
    },
    follow_ups: [
      { title: 'Definir as tres prioridades principais', description: 'Escrever um resultado mensuravel para cada uma.', owner_label: 'Fundador', priority: 'urgent', due_in_days: 7, source_persona_key: 'operator' },
      { title: 'Adicionar datas de revisao as decisoes abertas', description: 'Transformar decisoes em memoria, nao apenas em notas.', owner_label: 'Fundador', priority: 'high', due_in_days: 14, source_persona_key: 'risk' },
    ],
  }
}
