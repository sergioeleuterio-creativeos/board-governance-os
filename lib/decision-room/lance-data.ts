import type {
  BoardAgent,
  BoardBrief,
  BoardTurn,
  DecisionRecord,
  DecisionRoomReadout,
  ExecutionOutput,
  FollowUp,
  SessionType,
  StrategyDiagnosis,
  StudioAgent,
} from './types'

export const lanceBoardAgents: BoardAgent[] = [
  {
    code: 'BB',
    short: 'Board Brain',
    role: 'Board Brain / Presidente da sala',
    color: '#C4922F',
    angle: 'Transforma a conversa em uma decisão clara, com trade-offs, condições e memória.',
    evidence: 'Pre-work, transcrição, Dreamboard, reset estratégico e lacunas de dados.',
    pressure: 'Qual decisão precisa sair da sala, e o que ainda não pode ser afirmado?',
  },
  {
    code: 'CEO',
    short: 'CEO Operador',
    role: 'CEO Operador',
    color: '#4A5A6A',
    angle: 'O que muda na segunda-feira se o LANCE! escolher esse jogo?',
    evidence: 'Apresentação de Gustavo Mota, estrutura comercial, canais e prioridades de 12 meses.',
    pressure: 'Isso vira rotina comercial, produto, pauta e cadência executiva?',
  },
  {
    code: 'CFO',
    short: 'CFO / Capital',
    role: 'CFO / Investidor',
    color: '#3E6B4F',
    angle: 'Distingue narrativa estratégica de economia real.',
    evidence: 'Receita por produto, margem por formato, pipeline, CAC comercial e custo de entrega.',
    pressure: 'Qual aposta cria receita de qualidade sem virar customização cara demais?',
  },
  {
    code: 'CMO',
    short: 'CMO / Marca',
    role: 'CMO / Marca e posicionamento',
    color: '#7A4E63',
    angle: 'Define a memória que o mercado precisa repetir sobre o LANCE!.',
    evidence: 'Dreamboard, reset de posicionamento, percepção de agências e proposta comercial.',
    pressure: 'Uma agência consegue repetir por que o LANCE! deve entrar no plano antes do RFP?',
  },
  {
    code: 'MDA',
    short: 'Mídia & Agências',
    role: 'CMO / Planejamento de mídia e agências',
    color: '#6A5B8E',
    angle: 'Testa se a tese entra no ritual real de planejamento das agências.',
    evidence: 'Relações com agências, cases Rexona, Guaraná, Uber, Flying Fish e categorias compradoras.',
    pressure: 'O que faz o LANCE! ser chamado antes da verba estar decidida?',
  },
  {
    code: 'CRO',
    short: 'CRO / Receita',
    role: 'CRO / Vendas consultivas',
    color: '#2F6E6A',
    angle: 'Converte posicionamento em oferta, pipeline, objeções e sequência comercial.',
    evidence: 'Sales Ops, grandes contas, projetos especiais, mídia, creators e branded content.',
    pressure: 'Isso muda o pitch ou só renomeia o inventário?',
  },
  {
    code: 'PRD',
    short: 'Produto / Audiência',
    role: 'Produto / Audiência e comunidades',
    color: '#51789B',
    angle: 'Conecta site, app, WhatsApp, newsletter, YouTube, creators e dados em produto.',
    evidence: 'Ecossistema apresentado por Gustavo: site, redes, WhatsApp por clube, app, newsletter e Cria Labs.',
    pressure: 'Que parte da audiência vira inteligência proprietária, não apenas distribuição?',
  },
  {
    code: 'CAT',
    short: 'Categoria / Sports Media',
    role: 'Especialista de categoria / mídia esportiva',
    color: '#85702F',
    angle: 'Compara o LANCE! com players de mídia, plataformas, creators, clubes e comunidades.',
    evidence: 'Padrões de Bloomberg, Spotify, SportRadar, mídia esportiva e compra publicitária.',
    pressure: 'Qual território é defensável contra Globo, plataformas, creators e inventário genérico?',
  },
  {
    code: 'CRM',
    short: 'CRM / Comunidade',
    role: 'CMO / CRM, dados e comunidade',
    color: '#8A4F3D',
    angle: 'Transforma relacionamento com torcedores em ativo recorrente para marcas.',
    evidence: 'Newsletter, app, WhatsApp, comportamento por clube, recência e sinais de comunidade.',
    pressure: 'Que dado precisa ser coletado para vender inteligência, não só audiência?',
  },
]

