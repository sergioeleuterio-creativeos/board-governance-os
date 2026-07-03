import type {
  BoardAgent,
  BoardBrief,
  BoardTurn,
  DecisionRoomReadout,
  DecisionRecord,
  ExecutionOutput,
  FollowUp,
  SessionType,
  StrategyDiagnosis,
  StudioAgent,
} from './types'

export const boardAgents: BoardAgent[] = [
  { code: 'BB', short: 'Presidente · Board Brain', role: 'Presidente / Board Brain', color: '#C4922F', angle: 'Enquadra a sessao, gerencia os turnos, forca o fechamento', evidence: 'Diagnostico, brief completo do conselho', pressure: 'A sala esta de fato convergindo para uma decisao?' },
  { code: 'CEO', short: 'CEO Operador', role: 'CEO Operador', color: '#4A5A6A', angle: 'O que muda amanha se decidirmos isso?', evidence: 'Notas de ops, plano de contratacao', pressure: 'Isso executa na segunda, e por quem?' },
  { code: 'CFO', short: 'CFO / Investidor', role: 'CFO / Investidor', color: '#3E6B4F', angle: 'Economia, risco, alocacao de capital, sequenciamento', evidence: 'Q1 close.xlsx, modelo de runway', pressure: 'Quanto isso custa em runway, e qual o custo de oportunidade?' },
  { code: 'CMO', short: 'CMO / Marca', role: 'CMO / Estrategista de Marca', color: '#7A4E63', angle: 'Posicionamento, percepcao, publico, diferenciacao', evidence: 'Brand deck, notas de mercado', pressure: 'Que historia essa decisao conta ao mercado?' },
  { code: 'CRO', short: 'CRO / Vendas', role: 'CRO / Lider de Vendas', color: '#2F6E6A', angle: 'Logica do comprador, motion de vendas, objecoes, realidade dos deals', evidence: 'Pipeline, contas do corredor', pressure: 'Isso sobrevive ao contato com compradores reais?' },
  { code: 'PRD', short: 'Produto / Cliente', role: 'Produto / Cliente', color: '#51789B', angle: 'Demanda de usuario/cliente e consequencia de produto', evidence: 'Dados de retencao, sinais de demanda', pressure: 'A demanda e duravel ou so barulhenta?' },
  { code: 'CAT', short: 'Especialista de Categoria', role: 'Especialista de Categoria', color: '#85702F', angle: 'Reconhecimento de padroes de mercado entre comparaveis', evidence: 'Benchmarks da categoria', pressure: 'Que forma de fracasso esse padrao costuma tomar?' },
  { code: 'RED', short: 'Cetico / Red Team', role: 'Cetico / Red Team', color: '#A23B2D', angle: 'Ataca premissas frageis e estrategia educada demais', evidence: 'O brief inteiro, de forma adversarial', pressure: 'O que todos estao educadamente se recusando a dizer?' },
]

export const studioAgents: StudioAgent[] = [
  { code: 'SC', name: 'Strategy Core', desc: 'Diagnostico e compressao estrategica' },
  { code: 'BE', name: 'Brief Engine', desc: 'Briefs de conselho, papel, vendas e campanha' },
  { code: 'CP', name: 'Campaign Planner', desc: 'Plano de ativacao e logica de canais' },
  { code: 'SN', name: 'Sales Narrative Builder', desc: 'Arquitetura de pitch e objecoes' },
  { code: 'RE', name: 'Research / Evidence', desc: 'Mapeamento de fontes e disciplina de afirmacoes' },
  { code: 'MW', name: 'Memo Writer', desc: 'Memo do conselho, ata, resumo' },
  { code: 'PM', name: 'Project Manager', desc: 'Responsaveis, marcos, cadencia de revisao' },
]

