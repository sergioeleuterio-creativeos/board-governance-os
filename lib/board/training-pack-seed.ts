import type { CompanyTrainingPack } from './training-sources'

type TrainingSeedService = {
  from: (table: string) => any
}

type TrainingSeedInput = {
  service: TrainingSeedService
  pack: CompanyTrainingPack
  organizationId: string
  actorUserId: string
  reset?: boolean
}

type TrainingSeedResult = {
  company_id: string
  governance_cycle_id: string
  board_pack_id: string
  board_session_id: string
  created: boolean
}

const advisors = [
  ['board_brain', 'Board Brain', 'orquestra conflito, consenso, condicoes de decisao e memoria futura'],
  ['finance', 'Finance Advisor', 'testa caixa, ROI, margem, alocacao de capital e gates financeiros'],
  ['operator', 'Operator Advisor', 'transforma a recomendacao em responsaveis, cadencia, dependencias e sinais de execucao'],
  ['growth', 'Growth Advisor', 'testa escala, mercado, receita de qualidade, canais e criterios de crescimento'],
  ['risk', 'Risk Advisor', 'identifica riscos nao precificados, controles, concentracao, compliance e escalacao'],
  ['customer', 'Customer Advisor', 'testa marca, confianca, retencao, posicao de mercado e qualidade da demanda'],
  ['talent', 'Talent Advisor', 'testa lideranca, capacidade, incentivos, sucessao e risco de pessoa-chave'],
] as const

