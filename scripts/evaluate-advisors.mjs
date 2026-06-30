#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

loadEnvFile(`${ROOT}/.env.local`)

const rubrics = {
  board_brain: {
    scope: ['orchestrate|orquestra|sintese|synthesis', 'consensus|converge|alinhad', 'conflict|dissent|diverg', 'board-level|questao de board|governanca'],
    evidence: ['missing evidence|lacuna|ausencia', 'risk appetite|apetite de risco', 'advisor|assessor', 'minutes|minuta|ata', 'source|fonte'],
    board: ['decision|decisao', 'condition|condicao|condicionar', 'owner|responsavel', 'review|revisao|revista', 'follow-up|follow up|acompanhamento', 'tradeoff'],
    closure: ['commit|comprometer|aprovar', 'conditions|condicoes|condicionado', 'defer|adiar', 'reject|rejeitar', 'request more data|pedir dados|solicitar dados', 'escalate|escalar'],
  },
  finance: {
    scope: ['cash|caixa', 'ROI|retorno|payback', 'margin|margem', 'runway|liquidez', 'debt|divida', 'working capital|capital de giro', 'DRE|P&L|OCF|EBITDA'],
    evidence: ['budget|orcamento', 'forecast|previsao', 'variance|variancia|desvio', 'concentration|concentracao', 'liquidity|liquidez', 'covenant|restricao'],
    board: ['capital allocation|alocacao de capital', 'investment gate|gate de investimento|milestone', 'risk-adjusted|ajustado ao risco', 'approval|aprovacao', 'scenario|cenario'],
    closure: ['financial condition|condicao financeira', 'gate', 'approve with conditions|aprovar com condicoes|commit_with_conditions', 'request data|pedir dados|solicitar dados', 'defer|adiar'],
  },
  operator: {
    scope: ['owner|responsavel', 'cadence|cadencia|ritual', 'process|processo', 'execution|execucao', 'workflow|fluxo', 'accountability|prestacao de contas', 'dependency|dependencia', 'RACI|DRI'],
    evidence: ['timeline|prazo', 'capacity|capacidade', 'leading indicator|indicador', 'review date|data de revisao', 'blocked|bloqueio', 'handoff'],
    board: ['workstream|frente', 'decision loop|loop de decisao', 'operating rhythm|ritmo operacional|war room', 'escalation|escalacao', 'checkpoint|marco'],
    closure: ['assign|atribuir|nomear', 'schedule|agendar', 'review|revisar', 'trigger|gatilho', 'condition|condicao|commit_with_conditions'],
  },
  growth: {
    scope: ['growth|crescimento', 'market|mercado', 'expansion|expansao', 'scale|escala|escalar', 'channel|canal', 'revenue quality|receita de qualidade', 'retention|retencao', 'product-market|produto-mercado'],
    evidence: ['CAC|LTV|unit economics', 'cohort|coorte', 'conversion|conversao', 'readiness|prontidao', 'competition|competicao', 'pricing|preco'],
    board: ['strategic fit|fit estrategico|tese', 'prioritize|priorizar', 'scale gate|gate de escala', 'stop criteria|criterio de parada', 'downside|risco se errado'],
    closure: ['scale|escalar', 'test|teste|POC', 'pause|pausar', 'gate', 'commit|comprometer'],
  },
  risk: {
    scope: ['risk|risco', 'compliance|conformidade', 'control|controle', 'concentration|concentracao', 'legal|juridico', 'reputation|reputacional', 'LGPD|dados pessoais', 'ESG|audit'],
    evidence: ['risk appetite|apetite de risco', 'owner|responsavel', 'mitigation|mitigacao', 'early warning|alerta', 'escalation|escalacao', 'policy|politica', 'control gap|lacuna de controle'],
    board: ['acceptable risk|risco aceitavel', 'unpriced risk|risco nao precificado', 'board oversight|supervisao do board', 'limit|limite', 'guardrail'],
    closure: ['mitigate|mitigar', 'escalate|escalar', 'condition|condicao|commit_with_conditions', 'reject|rejeitar', 'defer|adiar'],
  },
  customer: {
    scope: ['customer|cliente|torcedor', 'brand|marca', 'trust|confianca', 'retention|retencao', 'market|mercado', 'demand|demanda', 'stakeholder|publico', 'salience|saliencia|lembranca'],
    evidence: ['NPS', 'cohort|coorte', 'awareness|reconhecimento', 'perception|percepcao', 'behavior|comportamento', 'segment|segmento|18-32', 'churn'],
    board: ['market position|posicao de mercado', 'customer economics|economia do cliente', 'reputation|reputacao', 'choice|escolha', 'tradeoff'],
    closure: ['prove|provar', 'measure|medir', 'protect|proteger', 'prioritize|priorizar', 'condition|condicao|commit_with_conditions'],
  },
  talent: {
    scope: ['leadership|lideranca', 'talent|talento|pessoas', 'succession|sucessao', 'capacity|capacidade', 'incentive|incentivo', 'culture|cultura', 'hiring|contratar|contratada', 'founder|fundador'],
    evidence: ['key-person|pessoa-chave', 'role|papel', 'span|amplitude', 'capability|capabilidade|competencia', 'compensation|remuneracao', 'decision behavior|comportamento decisorio', 'team|time'],
    board: ['continuity|continuidade', 'people governance|governanca de pessoas', 'execution capacity|capacidade de execucao', 'succession plan|plano de sucessao', 'bottleneck|gargalo'],
    closure: ['hire|contratar', 'assign|atribuir', 'realign|realocar|realinhar', 'succession|sucessao', 'condition|condicao|commit_with_conditions'],
  },
}