export const sessionTypes: SessionType[] = [
  { id: 'problem', code: 'PB', name: 'Problem Build', tag: 'Nomeie o problema real', desc: 'Voce sabe que algo esta errado mas ainda nao nomeou o problema real.', outputs: ['Problema declarado vs inferido', 'Opcoes de enquadramento', 'Pergunta de decisao'] },
  { id: 'hotseat', code: 'HS', name: 'Hot Seat', tag: 'Pressao estilo Dreamboard', desc: 'Submeta um plano ou decisao a pressao executiva estruturada de oito angulos.', outputs: ['Concordancias & discordancias', 'Objecao mais forte', 'Caminho recomendado'], primary: true },
  { id: 'prep', code: 'BP', name: 'Board Prep', tag: 'Antes de uma reuniao real', desc: 'Prepare-se para uma reuniao real de conselho, investidor, socio ou lideranca.', outputs: ['Memo do conselho', 'Perguntas provaveis', 'Pontos fracos'] },
  { id: 'reset', code: 'SR', name: 'Strategy Reset', tag: 'Reposicionar ou virar a chave', desc: 'Reposicionamento, GTM, growth, marca, vendas ou mudanca de categoria.', outputs: ['Diagnostico', 'Opcoes estrategicas', 'Plano operacional'] },
  { id: 'campaign', code: 'CT', name: 'Teste de Campanha', tag: 'Depois que ha uma direcao', desc: 'Estresse uma direcao de campanha vinda da Strategy Core & Campaign Planner.', outputs: ['Critica da campanha', 'Riscos de mensagem', 'Territorios aprimorados'] },
  { id: 'review', code: 'DR', name: 'Revisao de Decisao', tag: 'Semanas apos executar', desc: 'Revisite uma decisao apos a execucao para ver o que se sustentou e o que mudou.', outputs: ['O que mudou / se sustenta', 'Checagem de evidencia', 'Continuar / ajustar / parar'] },
]

export const diagnosis: StrategyDiagnosis = {
  statedProblem: 'Devemos abrir o hub de Sao Paulo agora para capturar o corredor mid-market?',
  inferredProblem: 'A decisao real nao e expansao. E se a empresa consegue comprar opcionalidade comercial sem destruir runway e foco operacional.',
  tension: {
    a: 'Proteger caixa, foco e qualidade do SMB core.',
    b: 'Nao entregar o corredor de Sao Paulo aos concorrentes.',
  },
  frames: [
    { title: 'Expansao vs pausa', detail: 'Trata a escolha como sim/nao de capex. Simples, mas pobre.', selected: false },
    { title: 'Opcionalidade sem capex', detail: 'Assinar o corredor com condicoes, adiar obra e validar volume.', selected: true },
    { title: 'Enterprise como novo jogo', detail: 'Assume que o hub muda o mercado-alvo. Alto risco com evidencia rasa.', selected: false },
  ],
  evidenceMap: [
    { claim: 'Runway atual abaixo de sete meses.', source: 'Q1 close.xlsx', status: 'CONFIRMADO' },
    { claim: 'Maior cliente concentra 34% da receita.', source: 'Company Brain / Receita', status: 'CONFIRMADO' },
    { claim: 'Retencao SMB core em 94%.', source: 'Retention cohort export', status: 'CONFIRMADO' },
    { claim: 'Renovacao do maior cliente ainda nao foi validada contra MSA v3.', source: 'Contrato MSA v3', status: 'PARCIAL' },
    { claim: 'VP de Operacoes necessario para operar segundo hub.', source: 'Plano de contratacao', status: 'DERIVADO' },
  ],
  recommendedQuestion: 'Qual opcao preserva runway e foco sem abandonar o corredor de Sao Paulo pelos proximos 90 dias?',
  confidence: 72,
  missingContext: ['Termos de renovacao e volume do maior cliente', 'Custo de oportunidade de pausar o corredor', 'Capacidade operacional sem VP de Operacoes'],
}

export const boardBrief: BoardBrief = {
  boardBrief: 'A sala deve decidir se a empresa pausa, segue ou opcionaliza o hub de Sao Paulo. O conselho deve pressionar tres coisas: runway, demanda duravel, e consequencia operacional ja na segunda-feira.',
  roleBriefs: boardAgents.map(agent => ({
    code: agent.code,
    angle: agent.angle,
    evidence: agent.evidence,
    pressure: agent.pressure,
  })),
}