const advisorEvidenceLanguage: Record<string, {
  scope: string
  evidence: string
  board: string
  closure: string
}> = {
  board_brain: {
    scope: 'orquestrar sintese, consenso, conflito, dissenso e limite de governanca no nivel de board',
    evidence: 'evidencias ausentes, apetite de risco, divergencia entre advisors, trilha de fontes e disciplina de ata',
    board: 'decisao, condicao, responsavel, data de revisao, follow-up e memoria de tradeoffs',
    closure: 'comprometer com condicoes, adiar, rejeitar, pedir mais dados ou escalar para revisao humana',
  },
  finance: {
    scope: 'caixa, ROI, payback, margem, runway, divida, capital de giro, DRE/P&L, OCF e EBITDA',
    evidence: 'orcamento, forecast, desvio, concentracao, liquidez e exposicao a covenants',
    board: 'alocacao de capital, gate de investimento, cenario ajustado a risco e condicao de aprovacao',
    closure: 'condicao financeira, gate, aprovar com condicoes, pedir dados ou adiar',
  },
  operator: {
    scope: 'responsavel, cadencia, processo, execucao, fluxo de trabalho, accountability, dependencia, RACI e DRI',
    evidence: 'cronograma, capacidade, indicador lider, data de revisao, bloqueio e passagem de bastao',
    board: 'frente de trabalho, loop de decisao, ritmo operacional, escalacao e checkpoint',
    closure: 'nomear responsavel, agendar cadencia, gatilho de revisao e compromisso com condicoes',
  },
  growth: {
    scope: 'crescimento, mercado, expansao, escala, canal, qualidade de receita, retencao e prontidao produto-mercado',
    evidence: 'CAC, LTV, unit economics, coorte, conversao, competicao, precificacao e prontidao',
    board: 'fit estrategico, priorizacao, gate de escala, criterio de parada e downside se a aposta estiver errada',
    closure: 'escalar, testar, pausar, criar gate ou comprometer com base em evidencia',
  },
  risk: {
    scope: 'risco, compliance, controle, concentracao, juridico, reputacao, LGPD, ESG e exposicao de auditoria',
    evidence: 'apetite de risco, responsavel, mitigacao, alerta antecipado, escalacao, politica e lacuna de controle',
    board: 'risco aceitavel, risco nao precificado, supervisao do board, limite e guardrail',
    closure: 'mitigar, escalar, condicionar, rejeitar ou adiar',
  },
  customer: {
    scope: 'cliente, marca, confianca, retencao, mercado, demanda, stakeholder, saliencia e memoria de marca',
    evidence: 'NPS, coorte, conhecimento de marca, percepcao, comportamento, segmento, churn e sinais de demanda 18-32',
    board: 'posicao de mercado, economia do cliente, reputacao, escolha do cliente e tradeoff',
    closure: 'provar, medir, proteger, priorizar e comprometer com condicoes',
  },
  talent: {
    scope: 'lideranca, talento, sucessao, capacidade, incentivos, cultura, contratacao e gargalo do fundador',
    evidence: 'risco de pessoa-chave, clareza de papeis, amplitude de gestao, capacidade, remuneracao, comportamento decisorio e capacidade do time',
    board: 'continuidade, governanca de pessoas, capacidade de execucao, plano de sucessao e gargalo',
    closure: 'contratar, atribuir, realinhar, condicionar sucessao e comprometer com condicoes',
  },
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'training-pack'
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function asSentenceFragment(value: string) {
  return value.trim().replace(/[.\s]+$/g, '')
}

async function must<T = any>(label: string, query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

function sourceReferences(pack: CompanyTrainingPack) {
  return pack.sourceUrls.map((url, index) => ({
    title: pack.sourceInstitutions[index] ?? pack.sourceInstitutions[0] ?? 'Fonte publica',
    url,
    use: 'Calibracao por fonte publica para pack de treinamento/demo.',
  }))
}

function financialReport(pack: CompanyTrainingPack) {
  return {
    'DRE / P&L': [
      { line_item: 'Receita', value: 'A confirmar', board_note: 'Separar crescimento real de narrativa de crescimento.' },
      { line_item: 'Margem bruta', value: 'A confirmar', board_note: 'Obrigatoria para validar a tese economica do pack.' },
      { line_item: 'EBITDA / resultado operacional', value: 'A confirmar', board_note: 'Usar como gate antes de escalar iniciativas.' },
    ],
    'OCF / Caixa': [
      { line_item: 'Fluxo de caixa operacional', value: 'A confirmar', board_note: 'Testa se a estrategia consome ou gera caixa.' },
      { line_item: 'Runway / liquidez', value: 'A confirmar', board_note: 'Define apetite de risco para a decisao.' },
    ],
    'Unit economics': [
      { line_item: 'Payback / ROI', value: 'A confirmar', board_note: pack.companySeed.knownUnknowns[0] ?? 'Criar gate financeiro.' },
      { line_item: 'Concentracao', value: 'A confirmar', board_note: 'Validar dependencia de cliente, canal, produto ou regulador.' },
    ],
  }
}

function boardRisks(pack: CompanyTrainingPack) {
  return pack.companySeed.knownUnknowns.slice(0, 5).map((unknown, index) => ({
    title: unknown,
    risk: index < 2 ? 'high' : 'medium',
    mitigation: 'Nomear responsavel, fonte de evidencia e gatilho de revisao antes de aprovar escala.',
  }))
}

function priorityRanking(pack: CompanyTrainingPack) {
  return [
    {
      title: 'Fechar lacunas de evidencia',
      priority: 'alta',
      rationale: `Sem isso, a decisao sobre ${pack.caseTitle} vira opiniao, nao governanca.`,
    },
    {
      title: 'Definir gates financeiros e operacionais',
      priority: 'alta',
      rationale: 'Transforma ambicao em condicoes de aprovacao, pausa ou escala.',
    },
    {
      title: 'Registrar decisao, responsavel e cadencia',
      priority: 'media',
      rationale: 'Evita que a recomendacao se perca depois da reuniao.',
    },
  ]
}

function decisionCandidates(pack: CompanyTrainingPack) {
  return [
    {
      title: `Aprovar ciclo de validacao: ${pack.caseTitle}`,
      decision: pack.companySeed.decisionPressure,
      owner_suggestion: 'Fundador + responsavel funcional indicado',
      risk_level: 'high',
      confidence_score: 72,
      conditions: pack.companySeed.knownUnknowns.slice(0, 3),
    },
    {
      title: 'Adiar escala ate evidencias minimas',
      decision: 'Manter piloto/diagnostico ate DRE, OCF, unit economics, controles e capacidade ficarem claros.',
      owner_suggestion: 'Board Brain + Finance Advisor',
      risk_level: 'medium',
      confidence_score: 78,
      conditions: ['DRE/P&L minimo', 'OCF/runway', 'responsavel operacional', 'data de revisao'],
    },
  ]
}

function advisorReviewFor(pack: CompanyTrainingPack, advisorKey: string, advisorName: string, focus: string) {
  const stressed = pack.advisorStress.includes(advisorKey as any)
  const question = pack.boardQuestions.find((item) => item.toLowerCase().includes(advisorKey)) ?? pack.boardQuestions[0]
  const language = advisorEvidenceLanguage[advisorKey] ?? advisorEvidenceLanguage.board_brain
  const decisionPressure = asSentenceFragment(pack.companySeed.decisionPressure)
  return {
    advisor_key: advisorKey,
    advisor_name: advisorName,
    status: 'complete',
    stance: stressed ? 'support_with_conditions' : 'neutral',
    risk_score: stressed ? 72 : 58,
    confidence_score: stressed ? 76 : 68,
    perspective: `${advisorName} deve ${focus}. Escopo da lente: ${language.scope}. Neste pack, o ponto critico e transformar "${decisionPressure}" em uma decisao com evidencia, responsavel, condicoes e revisao.`,
    strategic_questions: [
      question,
      `Qual evidencia minima de ${language.evidence} muda a recomendacao?`,
      `Qual decisao de board precisa registrar ${language.board}?`,
      `Que evidencia de ${pack.companySeed.knownUnknowns[0] ?? 'risco'} mudaria a recomendacao?`,
      'Qual condicao faria o board aprovar, adiar ou escalar revisao humana?',
    ],
    source_references: sourceReferences(pack).slice(0, 3),
    recommendations: [
      `Exigir evidencia minima antes de aprovar escala em ${pack.companyName}.`,
      `Criar ${language.board} antes de sair da reuniao.`,
      `Usar ${language.closure} como fechamento possivel da sessao.`,
      'Registrar responsavel, risco, condicoes, ata, follow-up e data de revisao.',
      stressed ? 'Tratar este advisor como lente principal no primeiro review.' : 'Usar esta lente para desafiar pontos cegos da decisao.',
    ],
    closure_recommendation: 'commit_with_conditions',
    raw_output: {
      training_pack_id: pack.id,
      training_pack_case: pack.caseTitle,
      calibration_only: true,
    },
  }
}

export async function seedTrainingPackCompany({
  service,
  pack,
  organizationId,
  actorUserId,
  reset = false,
}: TrainingSeedInput): Promise<TrainingSeedResult> {
  const slug = `training-${slugify(pack.id)}`
  const existingCompany = await must<any | null>('load training company', service
    .from('companies')
    .select('id, organization_id, metadata')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .maybeSingle())

  const company = await must<any>('upsert training company', service
    .from('companies')
    .upsert({
      organization_id: organizationId,
      user_id: actorUserId,
      name: pack.companyName,
      slug,
      industry: pack.sector,
      business_model: pack.companySeed.businessModel,
      revenue_range: 'Training pack',
      stage: pack.companySeed.governanceStage,
      jurisdiction: pack.geography,
      default_locale: 'pt-BR',
      goals: pack.boardProblem,
      main_challenge: pack.companySeed.decisionPressure,
      status: 'active',
      metadata: {
        ...(existingCompany?.metadata ?? {}),
        training_pack: true,
        training_pack_id: pack.id,
        training_case_title: pack.caseTitle,
        company_archetype: pack.companyArchetype,
        source_urls: pack.sourceUrls,
      },
    }, { onConflict: 'organization_id,slug' })
    .select('id, organization_id')
    .single())

  await must('upsert company membership', service
    .from('company_memberships')
    .upsert({
      company_id: company.id,
      user_id: actorUserId,
      role: 'admin',
      status: 'active',
    }, { onConflict: 'company_id,user_id' }))

  const existingCycle = await must<any | null>('load existing training cycle', service
    .from('governance_cycles')
    .select('id')
    .eq('company_id', company.id)
    .eq('title', `Training Pack - ${pack.caseTitle}`)
    .maybeSingle())

  if (existingCycle && !reset) {
    const existingPack = await must<any | null>('load existing board pack', service
      .from('board_packs')
      .select('id')
      .eq('governance_cycle_id', existingCycle.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle())
    const existingSession = existingPack
      ? await must<any | null>('load existing session', service
        .from('board_sessions')
        .select('id')
        .eq('board_pack_id', existingPack.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle())
      : null
    return {
      company_id: company.id,
      governance_cycle_id: existingCycle.id,
      board_pack_id: existingPack?.id ?? '',
      board_session_id: existingSession?.id ?? '',
      created: false,
    }
  }

  const memoryEntries = [
    ['fact', 'Arquetipo da empresa', pack.companyArchetype],
    ['goal', 'Problema de board', pack.boardProblem],
    ['plan', 'Pressao de decisao', pack.companySeed.decisionPressure],
    ['risk', 'Lacunas conhecidas', pack.companySeed.knownUnknowns.join('; ')],
    ['customer', 'Contexto estrategico', pack.companySeed.strategicContext],
    ['operations', 'Uso de treinamento', pack.trainingUse.join('; ')],
  ].map(([category, title, content]) => ({
    organization_id: organizationId,
    company_id: company.id,
    created_by: actorUserId,
    category,
    source_type: 'admin_note',
    title,
    content,
    confidence_score: 84,
    status: 'active',
    metadata: { training_pack_id: pack.id, source_urls: pack.sourceUrls },
  }))

  await must('insert training memory', service.from('company_brain_entries').insert(memoryEntries))

  const cycle = await must<any>('insert training cycle', service
    .from('governance_cycles')
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      title: `Training Pack - ${pack.caseTitle}`,
      cycle_type: 'diagnostic',
      period_start: addDays(0),
      period_end: addDays(30),
      status: 'board_pack',
      current_stage: 'board_pack',
      data_quality_score: 74,
      metadata: { training_pack_id: pack.id, source_urls: pack.sourceUrls },
    })
    .select('id')
    .single())

  await must('insert governance input', service.from('governance_inputs').insert({
    organization_id: organizationId,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    created_by: actorUserId,
    mode: 'admin_note',
    prompt: 'Training pack seed',
    content: `${pack.companyName}: ${pack.boardProblem}`,
    structured_data: pack,
    metadata: { training_pack_id: pack.id },
  }))

  const plan = await must<any>('insert business plan', service
    .from('business_plans')
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      status: 'ready_for_review',
      diagnosis: `${pack.companyName} precisa transformar ${asSentenceFragment(pack.companySeed.decisionPressure)} em uma decisao governavel, com evidencia minima, apetite de risco, responsavel e revisao.`,
      priorities: priorityRanking(pack),
      kpis: [
        { metric: 'Evidencias criticas fechadas', target: '80% antes da decisao' },
        { metric: 'Responsaveis definidos', target: '100% das frentes' },
        { metric: 'Gates financeiros', target: 'DRE, OCF e payback minimo' },
      ],
      workstreams: [
        { title: 'Evidencias', owner: 'Board Brain', cadence: 'semanal' },
        { title: 'Financeiro', owner: 'Finance Advisor', cadence: 'quinzenal' },
        { title: 'Execucao', owner: 'Operator Advisor', cadence: 'semanal' },
      ],
      timeline: { kickoff: addDays(0), first_review: addDays(14), decision_checkpoint: addDays(30) },
      risks: boardRisks(pack),
      assumptions: pack.companySeed.knownUnknowns,
      completeness_score: 78,
      quality_score: 76,
    })
    .select('id')
    .single())

  const advisorReports = advisors.map(([advisorKey, advisorName, focus]) => advisorReviewFor(pack, advisorKey, advisorName, focus))
  const boardPack = await must<any>('insert board pack', service
    .from('board_packs')
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      business_plan_id: plan.id,
      version: 1,
      status: 'ready',
      executive_summary: `${pack.companyName} e um pack de treinamento para testar ${pack.caseTitle}. O board deve focar em evidencia, risco, condicoes de aprovacao e memoria de decisao.`,
      strategic_questions: pack.boardQuestions,
      risk_map: boardRisks(pack),
      priority_ranking: priorityRanking(pack),
      meeting_agenda: [
        'Confirmar contexto e lacunas de evidencia',
        'Revisar DRE/P&L, OCF, unit economics e risco',
        'Ouvir dissensos dos advisors',
        'Definir decisao, condicoes, responsavel e revisao',
      ],
      decision_candidates: decisionCandidates(pack),
      export_payload: {
        training_pack_id: pack.id,
        source_references: sourceReferences(pack),
        financial_report: financialReport(pack),
        advisor_reports: advisorReports,
        usage_note: 'Pack publico de treinamento; nao contem texto proprietario de escolas de negocio.',
      },
    })
    .select('id')
    .single())

  const session = await must<any>('insert board session', service
    .from('board_sessions')
    .insert({
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      board_pack_id: boardPack.id,
      started_by: actorUserId,
      session_type: 'virtual_review',
      status: 'in_review',
      opened_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      closure_recommendation: 'commit_with_conditions',
      closure_summary: 'Pack pronto para avaliacao dos advisors e demo de decisao.',
      metadata: { training_pack_id: pack.id },
    })
    .select('id')
    .single())

  await must('insert advisor reviews', service.from('agent_reviews').insert(advisorReports.map((review) => ({
    organization_id: organizationId,
    company_id: company.id,
    governance_cycle_id: cycle.id,
    board_pack_id: boardPack.id,
    board_session_id: session.id,
    ...review,
  }))))

  const decisions = decisionCandidates(pack)
  const insertedDecisions = await must<any[]>('insert decisions', service
    .from('decisions')
    .insert(decisions.map((decision) => ({
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      board_session_id: session.id,
      created_by: actorUserId,
      user_id: actorUserId,
      title: decision.title,
      decision: decision.decision,
      status: 'candidate',
      closure_recommendation: 'commit_with_conditions',
      rationale: `Criado a partir do pack ${pack.id} para testar memoria de decisao.`,
      risks: pack.companySeed.knownUnknowns.join('; '),
      expected_outcome: 'Aumentar disciplina de decisao e qualidade do debate de board.',
      risk_level: decision.risk_level,
      confidence_score: decision.confidence_score,
      conditions: decision.conditions,
      owner_label: decision.owner_suggestion,
      owner: decision.owner_suggestion,
      review_date: addDays(30),
      metadata: { training_pack_id: pack.id },
    })))
    .select('id, title'))

  await must('insert follow ups', service.from('follow_ups').insert([
    {
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      decision_id: insertedDecisions[0]?.id ?? null,
      source_agent_key: 'finance',
      user_id: actorUserId,
      owner_label: 'Finance Advisor',
      owner: 'Finance Advisor',
      title: 'Montar DRE/P&L, OCF e unit economics minimos',
      action: 'Consolidar evidencia financeira antes da decisao.',
      description: pack.companySeed.knownUnknowns.join('; '),
      priority: 'high',
      status: 'open',
      due_date: addDays(7),
    },
    {
      organization_id: organizationId,
      company_id: company.id,
      governance_cycle_id: cycle.id,
      decision_id: insertedDecisions[0]?.id ?? null,
      source_agent_key: 'operator',
      user_id: actorUserId,
      owner_label: 'Operator Advisor',
      owner: 'Operator Advisor',
      title: 'Definir responsavel, cadencia e sinais de execucao',
      action: 'Transformar recomendacao em workstreams e checkpoints.',
      description: pack.companySeed.decisionPressure,
      priority: 'high',
      status: 'open',
      due_date: addDays(10),
    },
  ]))

  await service.from('audit_events').insert({
    organization_id: organizationId,
    company_id: company.id,
    actor_user_id: actorUserId,
    event_type: 'training_pack.company_seeded',
    entity_type: 'company',
    entity_id: company.id,
    metadata: { training_pack_id: pack.id, board_pack_id: boardPack.id, board_session_id: session.id },
  })

  return {
    company_id: company.id,
    governance_cycle_id: cycle.id,
    board_pack_id: boardPack.id,
    board_session_id: session.id,
    created: true,
  }
}