export const lanceStudioAgents: StudioAgent[] = [
  { code: 'SC', name: 'Strategy Core', desc: 'Reframe estratégico, tensão central e perguntas de decisão.' },
  { code: 'BE', name: 'Brief Engine', desc: 'Briefs por papel, sem deixar os agentes falarem no vazio.' },
  { code: 'CP', name: 'Campaign Planner', desc: 'Traduz a tese em motion de agência, eventos e calendário comercial.' },
  { code: 'SN', name: 'Sales Narrative Builder', desc: 'Reconstrói a narrativa de vendas e as objeções de mídia.' },
  { code: 'RE', name: 'Research / Evidence', desc: 'Separa o que está confirmado, derivado, parcial ou faltando.' },
  { code: 'MW', name: 'Memo Writer', desc: 'Gera memo, ata, decisões, perguntas abertas e próximos passos.' },
  { code: 'PM', name: 'Project Manager', desc: 'Transforma decisões em donos, prazos, dependências e revisões.' },
]

export const lanceSessionTypes: SessionType[] = [
  { id: 'problem', code: 'PB', name: 'Problem Build', tag: 'Nomear o problema real', desc: 'Quando o desafio ainda está amplo demais para virar decisão.', outputs: ['Problema declarado vs. inferido', 'Tensões', 'Perguntas de decisão'] },
  { id: 'hotseat', code: 'HS', name: 'Hot Seat', tag: 'Pressão executiva sobre a escolha', desc: 'Coloque a tese do LANCE! sob pressão de marca, mídia, receita, produto e categoria.', outputs: ['Concordâncias e divergências', 'Pedidos de dados', 'Caminho recomendado'], primary: true },
  { id: 'prep', code: 'BP', name: 'Board Prep', tag: 'Antes de uma reunião real', desc: 'Prepare a conversa com conselho, sócios, liderança comercial ou agência-chave.', outputs: ['Memo do conselho', 'Perguntas prováveis', 'Pontos frágeis'] },
  { id: 'reset', code: 'SR', name: 'Strategy Reset', tag: 'Reposicionar o jogo', desc: 'Reposicionamento, oferta comercial, narrativa de vendas, produto e dados.', outputs: ['Diagnóstico', 'Opções estratégicas', 'Plano operacional'] },
  { id: 'campaign', code: 'CT', name: 'Teste de campanha', tag: 'Depois que há uma direção', desc: 'Estresse uma campanha B2B ou narrativa para agências e CMOs.', outputs: ['Crítica da campanha', 'Riscos de mensagem', 'Territórios aprimorados'] },
  { id: 'review', code: 'DR', name: 'Revisão de decisão', tag: 'Depois de executar', desc: 'Revisite uma decisão para separar o que se sustentou do que precisa mudar.', outputs: ['O que mudou', 'Evidências novas', 'Continuar / ajustar / parar'] },
]