export const transcript: BoardTurn[] = [
  { code: 'BB', text: 'Decisao na mesa: pausar o hub de Sao Paulo por um trimestre, ou seguir no cronograma. Voce tem menos de sete meses de runway e 34% da receita em uma conta. Vou ouvir cada executivo por vez e entao forcar a decisao.', tag: 'ENQUADRA SESSAO' },
  { code: 'CFO', text: 'Seguir gasta cerca de cinco meses de runway numa aposta que retorna no ano dois. Se o maior cliente atrasar um so trimestre durante a obra, voce fica insolvente. A economia diz pausar e proteger doze meses de caixa primeiro.', tag: 'DISCORDA · SEGUIR', synth: { disagreements: ['CFO: gastar no hub antes de proteger o runway e imprudente'], risks: ['Runway cai abaixo de 3 meses se o hub seguir e o maior cliente atrasar'] } },
  { code: 'CRO', text: 'O corredor de Sao Paulo e onde vivem os proximos tres deals de mid-market. Pausar o hub nao pausa o mercado. Um concorrente o ocupa. Mas consigo defender o pipeline por um trimestre com a frota atual se nos comprometermos com as contas agora.', tag: 'PARCIAL · SEGUIR', synth: { disagreements: ['CRO: pausar entrega o corredor de Sao Paulo aos concorrentes'], agreements: ['O pipeline pode ser defendido por um trimestre sem o hub'] } },
  { code: 'PRD', text: 'A demanda no SMB core e real e fiel; a retencao e 94%. A demanda enterprise e mais barulhenta, porem mais rasa. A consequencia de produto do hub e majoritariamente enterprise, justo o segmento que ainda nao conseguimos sustentar.', tag: 'CONCORDA · PAUSAR', synth: { agreements: ['Retencao no SMB core (94%) sustenta a historia de diversificacao'] } },
  { code: 'CEO', text: 'O que muda amanha se pausarmos? Seguramos uma assinatura de contrato, realocamos duas contratacoes para diversificacao de receita e devemos um cronograma ao cliente do corredor. Isso executa na segunda. Seguir exige um VP de Operacoes que nao temos.', tag: 'CONCORDA · PAUSAR', synth: { agreements: ['Pausar e executavel ja; seguir depende de uma vaga de VP de Operacoes nao preenchida'] } },
  { code: 'CMO', text: 'Em posicionamento, "pausamos para proteger clientes e foco" e uma historia defensavel ao mercado e a investidores. "Nos esticamos num segundo hub e travamos" nao e. O risco narrativo esta em seguir, nao em pausar.', tag: 'CONCORDA · PAUSAR', synth: { agreements: ['Pausar e a narrativa mais defensavel ao mercado e a investidores'] } },
  { code: 'CAT', text: 'Padrao de scale-ups de logistica comparaveis: as que morreram foi construindo capacidade a frente de demanda duravel, nao por andar um trimestre mais devagar. Concentracao somada a capex prematuro e a forma classica de fracasso aqui.', tag: 'CONTEXTO', synth: { risks: ['Padrao da categoria: capacidade a frente de demanda duravel e um modo comum de fracasso'] } },
  { code: 'RED', text: 'Todos estao sendo educados sobre a pergunta real: a renovacao do maior cliente esta mesmo em risco, ou estamos inventando uma crise para justificar cautela? Se essa renovacao for solida, toda a tese de pausar enfraquece. Ninguem trouxe o contrato.', tag: 'ATACA PREMISSA', synth: { disagreements: ['Red Team: a tese de pausar se apoia numa premissa de risco de renovacao nao verificada'], risks: ['Evidencia-chave faltando: termos de renovacao assinados do maior cliente'] } },
]

