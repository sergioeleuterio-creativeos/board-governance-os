import type { AdvisorKey } from '@/lib/shadow-board/domain'

export type AdvisorSourceReference = {
  name: string
  url: string
  use: string
  advisorFit: AdvisorKey[]
}

export type CompanyTrainingPack = {
  id: string
  companyName: string
  caseTitle: string
  geography: string
  sector: string
  companyArchetype: string
  sourceInstitutions: string[]
  sourceUrls: string[]
  boardProblem: string
  companySeed: {
    businessModel: string
    governanceStage: string
    strategicContext: string
    decisionPressure: string
    knownUnknowns: string[]
  }
  advisorStress: AdvisorKey[]
  boardQuestions: string[]
  trainingUse: string[]
}

export const ADVISOR_SOURCE_REFERENCES: AdvisorSourceReference[] = [
  {
    name: 'IBGC governance training map',
    url: 'docs/IBGC_AGENT_TRAINING.md',
    use: 'Base brasileira principal de governanca: limite do conselho, transicao para conselho consultivo, atas, risco, governanca de pessoas e disciplina de decisao.',
    advisorFit: ['board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent'],
  },
  {
    name: 'OECD/G20 Principles of Corporate Governance 2023',
    url: 'https://www.oecd.org/en/publications/g20-oecd-principles-of-corporate-governance-2023_ed750b30-en.html',
    use: 'Base global para estruturas de governanca, transparencia, responsabilidades do conselho, sustentabilidade, stakeholders e confianca do mercado de capitais.',
    advisorFit: ['board_brain', 'risk', 'finance'],
  },
  {
    name: 'COSO Enterprise Risk Management',
    url: 'https://www.coso.org/',
    use: 'Apetite de risco, ambiente de controles, linguagem de risco corporativo, responsavel por mitigacao e disciplina de escalacao.',
    advisorFit: ['risk', 'finance', 'operator'],
  },
  {
    name: 'UK FRC Corporate Governance Code 2024',
    url: 'https://www.frc.org.uk/library/standards-codes-policy/corporate-governance/uk-corporate-governance-code/',
    use: 'Lideranca do conselho, divisao de responsabilidades, sucessao, auditoria, risco, controles internos, remuneracao e disciplina de explicar desvios.',
    advisorFit: ['board_brain', 'risk', 'talent', 'finance'],
  },
  {
    name: 'NACD Directorship Certification',
    url: 'https://www.nacdonline.org/directorship-certification/',
    use: 'Postura de certificacao de conselheiros para estrategia, supervisao de riscos, operacao de governanca, disciplina fiduciaria e profissionalismo de conselho.',
    advisorFit: ['board_brain', 'risk', 'finance', 'talent'],
  },
  {
    name: 'INSEAD International Directors Programme',
    url: 'https://www.insead.edu/executive-education/corporate-governance/international-directors-programme',
    use: 'Educacao internacional de conselhos: efetividade, tomada de decisao, supervisao, desenvolvimento de conselheiros, leitura financeira, sustentabilidade e desafio construtivo da gestao.',
    advisorFit: ['board_brain', 'finance', 'risk', 'talent'],
  },
  {
    name: 'Institute of Directors Chartered Director Programme',
    url: 'https://www.iod.com/professional-development/chartered-director-programme/',
    use: 'Trilha de qualificacao de conselheiros focada em direcao da empresa, desempenho do conselho, competencia do conselheiro e pratica de sala de conselho.',
    advisorFit: ['board_brain', 'operator', 'talent', 'risk'],
  },
  {
    name: 'Fundacao Dom Cabral executive governance context',
    url: 'https://www.fdc.org.br/',
    use: 'Contexto brasileiro de educacao executiva para estrategia, lideranca, maturidade de governanca, transicoes familia/empresa e disciplina de implementacao.',
    advisorFit: ['board_brain', 'growth', 'operator', 'talent'],
  },
]

