export const companyContext = {
  founder: 'Lucas Mares',
  company: 'Nuveo Logistica',
  period: 'FY26 - Q2',
  nextMeeting: 'Thu 28 Jun - 09:00',
  principle: 'Advisory input becomes decisions, owners, memory, and follow-through - not more advice to forget.',
}

export const advisors = [
  {
    code: 'BB',
    shortName: 'Board Brain',
    name: 'Board Brain',
    scope: 'Orchestrator - synthesis',
    color: '#C4922F',
    status: 'SYNTHESIZING',
    statusColor: '#A8772A',
  },
  {
    code: 'FN',
    shortName: 'Finance',
    name: 'Finance Advisor',
    scope: 'Cash - ROI - margin',
    color: '#3E6B4F',
    status: 'DONE',
    statusColor: '#3E6B4F',
  },
  {
    code: 'OP',
    shortName: 'Operator',
    name: 'Operator Advisor',
    scope: 'Execution - cadence',
    color: '#4A5A6A',
    status: 'DONE',
    statusColor: '#3E6B4F',
  },
  {
    code: 'GR',
    shortName: 'Growth',
    name: 'Growth Advisor',
    scope: 'Sales - market',
    color: '#2F6E6A',
    status: 'DISSENT',
    statusColor: '#A23B2D',
  },
  {
    code: 'RK',
    shortName: 'Risk',
    name: 'Risk Advisor',
    scope: 'Governance - downside',
    color: '#A23B2D',
    status: 'DONE',
    statusColor: '#3E6B4F',
  },
  {
    code: 'CU',
    shortName: 'Customer',
    name: 'Customer Advisor',
    scope: 'Retention - demand',
    color: '#7A4E63',
    status: 'REVIEW',
    statusColor: '#A8772A',
  },
  {
    code: 'TL',
    shortName: 'Talent',
    name: 'Talent Advisor',
    scope: 'Leadership - hiring',
    color: '#85702F',
    status: 'QUEUED',
    statusColor: '#8A8478',
  },
] as const

export const metrics = [
  { label: 'Indice de risco', value: '68', detail: '/ 100 - elevado', delta: '+4', tone: 'critical' },
  { label: 'Confianca do plano', value: '74', detail: '/ 100 - solida', delta: '+6', tone: 'positive' },
  { label: 'Decisoes abertas', value: '9', detail: '3 aguardando voce', tone: 'neutral' },
  { label: 'Follow-ups atrasados', value: '4', detail: '2 criticos', tone: 'caution' },
] as const

export const decisionQueue = [
  {
    id: 'DEC-118',
    title: 'Pause Sao Paulo hub expansion for one quarter',
    detail: 'Board synthesis ready - 5 advisors aligned, Growth dissents',
    tag: 'HIGH IMPACT',
    tone: 'critical',
  },
  {
    id: 'DEC-117',
    title: 'Move to usage-based pricing for enterprise tier',
    detail: 'Awaiting your approval - Finance + Customer aligned',
    tag: 'REVENUE',
    tone: 'caution',
  },
  {
    id: 'DEC-115',
    title: 'Hire a VP of Operations before Q4',
    detail: 'Deep-dive requested - Talent + Operator advisors',
    tag: 'TALENT',
    tone: 'neutral',
  },
] as const

export const followUps = [
  { action: 'Validate Q2 cash runway model', owner: 'Finance', due: '11d overdue', source: 'DEC-114', tone: 'critical' },
  { action: 'Confirm warehouse lease terms', owner: 'Risk', due: '6d overdue', source: 'DEC-110', tone: 'critical' },
  { action: 'Set churn baseline for enterprise', owner: 'Customer', due: 'in 2 days', source: 'DEC-116', tone: 'caution' },
  { action: 'Draft VP Ops role profile', owner: 'CEO', due: 'in 9 days', source: 'DEC-115', tone: 'neutral' },
] as const

export const memoryStats = [
  ['Facts', '412'],
  ['Goals', '18'],
  ['Financials', '96'],
  ['Risks', '23'],
  ['Files', '147'],
  ['Decisions', '118'],
] as const

export const memoryTimeline = [
  {
    code: 'FIN',
    title: 'Q1 revenue closed at R$4.2M, 8% below plan',
    detail: 'Margin held at 31%. Shortfall concentrated in enterprise logistics segment.',
    source: 'Q1 close.xlsx',
    status: 'CONFIRMED',
    age: '2d ago',
  },
  {
    code: 'RSK',
    title: 'Top customer is 34% of revenue',
    detail: 'Concentration risk flagged by Risk Advisor. No contractual lock-in beyond 6 months.',
    source: 'DERIVED',
    status: 'ACTIVE RISK',
    age: '3d ago',
  },
  {
    code: 'GOL',
    title: 'Reach R$30M ARR by end of FY27',
    detail: 'Founder-set North Star. Implies 2.1x growth; flagged aggressive by Growth Advisor.',
    source: 'FOUNDER INPUT',
    status: 'NORTH STAR',
    age: '1w ago',
  },
  {
    code: 'DEC',
    title: 'Closed: kept in-house fleet vs. 3PL',
    detail: 'DEC-109 rationale linked. Review date set for Sep 2026.',
    source: 'DECISION MEMORY',
    status: 'CLOSED',
    age: '2w ago',
  },
] as const

export const unresolvedQuestions = [
  'What is the real CAC by channel?',
  'Who owns the warehouse lease renewal?',
  'Is the second hub decision reversible?',
] as const