export const cannedTurns: Record<'challenge' | 'evidence' | 'invite', BoardTurn> = {
  challenge: { code: 'RED', text: 'Entao deixa eu ser mais afiado: se voce pausar e a renovacao nunca esteve em risco, voce entregou um trimestre do corredor a um concorrente a toa. Sua cautela tambem tem custo. Quantifique antes de chamar pausar de seguro.', tag: 'PRESSIONA MAIS', synth: { risks: ['Custo de oportunidade de pausar ainda nao quantificado'] } },
  evidence: { code: 'RE', text: 'Checagem de evidencia: o contrato do maior cliente renova automaticamente salvo cancelamento com 90 dias de antecedencia; nao ha aviso de cancelamento registrado. O risco de renovacao e menor que o assumido, mas o volume nao esta comprometido. Fonte: MSA v3, clausula 8.2.', tag: 'EVIDENCIA CITADA', studio: true, synth: { agreements: ['Renova automaticamente sem aviso de 90 dias (MSA v3 §8.2)'], disagreements: ['O volume, nao a renovacao, e a exposicao real'] } },
  invite: { code: 'CFO', text: 'Chamado de volta para sequenciar: um caminho do meio. Assinar o contrato com clausula de saida de 90 dias, adiar o capex e condicionar a obra a confirmacao do volume de renovacao. Isso protege o runway sem entregar o corredor de vez.', tag: 'CONVIDADO · SEQUENCIAMENTO', synth: { agreements: ['Caminho do meio: contrato opcionado com clausula de saida, capex condicionado a confirmacao de volume'] } },
}

export const decisions: DecisionRecord[] = [
  {
    id: 'DEC-119',
    statement: 'Opcionaremos o corredor de Sao Paulo por 90 dias, sem iniciar capex do hub ate confirmar volume e runway.',
    rationale: 'A sala convergiu que o risco nao era a renovacao em si, mas o volume, a concentracao e a falta de capacidade operacional para abrir um segundo hub agora.',
    rejectedOptions: ['Abrir o hub no cronograma original', 'Pausar completamente o corredor por um trimestre'],
    confidence: 76,
    owner: 'CEO Operador',
    conditions: ['MSA v3 validado', 'Volume minimo confirmado ate 2026-08-15', 'Runway acima de 9 meses apos assinatura'],
    reviewDate: '2026-09-30',
    linked: ['Q1 close.xlsx', 'MSA v3 §8.2', 'Retention cohort export'],
  },
]

export const outputs: ExecutionOutput[] = [
  { type: 'memo', title: 'Memo do conselho', body: 'Decisao, racional, trade-offs, condicoes e pergunta de revisao para setembro.', sources: ['MSA v3', 'Q1 close.xlsx', 'Transcript HS-042'], pages: 4 },
  { type: 'strategy', title: 'Brief de estrategia', body: 'Diagnostico, jogo escolhido, posicionamento e sequenciamento de capital antes de capacidade.', sources: ['Strategy Core readout', 'Company Brain'], pages: 5 },
  { type: 'sales', title: 'Brief de vendas', body: 'Narrativa para defender o corredor sem prometer capacidade que ainda nao existe.', sources: ['Pipeline mid-market', 'CRO turn'], pages: 3 },
  { type: 'plan', title: 'Plano operacional + ata', body: 'Responsaveis, marcos, dependencias, follow-ups e ata literal da sessao.', sources: ['Decision DEC-119', 'Hot Seat transcript'], pages: 6 },
]

export const followUps: FollowUp[] = [
  { title: 'Validar volume do maior cliente no MSA v3', owner: 'CFO', due: '2026-07-12', status: 'Aberto', dependency: 'Contrato assinado', escalation: 'Escalar ao Board Brain se nao houver confirmacao em 7 dias' },
  { title: 'Preparar narrativa para contas do corredor SP', owner: 'CRO', due: '2026-07-16', status: 'Em andamento', dependency: 'Brief de vendas', escalation: 'Escalar ao CEO se tres contas nao responderem' },
  { title: 'Revisar decisao DEC-119', owner: 'Board Brain', due: '2026-09-30', status: 'Aberto', dependency: 'Volume + runway', escalation: 'Abrir sessao Revisao de Decisao' },
]

export const decisionRoomReadout: DecisionRoomReadout = {
  mode: 'mock',
  boardAgents,
  studioAgents,
  sessionTypes,
  diagnosis,
  boardBrief,
  decisions,
  outputs,
  followUps,
}