export const TRAINING_COMPANY_PACKS: CompanyTrainingPack[] = [
  {
    id: 'nyt-subscription-transformation',
    companyName: 'The New York Times Company',
    caseTitle: 'Assinatura digital e transformacao de redacao/produto',
    geography: 'Estados Unidos',
    sector: 'Noticias, midia e produtos de assinatura',
    companyArchetype: 'Empresa publica de midia historica migrando da dependencia de impresso/publicidade para escala de assinatura digital',
    sourceInstitutions: ['Materiais de relacoes com investidores da NYTCo', 'discussao publica do relatorio de inovacao', 'relatorios publicos da companhia'],
    sourceUrls: [
      'https://www.nytco.com/investors/',
      'https://www.nytimes.com/projects/2020-report/index.html',
    ],
    boardProblem: 'Uma empresa historica de midia precisa converter confianca, autoridade editorial e profundidade de produto em relacoes pagas duraveis, protegendo missao e credibilidade jornalistica.',
    companySeed: {
      businessModel: 'Assinaturas digitais e impressas, publicidade, licenciamento e produtos adjacentes.',
      governanceStage: 'Governanca de companhia aberta com influencia de proprietarios de longo prazo e transformacao de produto/redacao.',
      strategicContext: 'Crescimento de assinaturas cria novas demandas operacionais em produto, dados, editorial, experiencia do cliente e estrategia de bundles.',
      decisionPressure: 'Equilibrar investimento em produtos digitais e excelencia jornalistica com margem, retencao e confianca da marca.',
      knownUnknowns: ['Retencao por coorte', 'Rentabilidade dos bundles', 'Capacidade redacao/produto', 'Custo de aquisicao de assinantes', 'Risco de confianca da marca'],
    },
    advisorStress: ['growth', 'customer', 'finance', 'operator', 'talent'],
    boardQuestions: [
      'Quais comportamentos dos assinantes mostram habito duravel, e nao apenas aquisicao promocional?',
      'Como o board deve avaliar investimento em produto versus missao jornalistica e margem?',
      'Onde a lideranca precisa de novas capacidades operacionais para sustentar o modelo?',
    ],
    trainingUse: ['estrategia de assinaturas', 'tradeoff missao/economia', 'relatorios de companhia aberta'],
  },
  {
    id: 'netflix-content-cash-culture',
    companyName: 'Netflix',
    caseTitle: 'Investimento em conteudo, disciplina de caixa, cultura e escala global',
    geography: 'Estados Unidos / global',
    sector: 'Entretenimento por streaming',
    companyArchetype: 'Plataforma global influenciada por fundadores equilibrando crescimento, gasto em conteudo, cultura e geracao de caixa',
    sourceInstitutions: ['Materiais de investidores da Netflix', 'memo de cultura da Netflix', 'relatorios publicos da companhia'],
    sourceUrls: [
      'https://ir.netflix.net/financials/annual-reports-and-proxies/default.aspx',
      'https://jobs.netflix.com/culture',
    ],
    boardProblem: 'Uma empresa global de streaming precisa governar investimento em conteudo, crescimento de assinantes, precificacao, fluxo de caixa, cultura de lideranca e saturacao de mercado em um campo competitivo volatil.',
    companySeed: {
      businessModel: 'Streaming por assinatura, plano com publicidade, licenciamento de conteudo e propriedade intelectual global de entretenimento.',
      governanceStage: 'Companhia aberta madura com cultura de era fundadora e alta pressao de reinvencao estrategica.',
      strategicContext: 'A estrategia de crescimento depende de preco, qualidade do portfolio de conteudo, retencao, execucao regional e conversao de caixa.',
      decisionPressure: 'Decidir quando investir, reduzir gasto em conteudo, aumentar preco, acelerar publicidade ou priorizar caixa.',
      knownUnknowns: ['ROI de conteudo', 'Retencao regional', 'Economia do plano com publicidade', 'Conversao de caixa', 'Escalabilidade de talento/cultura'],
    },
    advisorStress: ['finance', 'growth', 'customer', 'talent', 'risk'],
    boardQuestions: [
      'Quais apostas de conteudo e produto precisam de gates de investimento no nivel de conselho?',
      'Como proteger a cultura sem transforma-la em desculpa para controles fracos?',
      'Qual apetite de risco e aceitavel para preco e expansao do plano com publicidade?',
    ],
    trainingUse: ['economia de plataforma', 'governanca de cultura', 'caixa versus crescimento'],
  },
  {
    id: 'boeing-737max-safety-governance',
    companyName: 'Boeing',
    caseTitle: 'Seguranca do 737 MAX, incentivos, controles e supervisao do board',
    geography: 'Estados Unidos / global',
    sector: 'Fabricacao aeroespacial',
    companyArchetype: 'Companhia industrial complexa de capital aberto com operacoes criticas de seguranca e dependencia regulatoria',
    sourceInstitutions: ['Investigacao publica do US House Transportation Committee', 'relatorios regulatorios publicos'],
    sourceUrls: [
      'https://democrats-transportation.house.gov/committee-activity/boeing-737-max-investigation',
    ],
    boardProblem: 'A companhia precisa reconciliar pressao comercial, qualidade de engenharia, supervisao de seguranca, delegacao regulatoria, incentivos executivos e escalacao de riscos.',
    companySeed: {
      businessModel: 'Fabricacao de avioes comerciais, defesa/aeroespaco, servicos e programas industriais de ciclo longo.',
      governanceStage: 'Companhia aberta madura com necessidade alta de controles e regulacao.',
      strategicContext: 'Cronograma, certificacao, cultura de seguranca, tradeoffs de engenharia e confianca regulatoria entram em colisao.',
      decisionPressure: 'Redefinir supervisao de riscos, reporte de seguranca, autoridade de engenharia, comites do board e desenho de incentivos.',
      knownUnknowns: ['Qualidade da escalacao de seguranca', 'Dissenso de engenharia', 'Alinhamento de incentivos', 'Confianca regulatoria', 'Lacunas de controle por programa'],
    },
    advisorStress: ['risk', 'operator', 'talent', 'finance'],
    boardQuestions: [
      'Que risco de seguranca nunca deve ser trocado por prazo ou margem?',
      'Quais controles provam que o dissenso de engenharia chega ao board antes da crise?',
      'Como incentivos devem mudar quando o risco operacional e existencial?',
    ],
    trainingUse: ['governanca de riscos', 'operacoes criticas de seguranca', 'falha de supervisao do board'],
  },
  {
    id: 'wework-governance-ipo-readiness',
    companyName: 'WeWork / The We Company',
    caseTitle: 'Controle do fundador, unit economics, direitos de governanca e prontidao para IPO',
    geography: 'Estados Unidos / global',
    sector: 'Escritorios flexiveis e servicos imobiliarios',
    companyArchetype: 'Empresa de hipercrescimento liderada por fundador enfrentando disciplina do mercado de capitais',
    sourceInstitutions: ['Arquivos da SEC', 'analises publicas de mercado', 'alvo de catalogo de escolas de negocio'],
    sourceUrls: [
      'https://www.sec.gov/edgar/browse/?CIK=1813756',
    ],
    boardProblem: 'Uma empresa de alto crescimento precisa separar narrativa do fundador de controles, direitos de governanca, unit economics, queima de caixa, risco de partes relacionadas e prontidao para mercado de capitais.',
    companySeed: {
      businessModel: 'Obrigacoes de aluguel de longo prazo convertidas em assinaturas flexiveis de escritorio e servicos corporativos de curto prazo.',
      governanceStage: 'Empresa privada em estagio avancado, controlada por fundador, tentando transicao para mercado publico.',
      strategicContext: 'A narrativa de crescimento e valuation supera a qualidade das evidencias sobre controles, margens, governanca e resiliencia.',
      decisionPressure: 'Decidir se pausa o IPO, redefine governanca, remove conflitos, reduz queima de caixa e prova unit economics.',
      knownUnknowns: ['Margem de contribuicao real', 'Pressao das obrigacoes de aluguel', 'Exposicao a partes relacionadas', 'Direitos de governanca', 'Runway de caixa'],
    },
    advisorStress: ['finance', 'risk', 'talent', 'growth'],
    boardQuestions: [
      'Quais protecoes ou conflitos do fundador tornam a empresa nao investivel?',
      'Que evidencia de unit economics deve preceder a aprovacao de crescimento?',
      'Onde eficiencia de capital deve prevalecer sobre ambicao de expansao?',
    ],
    trainingUse: ['governanca de fundador', 'prontidao para IPO', 'disciplina de capital'],
  },
  {
    id: 'uber-culture-controls',
    companyName: 'Uber',
    caseTitle: 'Cultura, lideranca, risco de plataforma e reset de controles',
    geography: 'Estados Unidos / global',
    sector: 'Plataforma de mobilidade',
    companyArchetype: 'Empresa de plataforma liderada por fundador em transicao de crescimento agressivo para governanca institucional',
    sourceInstitutions: ['Recomendacoes publicas de board/cultura', 'materiais da companhia'],
    sourceUrls: [
      'https://www.uber.com/newsroom/holder-recommendations/',
    ],
    boardProblem: 'Uma plataforma em escala precisa transformar problemas de cultura em governanca, accountability, comportamento de lideranca, controles, gestao de risco e confianca dos stakeholders.',
    companySeed: {
      businessModel: 'Economia de marketplace/plataforma em mobilidade, delivery, logistica e publicidade.',
      governanceStage: 'Empresa de alto crescimento saindo da cultura da era fundadora para gestao profissional e governanca de companhia aberta.',
      strategicContext: 'O crescimento comercial e limitado por cultura, risco juridico, pressao regulatoria e confianca com trabalhadores, usuarios e cidades.',
      decisionPressure: 'Redefinir lideranca, sistemas de gestao, reporte etico, compliance e guardrails de crescimento.',
      knownUnknowns: ['Confianca dos colaboradores', 'Exposicao regulatoria', 'Qualidade do reporte de incidentes', 'Accountability da lideranca', 'Rentabilidade por cidade'],
    },
    advisorStress: ['talent', 'risk', 'operator', 'customer'],
    boardQuestions: [
      'Quais comportamentos de lideranca agora sao riscos de governanca, e nao temas de RH?',
      'Quais controles precisam existir antes de entrar ou escalar um mercado?',
      'Como a supervisao do board deve medir confianca com motoristas, usuarios, cidades e colaboradores?',
    ],
    trainingUse: ['governanca de cultura', 'risco de plataforma', 'reset de lideranca'],
  },
  {
    id: 'meta-data-trust',
    companyName: 'Meta / Facebook',
    caseTitle: 'Confianca em dados, governanca de plataforma e risco de stakeholders',
    geography: 'Estados Unidos / global',
    sector: 'Plataforma social e publicidade digital',
    companyArchetype: 'Plataforma global controlada por fundador, com risco de dados, confianca, conteudo e regulacao',
    sourceInstitutions: ['Relatorio publico do Parlamento do Reino Unido', 'relatorios regulatorios/publicos', 'materiais publicos da companhia'],
    sourceUrls: [
      'https://publications.parliament.uk/pa/cm201719/cmselect/cmcumeds/1791/1791.pdf',
      'https://investor.fb.com/financials/default.aspx',
    ],
    boardProblem: 'Uma empresa de plataforma precisa governar praticas de dados, consequencias de conteudo, reputacao, poder de mercado, confianca publica e externalidades do modelo comercial.',
    companySeed: {
      businessModel: 'Plataforma social baseada em publicidade, mensagens, comercio, IA, VR/AR e ecossistemas de criadores.',
      governanceStage: 'Companhia aberta controlada por fundador, com escrutinio global de reguladores e stakeholders.',
      strategicContext: 'Crescimento e engajamento podem entrar em conflito com privacidade, confianca, integridade informacional e legitimidade de longo prazo.',
      decisionPressure: 'Definir apetite de risco para uso de dados, sistemas de IA/conteudo, segmentacao publicitaria e lancamentos de produto.',
      knownUnknowns: ['Qualidade do consentimento de dados', 'Erosao de confianca', 'Exposicao regulatoria', 'Lacunas de controle de IA/conteudo', 'Independencia do board'],
    },
    advisorStress: ['risk', 'customer', 'growth', 'operator'],
    boardQuestions: [
      'Quais metricas de produto devem ser limitadas por confianca e risco social?',
      'Que evidencia o board deve exigir antes de aprovar crescimento intensivo em dados?',
      'Como a governanca deve funcionar quando o controle do fundador limita a alavanca tradicional do board?',
    ],
    trainingUse: ['governanca de dados', 'risco de stakeholders', 'confianca de plataforma'],
  },
  {
    id: 'natura-sustainability-growth',
    companyName: 'Natura &Co',
    caseTitle: 'Crescimento sustentavel, modelo de stakeholders, complexidade de portfolio e disciplina de caixa',
    geography: 'Brazil / global',
    sector: 'Beleza, cuidados pessoais, venda direta e varejo',
    companyArchetype: 'Empresa brasileira orientada por valores enfrentando crescimento internacional e simplificacao de portfolio',
    sourceInstitutions: ['Relatorios integrados da companhia', 'referencias brasileiras de governanca', 'materiais publicos de investidores'],
    sourceUrls: [
      'https://ri.naturaeco.com/en/',
    ],
    boardProblem: 'Uma empresa orientada por valores precisa governar crescimento, confianca de stakeholders, compromissos ESG, complexidade de portfolio, mudanca de canais e disciplina financeira.',
    companySeed: {
      businessModel: 'Beleza e cuidados pessoais em venda direta, varejo, ecommerce e marcas internacionais.',
      governanceStage: 'Companhia aberta com identidade stakeholder/ESG e complexidade internacional de portfolio.',
      strategicContext: 'Proposito e compromissos de sustentabilidade precisam coexistir com caixa, margem, simplificacao e foco de crescimento.',
      decisionPressure: 'Priorizar portfolio, canais, disciplina de divida/caixa, prova ESG e foco operacional.',
      knownUnknowns: ['ROI do portfolio de marcas', 'Economia de canais', 'Capital de giro', 'Metricas de prova ESG', 'Capacidade da lideranca'],
    },
    advisorStress: ['growth', 'finance', 'risk', 'customer', 'talent'],
    boardQuestions: [
      'Quais compromissos de sustentabilidade sao ativos estrategicos versus promessas sem financiamento?',
      'Quais escolhas de portfolio simplificam execucao e conversao de caixa?',
      'Como o board deve medir confianca de stakeholders junto da recuperacao financeira?',
    ],
    trainingUse: ['governanca ESG/stakeholders', 'complexidade de portfolio', 'companhia aberta brasileira'],
  },
  {
    id: 'magalu-digital-marketplace',
    companyName: 'Magazine Luiza / Magalu',
    caseTitle: 'Transformacao digital do varejo, expansao de marketplace e disciplina de rentabilidade',
    geography: 'Brazil',
    sector: 'Varejo, ecommerce, marketplace, fintech e servicos',
    companyArchetype: 'Varejista brasileira se transformando em ecossistema de comercio digital',
    sourceInstitutions: ['Materiais de investidores da companhia', 'alvo de caso de escola de negocio brasileira', 'relatorios publicos de mercado'],
    sourceUrls: [
      'https://ri.magazineluiza.com.br/',
    ],
    boardProblem: 'Um varejista precisa governar o tradeoff entre crescimento digital, escala de marketplace, logistica, fintech/servicos, capital de giro e rentabilidade em mercado volatil.',
    companySeed: {
      businessModel: 'Varejo omnichannel, ecommerce, marketplace, logistica, publicidade, fintech/servicos e lojas fisicas.',
      governanceStage: 'Companhia aberta brasileira com legado familiar/fundador, gestao profissional e estrategia de ecossistema.',
      strategicContext: 'A transformacao digital aumenta opcionalidade de crescimento, mas tambem complexidade, necessidade de capital e pressao de margem.',
      decisionPressure: 'Definir gates de alocacao de capital em marketplace, logistica, servicos, rede de lojas, tecnologia e capital de giro.',
      knownUnknowns: ['Unit economics do marketplace', 'Ciclo de capital de giro', 'Custo logistico de atendimento', 'Risco de credito', 'Concentracao por categoria'],
    },
    advisorStress: ['finance', 'operator', 'growth', 'customer', 'risk'],
    boardQuestions: [
      'Quais iniciativas de crescimento merecem capital durante pressao de margem?',
      'Como o board deve separar valor estrategico de ecossistema de complexidade operacional?',
      'Quais gates de capital de giro e risco de credito devem limitar a expansao?',
    ],
    trainingUse: ['transformacao digital brasileira', 'economia de marketplace', 'capital de giro'],
  },
  {
    id: 'petrobras-pasadena-governance',
    companyName: 'Petrobras',
    caseTitle: 'Pasadena, alocacao de capital, qualidade da informacao, controles e accountability',
    geography: 'Brazil / United States',
    sector: 'Oleo, gas, energia e governanca de empresa estatal',
    companyArchetype: 'Grande empresa estrategica com participacao estatal, exposicao politica e decisoes intensivas em capital',
    sourceInstitutions: ['Referencias de treinamento IBGC', 'materiais publicos de investidores', 'discussao publica de supervisao/auditoria'],
    sourceUrls: [
      'https://www.petrobras.com.br/en/investors',
    ],
    boardProblem: 'Uma grande decisao de alocacao de capital expoe qualidade de diligencia, controles, influencia politica, accountability, assimetria de informacao e disciplina de desafio do board.',
    companySeed: {
      businessModel: 'Oleo, gas, refino, distribuicao e infraestrutura de energia integrados.',
      governanceStage: 'Companhia aberta com participacao estatal, relevancia estrategica nacional e alta exposicao de integridade/risco.',
      strategicContext: 'Decisoes de alocacao de capital podem ser distorcidas por informacao incompleta, contexto politico e baixo desafio.',
      decisionPressure: 'Definir padroes de informacao para o board, gates de investimento, registro de dissenso, controles de partes relacionadas e revisao pos-investimento.',
      knownUnknowns: ['Qualidade da due diligence', 'Premissas de valuation', 'Fragilidades de controle', 'Pressao politica', 'Cadeia de accountability'],
    },
    advisorStress: ['finance', 'risk', 'board_brain', 'operator'],
    boardQuestions: [
      'Que informacao deve ser obrigatoria antes de um grande investimento irreversivel?',
      'Como dissenso e condicoes devem ser registrados antes da aprovacao?',
      'Qual revisao pos-decisao revelaria se a governanca funcionou?',
    ],
    trainingUse: ['alocacao de capital', 'governanca de estatal', 'controles de investimento'],
  },
]

export const BOARD_CASE_LIBRARY = TRAINING_COMPANY_PACKS.map((pack) => ({
  id: pack.id,
  title: `${pack.companyName} - ${pack.caseTitle}`,
  sourceInstitution: pack.sourceInstitutions.join(' / '),
  publicSources: pack.sourceUrls,
  boardProblem: pack.boardProblem,
  advisorStress: pack.advisorStress,
  companySeed: pack.companySeed,
  boardQuestions: pack.boardQuestions,
  trainingUse: pack.trainingUse,
}))