export const lanceDiagnosis: StrategyDiagnosis = {
  statedProblem: 'Como o LANCE! deve reposicionar sua operação comercial e editorial para voltar a ser lembrado cedo por grandes marcas e agências?',
  inferredProblem: 'A decisão real não é apenas “crescer audiência” ou “falar com jovens”. É escolher se o LANCE! continuará sendo vendido como veículo esportivo ou se organizará seus ativos como uma plataforma de inteligência e ativação do torcedor brasileiro.',
  tension: {
    a: 'O mercado ainda tende a comprar mídia, inventário e alcance de forma comparável.',
    b: 'O ativo mais defensável do LANCE! parece ser contexto, credibilidade, comunidades, dados e capacidade de cocriar relevância no esporte.',
  },
  frames: [
    { title: 'Veículo esportivo com alcance', detail: 'Mantém o jogo conhecido: audiência, formatos e inventário. Fácil de vender, mas fácil de comparar.', selected: false },
    { title: 'Sports-fan intelligence e ativação', detail: 'Transforma conhecimento do torcedor em produto estratégico para marcas e agências.', selected: true },
    { title: 'Marca jovem de conteúdo esportivo', detail: 'Resolve parte da renovação de audiência, mas pode subestimar o comprador B2B que decide orçamento.', selected: false },
    { title: 'Estúdio de projetos especiais', detail: 'Aproveita flexibilidade e cases, mas precisa de arquitetura comercial para não virar customização infinita.', selected: false },
  ],
  evidenceMap: [
    { claim: 'Gustavo Mota apresentou um ecossistema com site, redes sociais, WhatsApp, app, newsletter, YouTube e Cria Labs.', source: 'Transcrição / apresentação do CEO', status: 'CONFIRMADO' },
    { claim: 'O LANCE! relata 25 milhões de pessoas no ecossistema e 80 milhões em redes no período citado.', source: 'Transcrição / ComScore citado na sessão', status: 'PARCIAL' },
    { claim: 'O desafio recorrente é ser lembrado cedo nas mesas de grandes marcas e agências.', source: 'Transcrição / pergunta central de Mota', status: 'CONFIRMADO' },
    { claim: 'Dreamboard apontou a pergunta “o que só o LANCE! consegue entregar?” como centro da decisão.', source: 'Dreamboard LANCE!', status: 'CONFIRMADO' },
    { claim: 'Projetos com Rexona, Guaraná, Uber, Budweiser, Betano, Caixa, Disney+ e Flying Fish foram citados como sinais de capacidade criativa e comercial.', source: 'Transcrição / cases citados', status: 'PARCIAL' },
    { claim: 'Não há ainda DRE por produto, margem por formato, pipeline por categoria, taxa de conversão comercial ou pesquisa estruturada com agências dentro da sala.', source: 'Lacuna de Company Brain', status: 'FALTANDO' },
  ],
  recommendedQuestion: 'O LANCE! deve ser vendido como veículo de mídia esportiva ou como plataforma de inteligência e ativação do torcedor brasileiro?',
  decisionQuestions: [
    'O LANCE! deve ser vendido como veículo de mídia esportiva ou como plataforma de inteligência e ativação do torcedor brasileiro?',
    'Qual oferta deve liderar a conversa com agências: alcance, projetos especiais ou Fan Intelligence?',
    'Que dados mínimos o LANCE! precisa coletar para sustentar a tese de inteligência proprietária?',
    'Quais categorias de anunciantes devem ser priorizadas nos próximos 90 dias?',
    'O que deve mudar no sales deck para o LANCE! entrar antes do RFP?',
  ],
  confidence: 76,
  missingContext: [
    'Receita e margem por produto: mídia, branded content, projetos especiais, app, newsletter, YouTube, creators e dados.',
    'Pipeline por categoria, agência, estágio e ticket médio.',
    'Pesquisa rápida com agências: por que lembram ou não lembram do LANCE! no planejamento?',
    'Casos com problema de negócio, mecanismo LANCE!, resultado e aprendizado reutilizável.',
    'Dados de audiência por canal, recência, clube, modalidade, cadastro e comportamento recorrente.',
  ],
}

export const lanceBoardBrief: BoardBrief = {
  boardBrief: 'A sala deve decidir que jogo comercial o LANCE! vai jogar. O ponto não é escolher uma frase bonita. É definir se a empresa continua vendendo mídia comparável ou se transforma sua combinação de marca, conteúdo, comunidades, creators, app, WhatsApp, newsletter e dados em uma oferta de inteligência e ativação para marcas e agências.',
  roleBriefs: lanceBoardAgents.map(agent => ({
    code: agent.code,
    angle: agent.angle,
    evidence: agent.evidence,
    pressure: agent.pressure,
  })),
}