function normalize(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalize).join(' ')
  if (value && typeof value === 'object') return Object.values(value).map(normalize).join(' ')
  return ''
}

function coverage(text, terms) {
  const lower = text.toLowerCase()
  const hits = terms.filter((term) => (
    term
      .split('|')
      .map((candidate) => candidate.trim().toLowerCase())
      .some((candidate) => candidate && lower.includes(candidate))
  )).length
  return terms.length ? Math.round((hits / terms.length) * 100) : 0
}

function score(review) {
  const rubric = rubrics[review.advisor_key]
  if (!rubric) return null

  const text = [
    review.perspective,
    normalize(review.strategic_questions),
    normalize(review.recommendations),
    review.closure_recommendation,
  ].filter(Boolean).join(' ')

  const scope = coverage(text, rubric.scope)
  const evidence = coverage(text, rubric.evidence)
  const board = coverage(text, rubric.board)
  const closure = coverage(text, rubric.closure)
  const total = Math.round(scope * 0.3 + evidence * 0.25 + board * 0.25 + closure * 0.2)

  return { total, scope, evidence, board, closure }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const companySlugArg = process.argv.find((arg) => arg.startsWith('--company='))
  const companySlug = companySlugArg?.split('=')[1] ?? 'lance'
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('slug', companySlug)
    .maybeSingle()

  if (companyError) throw new Error(companyError.message)
  if (!company) throw new Error(`Company not found: ${companySlug}`)

  const { data: reviews, error } = await supabase
    .from('agent_reviews')
    .select('id, advisor_key, advisor_name, perspective, strategic_questions, recommendations, closure_recommendation, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) throw new Error(error.message)

  const scored = (reviews ?? [])
    .map((review) => ({ ...review, adherence: score(review) }))
    .filter((review) => review.adherence)

  const latestByAdvisor = new Map()
  for (const review of scored) {
    if (!latestByAdvisor.has(review.advisor_key)) latestByAdvisor.set(review.advisor_key, review)
  }

  const rows = Array.from(latestByAdvisor.values()).map((review) => ({
    advisor: review.advisor_name,
    key: review.advisor_key,
    ...review.adherence,
  }))
  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.total, 0) / rows.length)
    : 0

  console.log(JSON.stringify({
    company: company.name,
    latest_reviews_scored: rows.length,
    average,
    rows,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
