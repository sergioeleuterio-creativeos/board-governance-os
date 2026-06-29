import { BOARD_PERSONAS, BoardCompany, GovernanceAIOutput, GovernanceRunInput } from './types'
import { INJECTION_GUARD, wrapUserContent } from '@/lib/prompts'

type Provider = 'openai' | 'anthropic' | 'mock'

export function resolveAIProvider(): Provider {
  const configured = process.env.AI_PROVIDER?.toLowerCase()
  if (configured === 'openai' || configured === 'anthropic') return configured
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'mock'
}

export function resolveModel(provider: Provider, purpose: 'governance_synthesis' | 'default' = 'default'): string {
  if (provider === 'openai' && purpose === 'governance_synthesis' && process.env.OPENAI_MODEL_BOARD_BRAIN_SYNTHESIS) {
    return process.env.OPENAI_MODEL_BOARD_BRAIN_SYNTHESIS
  }

  if (process.env.AI_MODEL) return process.env.AI_MODEL
  if (provider === 'openai') return 'gpt-4.1'
  if (provider === 'anthropic') return 'claude-sonnet-4-6'
  return 'mock-governance-v1'
}

function buildPrompt(company: BoardCompany, input: GovernanceRunInput): string {
  return `You are Board Governance OS, an AI governance layer for founder-led companies.

Positioning guardrail: you are not a board member, not a board replacement, and not a virtual CEO. You create decision architecture: clearer risks, sharper priorities, better questions, and decision memory.

Company:
${wrapUserContent(JSON.stringify(company, null, 2))}

Governance run input:
${wrapUserContent(JSON.stringify(input, null, 2))}

Use these governance personas:
${BOARD_PERSONAS.map(p => `- ${p.name}: ${p.focus}`).join('\n')}

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

function parseJSON(text: string): GovernanceAIOutput {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(cleaned) as GovernanceAIOutput
}

export async function runGovernanceAI(company: BoardCompany, input: GovernanceRunInput) {
  const provider = resolveAIProvider()
  const model = resolveModel(provider, 'governance_synthesis')

  if (provider === 'mock') {
    return { provider, model, output: mockGovernanceOutput(company, input) }
  }

  const prompt = buildPrompt(company, input)
  const system = `You produce structured governance analysis for founder-led companies. Return valid JSON only.${INJECTION_GUARD}`

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return { provider, model, output: parseJSON(data.choices?.[0]?.message?.content ?? '{}') }
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return { provider, model, output: parseJSON(data.content?.[0]?.text ?? '{}') }
}

function mockGovernanceOutput(company: BoardCompany, input: GovernanceRunInput): GovernanceAIOutput {
  const challenge = company.main_challenge || input.risks || 'growing complexity'
  return {
    run: {
      title: `${company.name || 'Company'} governance review`,
      summary: `The company needs sharper operating focus around ${challenge}. The next governance cycle should reduce priority spread, make cash and execution risks visible, and turn open decisions into accountable follow-ups.`,
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
      explanation: 'The company has enough context to act, but the operating cadence and risk visibility need tightening.',
    },
    persona_reviews: BOARD_PERSONAS.map(persona => ({
      persona_key: persona.key,
      persona_name: persona.name,
      focus_area: persona.focus,
      stance: 'approve_with_conditions',
      risk_score: 55,
      confidence_score: 70,
      summary: `${persona.name} sees momentum, but wants clearer evidence before expanding commitments.`,
      questions: [`What would make this priority obviously wrong in 30 days?`, `Who owns the next measurable proof point?`],
      risks: [{ title: 'Unowned execution risk', severity: 'medium', detail: 'The plan names priorities but not enough accountable checkpoints.' }],
      recommendations: [{ title: 'Assign one owner per priority', detail: 'Convert the top three priorities into named owner/date/accountability loops.', priority: 'high' }],
    })),
    board_pack: {
      executive_summary: `Board Governance OS recommends a focused operating cycle: protect cash visibility, rank the top three priorities, and review decisions against expected outcomes.`,
      strategic_questions: [
        'What is the single constraint that matters most this quarter?',
        'Which priority should be stopped if capacity tightens?',
        'What risk is currently visible but socially inconvenient to name?',
      ],
      risk_map: [
        { risk: 'Priority spread', severity: 'high', mitigation: 'Limit the cycle to three company-level priorities.' },
        { risk: 'Decision drift', severity: 'medium', mitigation: 'Add review dates to every major decision.' },
      ],
      priority_ranking: [
        { priority: 'Clarify top operating constraint', rationale: 'Without this, every function can optimize locally.', owner_suggestion: 'Founder/CEO' },
        { priority: 'Install follow-up cadence', rationale: 'Governance only matters if decisions return for review.', owner_suggestion: 'Operator' },
      ],
      meeting_agenda: ['Review KPI movement', 'Discuss top risks', 'Confirm priority ranking', 'Log decisions', 'Assign follow-ups'],
    },
    decision: {
      title: 'Proceed with a narrowed governance cycle',
      decision: 'proceed_with_conditions',
      rationale: 'The company has enough context to move, but should narrow scope and define review points before adding new initiatives.',
      risk_level: 'medium',
      confidence_score: 72,
      tradeoffs: [{ upside: 'Faster alignment and less founder decision fatigue.', downside: 'Some initiatives will need to wait.' }],
      conditions: [{ title: 'Name owners', detail: 'Every top priority needs one owner and one review date.' }],
    },
    follow_ups: [
      { title: 'Define top three priorities', description: 'Write one measurable outcome for each.', owner_label: 'Founder', priority: 'urgent', due_in_days: 7, source_persona_key: 'operator' },
      { title: 'Add review dates to open decisions', description: 'Turn decisions into memory, not just notes.', owner_label: 'Founder', priority: 'high', due_in_days: 14, source_persona_key: 'risk' },
    ],
  }
}