export const ingestedFiles = [
  ['XLS', 'Q1 close.xlsx', '62 facts extracted'],
  ['PDF', 'Board deck Mar 2026.pdf', '28 facts extracted'],
  ['DOC', 'Ops review notes.docx', '19 facts extracted'],
] as const

export const workstreams = [
  ['Land 3 mid-market accounts', '<25% top-customer share', 'Growth lead', 'Q2-Q3'],
  ['Renegotiate fleet financing', '+5mo runway', 'Finance / CEO', 'Q2'],
  ['Weekly ops review ritual', '100% KPI coverage', 'VP Ops (TBH)', 'Q3'],
] as const

export const boardPackQuestions = [
  'Should we cap exposure to our largest customer even at the cost of near-term revenue?',
  'Is the Sao Paulo hub the right use of capital before runway is secured?',
  'What governance must exist before the founder hires a VP of Operations?',
] as const

export const financialReportSections = [
  {
    title: 'Demonstração de resultados / DRE',
    rows: [
      ['Receita líquida', 'R$4.2M', '-8% vs. plano', 'Shortfall concentrated in enterprise logistics'],
      ['Margem bruta', '31%', 'stable', 'Unit economics holding in core segment'],
      ['EBITDA ajustado', 'R$420k', '10.0% margin', 'Pressure expected if hub spend accelerates'],
    ],
  },
  {
    title: 'Profit & Loss bridge',
    rows: [
      ['Gross profit', 'R$1.3M', '31% margin', 'Fleet costs remain main sensitivity'],
      ['Operating expenses', 'R$880k', '+12% QoQ', 'Hiring and hub preparation explain variance'],
      ['Net operating result', 'R$220k', '5.2% margin', 'Positive, but fragile after financing costs'],
    ],
  },
  {
    title: 'Operating Cash Flow / OCF',
    rows: [
      ['Cash runway', '6.8 months', 'below 12-month target', 'Board threshold not met'],
      ['Working capital cycle', '48 days', '+6 days QoQ', 'Receivables discipline needed'],
      ['Debt service coverage', '1.4x', 'watchlist', 'Fleet renegotiation is board-relevant'],
    ],
  },
] as const

export const boardFinancialMetrics = [
  ['Revenue concentration', '34%', 'Critical: top customer exposure'],
  ['Runway target gap', '5.2 months', 'Need to reach 12-month comfort line'],
  ['Capex at risk', 'R$1.8M', 'Sao Paulo hub commitment before VP Ops'],
  ['Decision sensitivity', 'High', 'Hub timing depends on cash and owner capacity'],
] as const

export const structuredAdvisorReports = [
  {
    code: 'FN',
    title: 'Finance Advisor report',
    stance: 'Aprovar com condicoes',
    finding: 'Hub expansion should not proceed until runway is above 12 months and customer concentration is under 25%.',
    questions: ['What is the monthly cash burn after hub capex?', 'Which financing terms are negotiable this quarter?'],
    recommendations: ['Freeze discretionary hub spend', 'Produce a 13-week cash forecast', 'Review gross margin by customer cohort'],
  },
  {
    code: 'OP',
    title: 'Operator Advisor report',
    stance: 'Aprovar com gates de responsavel',
    finding: 'Execution capacity is the binding constraint; founder remains too central to operating loops.',
    questions: ['Which weekly cadence exposes delays early?', 'Who owns VP Ops hiring before the next review?'],
    recommendations: ['Instalar revisao semanal de KPIs', 'Definir scorecard do VP Ops', 'Atribuir um responsavel por frente'],
  },
  {
    code: 'RK',
    title: 'Risk Advisor report',
    stance: 'Request evidence gate',
    finding: 'Revenue concentration and runway create compounding downside if expansion starts too early.',
    questions: ['What happens if the largest customer churns during hub build?', 'Which decision is reversible?'],
    recommendations: ['Limitar concentracao a 25%', 'Adicionar datas de revisao a toda decisao material', 'Documentar gatilhos de downside'],
  },
] as const

export const riskMap = [
  ['Customer concentration', 'High', 'Likely'],
  ['Cash runway', 'High', 'Possible'],
  ['Key-person dependency', 'Medium', 'Likely'],
] as const

export const reviewNotes = [
  ['FN', 'Finance', 'Aligned', 'Hub spend before runway is secured is reckless. Pause and protect 12 months of cash.'],
  ['GR', 'Growth', 'Dissents', 'Pausing the hub cedes the Sao Paulo corridor to a competitor. The concentration cure cannot kill growth.'],
  ['RK', 'Risk', 'Aligned', 'A single-customer loss during hub build is an extinction event. Cap exposure at 25% first.'],
  ['OP', 'Operator', 'Aligned', 'No VP Ops, no cadence - we cannot execute a hub build cleanly today regardless of capital.'],
  ['CU', 'Customer', 'Reviewing', 'Retention in core SMB is strong; the diversification story is credible to those buyers.'],
  ['TL', 'Talent', 'Queued', 'Awaiting hiring-plan inputs before assessing VP Ops timing.'],
] as const

export const decisionLedger = [
  ['DEC-118', 'Pause Sao Paulo hub expansion', 'Awaiting approval - linked to DEC-109, DEC-112', 'SELECTED'],
  ['DEC-116', 'Limitar exposicao a um unico cliente a 25%', 'Responsavel: Finance - revisao Dez 2026', 'APROVADA'],
  ['DEC-114', 'Raise a bridge round this quarter', 'Rationale: dilution before traction milestones', 'REJECTED'],
  ['DEC-109', 'Keep in-house fleet vs. 3PL', 'Review date reached - revisit with current data', 'REVIEW DUE'],
] as const