export const lanceTranscript: BoardTurn[] = [
  {
    code: 'BB',
    text: 'Contexto da sala: Gustavo Mota apresentou o LANCE! como uma marca nacional de quase 30 anos, com site, social, WhatsApp, app, newsletter, YouTube, creators e projetos especiais. A pergunta não é se existe ativo. Existe. A pergunta é qual desses ativos vira uma proposta que o mercado compra antes da verba estar decidida.',
    tag: 'ENQUADRA A SALA',
    synth: {
      agreements: ['O LANCE! tem ativos suficientes para uma tese maior que “portal esportivo”.'],
      risks: ['Sem escolha de território, os ativos continuam parecendo uma lista de formatos.'],
    },
  },
  {
    code: 'CEO',
    text: 'Se a decisão for “plataforma de inteligência e ativação”, segunda-feira muda o briefing interno. Comercial para de abrir com inventário. Produto precisa organizar sinais de torcedor. Editorial precisa alimentar territórios de interesse. E liderança precisa escolher categorias prioritárias, não tentar vender tudo para todos.',
    tag: 'OPERACIONALIZA',
    synth: {
      agreements: ['A decisão precisa mudar comercial, produto, editorial e cadência executiva.'],
      risks: ['Sem prioridade por categoria, a tese vira posicionamento sem operação.'],
    },
  },
  {
    code: 'CMO',
    text: 'Marca: “LANCE! fala de esporte” é memória ampla, mas fraca para compra. “LANCE! entende o torcedor brasileiro melhor que qualquer veículo” é uma tese mais defensável. Só que ela precisa ser provada com linguagem, casos, dados e repetição. Hoje a oportunidade é transformar reconhecimento histórico em ponto de vista comercial.',
    tag: 'REFRAME DE MARCA',
    synth: {
      agreements: ['A memória comercial deve sair de alcance e ir para entendimento do torcedor.'],
      disagreements: ['Reconhecimento de marca não equivale a consideração em planejamento de mídia.'],
    },
  },
  {
    code: 'MDA',
    text: 'Agências não compram só porque a história é boa. Elas precisam de uma razão para chamar o LANCE! antes do RFP. Fan Intelligence pode cumprir esse papel se virar ritual: briefing trimestral, mapas por categoria, oportunidades por calendário esportivo e formatos que a agência consiga levar ao cliente como ideia, não como linha de mídia.',
    tag: 'TESTA AGÊNCIAS',
    synth: {
      agreements: ['A oferta precisa entrar no ritual de planejamento das agências.'],
      risks: ['Se o LANCE! aparecer apenas depois do briefing pronto, continuará disputando sobra de verba.'],
    },
  },
  {
    code: 'CRO',
    text: 'Venda: projetos especiais são um sinal forte, mas ainda parecem exceção. A decisão deve transformar isso em produto comercial: problema do cliente, insight de torcedor, mecanismo LANCE!, formatos, entrega e métrica. Sem essa arquitetura, “fazemos qualquer coisa” vira flexibilidade cara e difícil de escalar.',
    tag: 'ARQUITETURA DE RECEITA',
    synth: {
      agreements: ['Projetos especiais precisam virar oferta repetível.'],
      risks: ['Customização sem margem e sem método pode consumir energia comercial demais.'],
    },
  },
  {
    code: 'PRD',
    text: 'Produto: site, app, WhatsApp, newsletter, YouTube e creators não devem ser tratados como canais soltos. A tese de inteligência exige uma camada de dados: quem é o torcedor, qual clube segue, que modalidade acompanha, quando muda comportamento, que conteúdo salva, que comunidade mobiliza. Sem isso, vendemos distribuição. Com isso, começamos a vender conhecimento.',
    tag: 'DADOS E PRODUTO',
    synth: {
      agreements: ['O ecossistema precisa virar memória proprietária de comportamento.'],
      risks: ['Sem dados estruturados, “inteligência” vira promessa narrativa.'],
    },
  },
  {
    code: 'CAT',
    text: 'Categoria: o LANCE! não ganha tentando ser uma Globo menor, uma plataforma social menor ou um creator network genérico. O território defensável é combinar autoridade editorial, conhecimento de torcida e execução flexível. Esse território só funciona se a empresa recusar competir apenas por velocidade, CPM ou volume bruto.',
    tag: 'PADRÃO DE CATEGORIA',
    synth: {
      agreements: ['O território defensável combina autoridade, comunidade e flexibilidade.'],
      disagreements: ['Competir só por alcance coloca o LANCE! em comparação ruim com plataformas maiores.'],
    },
  },
  {
    code: 'CFO',
    text: 'Financeiro: eu aprovaria a tese, mas com gates. Precisamos ver margem por produto, custo de projetos especiais, receita recorrente por categoria, taxa de conversão de agência e payback de construir Fan Intelligence. Se esses números não existirem, a sala pode aprovar uma fase de validação, não uma escala ampla.',
    tag: 'CONDICIONA ESCALA',
    synth: {
      agreements: ['A tese pode avançar como validação com gates claros.'],
      risks: ['Sem margem por produto e custo de entrega, a empresa pode vender uma oferta bonita e pouco rentável.'],
    },
  },
  {
    code: 'CRM',
    text: 'CRM e comunidade: o ativo mais subestimado pode estar nos canais com relação direta: WhatsApp por clube, newsletter, app e check-in via Arquiva. Esses canais podem mostrar recência, intensidade, clube, modalidade e momento de vida do torcedor. É aqui que a tese deixa de ser mídia e começa a parecer inteligência proprietária.',
    tag: 'COMUNIDADE E RECÊNCIA',
    synth: {
      agreements: ['Canais diretos são candidatos naturais para construir Fan Intelligence.'],
      risks: ['Sem consentimento, taxonomia e rotina de análise, dado direto vira base ociosa.'],
    },
  },
]

