import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth } from '@/lib/auth-server'
import {
  buildIntakeResult,
  type CompanyBrainIntakeDraft,
  type IntakeSectionKey,
} from '@/lib/shadow-board/intake'

const sectionQuestions: Record<IntakeSectionKey, string[]> = {
  company: [
    'Qual e o modelo de receita principal e qual parte dele ainda nao esta profissionalizada?',
    'Que informacao basica da empresa precisa ser corrigida antes do board discutir decisoes?',
  ],
  strategy: [
    'Qual decisao concreta voce precisa tomar nos proximos 30 dias?',
    'O que ja foi tentado e por que ainda nao resolveu o problema?',
  ],
  finance: [
    'Quais numeros de DRE, caixa, margem ou concentracao mudariam a recomendacao do board?',
    'Qual investimento esta em discussao e qual retorno minimo justificaria aprovar?',
  ],
  team: [
    'Quem seria o owner real dessa decisao se ela fosse aprovada hoje?',
    'Que capacidade falta no time para executar sem depender do founder?',
  ],
  chat: [
    'Qual contexto ainda esta na sua cabeca e nao entrou nos campos estruturados?',
    'Qual pergunta voce gostaria que os advisors desafiassem com mais dureza?',
  ],
  files: [
    'Existe algum PDF, planilha, deck ou relatorio que prove ou contradiga essa narrativa?',
    'Que arquivo financeiro deveria entrar no proximo Board Pack?',
  ],
  review: [
    'Qual trade-off voce quer ver explicitado antes de aprovar o plano?',
    'Qual condicao faria voce adiar a decisao?',
  ],
}

function compact(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function inferFocus(message: string): IntakeSectionKey {
  const lower = message.toLowerCase()
  if (/(dre|p&l|finance|receita|margem|caixa|cash|runway|ocf|investimento|roi)/.test(lower)) return 'finance'
  if (/(time|lider|lideran|hiring|contratar|owner|responsavel|cadencia|execu)/.test(lower)) return 'team'
  if (/(arquivo|pdf|planilha|deck|documento|upload|fonte|relatorio)/.test(lower)) return 'files'
  if (/(decis|estrateg|plano|prioridade|crescimento|risco|mercado)/.test(lower)) return 'strategy'
  if (/(empresa|modelo|produto|cliente|setor)/.test(lower)) return 'company'
  return 'chat'
}

function isSectionKey(value: string | undefined): value is IntakeSectionKey {
  return !!value && value in sectionQuestions
}

function replyFor(draft: CompanyBrainIntakeDraft, message: string) {
  const result = buildIntakeResult(draft)
  const focus = inferFocus(message)
  const missing = isSectionKey(result.quality.missing[0]) ? result.quality.missing[0] : focus
  const questions = [
    ...(sectionQuestions[focus] ?? []),
    ...(focus !== missing ? sectionQuestions[missing] ?? [] : []),
  ].slice(0, 3)

  const companyName = compact(draft.company.name) || 'a empresa'
  const oneLine = compact(message).slice(0, 260)
  const qualityNote = result.quality.readyForGovernanceRun
    ? 'A qualidade do intake ja permite preparar uma Governance Run inicial.'
    : `A qualidade do intake esta em ${result.quality.total}/100; eu ainda seguraria a Governance Run ate fechar os pontos abaixo.`

  return [
    `Registrei isso como contexto para ${companyName}: ${oneLine}`,
    qualityNote,
    'Proximas perguntas para melhorar a precisao do board:',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
  ].join('\n')
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)
  const draft = body?.draft as CompanyBrainIntakeDraft | undefined
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!draft) return NextResponse.json({ error: 'draft is required' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const assistantMessage = replyFor(draft, message)

  return NextResponse.json({
    mode: 'deterministic-board-brain-intake',
    assistant: {
      id: `board-brain-${Date.now()}`,
      role: 'board_brain',
      content: assistantMessage,
      created_at: new Date().toISOString(),
    },
    nextAdapter: 'openai-board-brain-intake',
  })
}