export const lanceCannedTurns: Record<'challenge' | 'evidence' | 'invite', BoardTurn> = {
  challenge: {
    code: 'MDA',
    text: 'Pressão adicional: “Fan Intelligence” só será levado a sério se a agência conseguir transformar isso em uma recomendação para cliente. Mostre uma categoria. Cerveja, betting, telco, banco ou mobilidade. Qual insight do torcedor muda a ideia, o investimento ou o timing da campanha?',
    tag: 'PRESSIONA A TESE',
    synth: {
      disagreements: ['Sem exemplo por categoria, a tese ainda pode soar como embalagem estratégica.'],
      risks: ['Agências podem concordar com a narrativa e ainda assim não mudar o plano de mídia.'],
    },
  },
  evidence: {
    code: 'RE',
    text: 'Pedido de evidência: a sala precisa de quatro blocos para sair da opinião. 1. Receita e margem por produto. 2. Pipeline por categoria e agência. 3. Dados de audiência por canal e recência. 4. Cinco cases reescritos por problema de negócio, mecanismo LANCE!, resultado e aprendizado. Se não houver dados agora, registre a lacuna e decida uma fase de validação.',
    tag: 'DADOS NECESSÁRIOS',
    studio: true,
    synth: {
      risks: ['Sem dados comerciais e de audiência estruturados, a decisão deve ser condicional.'],
      agreements: ['É possível avançar mesmo sem tudo, desde que a lacuna vire follow-up explícito.'],
    },
  },
  invite: {
    code: 'CAT',
    text: 'Papel convidado: especialista de categoria. Minha recomendação é começar por três categorias onde esporte muda comportamento e conversa: betting, cerveja e telco. Elas ajudam a testar se o LANCE! vende só impacto ou se vende entendimento de momento, torcida, comunidade e contexto cultural.',
    tag: 'CATEGORIA CONVIDADA',
    synth: {
      agreements: ['Começar por categorias com alta ligação cultural ajuda a provar a tese.'],
      risks: ['Categorias demais no início diluem foco comercial e aprendizado.'],
    },
  },
}

export const lanceDecisions: DecisionRecord[] = [
  {
    id: 'DEC-LANCE-001',
    statement: 'Validar o reposicionamento do LANCE! como plataforma de inteligência e ativação do torcedor brasileiro para marcas e agências.',
    rationale: 'A sala convergiu que o problema não é apenas audiência ou juventude. O gargalo é fazer o mercado entender o valor proprietário do LANCE! antes do planejamento estar fechado.',
    rejectedOptions: ['Continuar abrindo a venda por inventário e alcance', 'Tratar projetos especiais como exceções customizadas', 'Fazer uma campanha jovem sem reorganizar a oferta comercial'],
    confidence: 78,
    owner: 'CEO + CMO + CRO',
    conditions: ['Criar narrativa comercial em 30 dias', 'Reescrever cinco cases com mecanismo LANCE!', 'Levantar margem por produto e pipeline por categoria', 'Testar a tese com 10 agências e marcas prioritárias'],
    reviewDate: '2026-08-30',
    linked: ['Pre-work LANCE!', 'Transcrição Gustavo Mota', 'Dreamboard LANCE!', 'Reset Board OS'],
  },
]

export const lanceOutputs: ExecutionOutput[] = [
  { type: 'memo', title: 'Memo da decisão LANCE!', body: 'Decisão, racional, opções rejeitadas, condições, evidências e perguntas abertas para revisão.', sources: ['Transcrição', 'Dreamboard', 'Reset estratégico'], pages: 4 },
  { type: 'strategy', title: 'Brief de reposicionamento', body: 'Tese central, inimigo, território defensável, oferta comercial e implicações para produto/editorial.', sources: ['Strategy Core', 'Company Brain'], pages: 6 },
  { type: 'sales', title: 'Narrativa para agências e CMOs', body: 'Nova abertura comercial, objeções, categorias prioritárias e estrutura de case.', sources: ['CRO', 'Mídia & Agências', 'CMO'], pages: 5 },
  { type: 'plan', title: 'Plano de validação em 30 dias', body: 'Donos, marcos, pedidos de dados, entrevistas, revisão de deck e gates de decisão.', sources: ['Decision DEC-LANCE-001', 'PM Studio'], pages: 4 },
  { type: 'minutes', title: 'Ata da sala', body: 'Síntese dos turnos, divergências, riscos e condições para avançar sem dados completos.', sources: ['Hot Seat transcript', 'Synthesis'], pages: 3 },
]

export const lanceFollowUps: FollowUp[] = [
  { title: 'Reescrever cinco cases por problema, mecanismo LANCE! e resultado', owner: 'CRO + CMO', due: '2026-07-12', status: 'Aberto', dependency: 'Cases Rexona, Guaraná, Uber, Flying Fish e betting', escalation: 'Escalar se o case continuar parecendo mídia comprada, não mecanismo proprietário.' },
  { title: 'Levantar receita, margem e custo de entrega por produto comercial', owner: 'CFO', due: '2026-07-16', status: 'Aberto', dependency: 'Dados financeiros e Sales Ops', escalation: 'Sem esse dado, aprovar apenas fase de validação.' },
  { title: 'Entrevistar 10 agências e marcas prioritárias', owner: 'CMO / Mídia & Agências', due: '2026-07-19', status: 'Aberto', dependency: 'Lista de contas e roteiro de entrevista', escalation: 'Escalar se a tese não gerar mudança no momento em que o LANCE! é chamado.' },
  { title: 'Desenhar o primeiro pacote LANCE! Fan Intelligence', owner: 'Produto + CRM', due: '2026-07-26', status: 'Aberto', dependency: 'Canais diretos, newsletter, WhatsApp, app e taxonomia de audiência', escalation: 'Escalar se não houver dado suficiente para diferenciar inteligência de relatório de audiência.' },
  { title: 'Revisar a decisão de posicionamento', owner: 'Board Brain', due: '2026-08-30', status: 'Aberto', dependency: 'Dados comerciais, entrevistas e novo sales deck', escalation: 'Abrir Revisão de Decisão se os gates não forem cumpridos.' },
]

export const lanceDecisionRoomReadout: DecisionRoomReadout = {
  mode: 'mock',
  boardAgents: lanceBoardAgents,
  studioAgents: lanceStudioAgents,
  sessionTypes: lanceSessionTypes,
  diagnosis: lanceDiagnosis,
  boardBrief: lanceBoardBrief,
  decisions: lanceDecisions,
  outputs: lanceOutputs,
  followUps: lanceFollowUps,
}
