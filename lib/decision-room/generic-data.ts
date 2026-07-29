import 'server-only'

import { getSessionUser } from '@/lib/auth-server'
import { resolveBoardSourceSnapshot } from '@/lib/board/source-resolver'
import { summarizeSourceSnapshot, type BoardSourceSnapshot } from '@/lib/board/source-snapshot'
import { getCurrentCompanyForUser, type CurrentCompany } from '@/lib/shadow-board/current-company-server'
import type {
  BoardAgent,
  BoardBrief,
  BoardTurn,
  DecisionRecord,
  DecisionRoomReadout,
  ExecutionOutput,
  FollowUp,
  SessionType,
  SessionTypeId,
  StrategyDiagnosis,
  StudioAgent,
} from './types'
import { maxTurnsForSession } from './session-config'

type MemoryEntry = {
  id: string
  category: string
  source_type: string
  title: string
  content: string
  confidence_score: number | null
  source_document_id: string | null
  created_at: string
}

type UploadedDocument = {
  id: string
  original_filename: string
  document_type: string | null
  status: string
  summary: string | null
  created_at: string
}

export type DecisionRoomPack = {
  readout: DecisionRoomReadout
  transcript: BoardTurn[]
  advisoryTranscripts: Partial<Record<SessionTypeId, BoardTurn[]>>
  cannedTurns: Record<'challenge' | 'evidence' | 'invite', BoardTurn>
  decisions: DecisionRecord[]
  followUps: FollowUp[]
  outputs: ExecutionOutput[]
}

const genericBoardAgents: BoardAgent[] = [
  {
    code: 'BB',
    short: 'Board OS Advisor',
    role: 'Board OS Advisor / Chair',
    color: '#C4922F',
    angle: 'Transforma contexto incompleto em decisão, condições, riscos e memória.',
    evidence: 'Company Brain, documentos enviados, decisões anteriores e lacunas declaradas.',
    pressure: 'Qual decisão precisa sair da sala, e o que ainda não pode ser afirmado?',
  },
  {
    code: 'CEO',
    short: 'CEO Operador',
    role: 'CEO Operador',
    color: '#4A5A6A',
    angle: 'Traduz a tese em mudança real de prioridade, cadência e responsabilidade.',
    evidence: 'Objetivos, plano atual, liderança, cadência operacional e restrições de execução.',
    pressure: 'O que muda na segunda-feira se essa decisão for aprovada?',
  },
  {
    code: 'CFO',
    short: 'CFO / Capital',
    role: 'CFO / Investidor',
    color: '#3E6B4F',
    angle: 'Separa narrativa estratégica de economia real.',
    evidence: 'Receita, margem, caixa, concentração, custo de entrega e unit economics.',
    pressure: 'Qual evidência financeira precisa existir antes de escalar?',
  },
  {
    code: 'CMO',
    short: 'CMO / Marca',
    role: 'CMO / Marca e mercado',
    color: '#7A4E63',
    angle: 'Testa se a decisão cria memória clara para clientes, mercado e equipe.',
    evidence: 'Posicionamento, cliente, demanda, categoria, canais e diferenciação.',
    pressure: 'O mercado conseguiria repetir por que essa empresa deve ser escolhida?',
  },
  {
    code: 'MDA',
    short: 'Go-to-market',
    role: 'Especialista de go-to-market',
    color: '#6A5B8E',
    angle: 'Pressiona canal, distribuição, vendas, parceiros e timing de mercado.',
    evidence: 'Pipeline, canais, ICP, objeções, proposta comercial e movimento competitivo.',
    pressure: 'Essa tese entra no ritual real de compra ou fica bonita só no deck?',
  },
  {
    code: 'CRO',
    short: 'CRO / Receita',
    role: 'CRO / Receita',
    color: '#2F6E6A',
    angle: 'Converte a escolha em oferta, pipeline, objeções e sequência comercial.',
    evidence: 'Vendas, ticket, conversão, retenção, expansão e qualidade de receita.',
    pressure: 'Isso muda o pitch e a receita, ou só renomeia o que já existe?',
  },
  {
    code: 'PRD',
    short: 'Produto',
    role: 'Produto / Operação',
    color: '#51789B',
    angle: 'Checa se produto, dados, operação e capacidade sustentam a promessa.',
    evidence: 'Produto, dados, processos, experiência do cliente e dependências internas.',
    pressure: 'Que capacidade precisa existir para a decisão não virar teatro estratégico?',
  },
  {
    code: 'CAT',
    short: 'Categoria',
    role: 'Especialista de categoria',
    color: '#85702F',
    angle: 'Compara a escolha com padrões reais de categoria e alternativas competitivas.',
    evidence: 'Categoria, concorrentes, substitutos, benchmarks e comportamento de compra.',
    pressure: 'Qual território é defensável contra players maiores, baratos ou já conhecidos?',
  },
  {
    code: 'CRM',
    short: 'Cliente / CRM',
    role: 'Cliente, CRM e comunidade',
    color: '#8A4F3D',
    angle: 'Traz retenção, relacionamento, dados do cliente e confiança para a decisão.',
    evidence: 'Base de clientes, uso, recência, NPS, churn, comunidade e sinais qualitativos.',
    pressure: 'Que dado de cliente mudaria a recomendação?',
  },
]

const genericStudioAgents: StudioAgent[] = [
  { code: 'SC', name: 'Strategy Core', desc: 'Reframe estratégico, tensão central e perguntas de decisão.' },
  { code: 'BE', name: 'Brief Engine', desc: 'Briefs por papel, sem deixar os agentes falarem no vazio.' },
  { code: 'CP', name: 'Campaign Planner', desc: 'Traduz a tese em plano de mercado quando há go-to-market envolvido.' },
  { code: 'SN', name: 'Sales Narrative Builder', desc: 'Reconstrói narrativa comercial, objeções e oferta.' },
  { code: 'RE', name: 'Research / Evidence', desc: 'Separa o que está confirmado, derivado, parcial ou faltando.' },
  { code: 'MW', name: 'Memo Writer', desc: 'Gera memo, ata, decisões, perguntas abertas e próximos passos.' },
  { code: 'PM', name: 'Project Manager', desc: 'Transforma decisões em donos, prazos, dependências e revisões.' },
]

const genericSessionTypes: SessionType[] = [
  { id: 'problem', kind: 'advisory', code: 'DG', name: 'Diagnosticar o problema', tag: 'Quando a questão ainda está nebulosa', desc: 'Transforme contexto solto, documentos e perguntas abertas em diagnóstico, tensões e próximos caminhos.', outputs: ['Diagnóstico', 'Perguntas melhores', 'Próximas decisões'], maxTurns: maxTurnsForSession('problem') },
  { id: 'reset', kind: 'advisory', code: 'ST', name: 'Plano estratégico', tag: 'Quando o cliente quer direção', desc: 'Construa uma recomendação consultiva com plano, workstreams, KPIs, riscos e premissas.', outputs: ['Análise executiva', 'Plano', 'Workstreams e KPIs'], maxTurns: maxTurnsForSession('reset') },
  { id: 'campaign', kind: 'advisory', code: 'MK', name: 'Marketing e marca', tag: 'CMO, GTM e Creative OS', desc: 'Use advisors de marca, receita e mercado para posicionamento, narrativa, campanha ou plano comercial.', outputs: ['Diagnóstico de marca', 'Narrativa', 'Plano de marketing'], maxTurns: maxTurnsForSession('campaign') },
  { id: 'hotseat', kind: 'board', code: 'BD', name: 'Revisar uma decisão', tag: 'Pressão executiva sobre uma escolha', desc: 'Coloque uma decisão concreta sob pressão de marca, receita, finanças, produto, cliente e categoria.', outputs: ['Trade-offs', 'Recomendação', 'Decisão e condições'], maxTurns: maxTurnsForSession('hotseat'), primary: true },
  { id: 'prep', kind: 'board', code: 'BP', name: 'Preparar board pack', tag: 'Antes de conselho, sócios ou liderança', desc: 'Prepare a conversa formal com evidências, perguntas prováveis, pontos frágeis e narrativa executiva.', outputs: ['Board pack', 'Perguntas prováveis', 'Pontos frágeis'], maxTurns: maxTurnsForSession('prep') },
  { id: 'review', kind: 'board', code: 'RV', name: 'Revisar execução', tag: 'Depois de executar', desc: 'Revisite uma decisão para separar o que se sustentou do que precisa mudar.', outputs: ['O que mudou', 'Evidências novas', 'Continuar / ajustar / parar'], maxTurns: maxTurnsForSession('review') },
]

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function compact(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function byCategory(entries: MemoryEntry[], category: string) {
  return entries.filter(entry => entry.category === category)
}

function firstContent(entries: MemoryEntry[], categories: string[], fallback: string) {
  const entry = entries.find(item => categories.includes(item.category))
  return compact(entry?.content ?? entry?.title, fallback)
}

function shortList(items: string[], fallback: string) {
  const cleaned = items.map(item => item.trim()).filter(Boolean)
  if (!cleaned.length) return fallback
  return cleaned.slice(0, 3).join('; ')
}

function companyLabel(company: CurrentCompany | null) {
  return company?.name ?? 'esta empresa'
}

function buildEvidenceMap(
  company: CurrentCompany | null,
  entries: MemoryEntry[],
  documents: UploadedDocument[],
  snapshot?: BoardSourceSnapshot,
): StrategyDiagnosis['evidenceMap'] {
  const evidence: StrategyDiagnosis['evidenceMap'] = entries.slice(0, 5).map(entry => ({
    claim: compact(entry.content, entry.title),
    source: entry.source_document_id ? 'Company Brain / documento enviado' : `Company Brain / ${entry.source_type}`,
    status: entry.confidence_score !== null && entry.confidence_score < 60 ? 'PARCIAL' as const : 'CONFIRMADO' as const,
  }))

  documents.slice(0, 2).forEach(document => {
    evidence.push({
      claim: compact(document.summary, `Documento disponível: ${document.original_filename}`),
      source: `Arquivo / ${document.original_filename}`,
      status: document.status === 'processed' ? 'CONFIRMADO' : 'PARCIAL',
    })
  })

  if (snapshot?.plan) {
    evidence.unshift({
      claim: `${snapshot.plan.title}, versão ${snapshot.plan.version}: ${compact(snapshot.plan.diagnosis, 'plano selecionado para esta sessão')}`,
      source: `Plano / ${snapshot.plan.id} / v${snapshot.plan.version}`,
      status: snapshot.plan.status === 'approved' ? 'CONFIRMADO' : 'PARCIAL',
    })
  }

  if (!evidence.length) {
    evidence.push({
      claim: `${companyLabel(company)} ainda não tem Company Brain suficiente para sustentar uma recomendação forte.`,
      source: 'Company Brain',
      status: 'FALTANDO',
    })
  }

  return evidence
}

function missingContext(entries: MemoryEntry[]) {
  const missing: string[] = []
  if (!byCategory(entries, 'financial').length) missing.push('Dados financeiros: receita, margem, caixa, burn, unit economics e concentração.')
  if (!byCategory(entries, 'customer').length) missing.push('Evidência de cliente: ICP, retenção, churn, NPS, entrevistas ou sinais de demanda.')
  if (!byCategory(entries, 'decision').length) missing.push('Decisões anteriores: racional, opções rejeitadas, donos, condições e resultado.')
  if (!byCategory(entries, 'operations').length) missing.push('Capacidade operacional: responsáveis, cadência, dependências, gargalos e riscos de execução.')
  if (!byCategory(entries, 'risk').length) missing.push('Mapa de riscos: premissas frágeis, downside, gatilhos de revisão e mitigação.')
  return missing.length ? missing : ['Registrar evidências novas que mudariam a recomendação antes da próxima revisão.']
}

function buildDiagnosis(
  company: CurrentCompany | null,
  entries: MemoryEntry[],
  documents: UploadedDocument[],
  snapshot?: BoardSourceSnapshot,
): StrategyDiagnosis {
  const name = companyLabel(company)
  const goal = firstContent(entries, ['goal', 'plan'], `Definir qual decisão estratégica de ${name} precisa virar ação nos próximos 30 dias.`)
  const challenge = snapshot?.founderQuestion
    ?? firstContent(entries, ['question', 'risk'], 'A decisão central ainda precisa ser nomeada com clareza antes da sala avançar.')
  const financialSignal = shortList(byCategory(entries, 'financial').map(entry => entry.title), 'dados financeiros ainda não estruturados')
  const customerSignal = shortList(byCategory(entries, 'customer').map(entry => entry.title), 'evidências de cliente ainda não estruturadas')

  return {
    statedProblem: challenge,
    inferredProblem: `${name} precisa transformar contexto disperso em uma decisão governável: qual aposta fazer agora, com quais condições, quais evidências mínimas e qual data de revisão.`,
    tension: {
      a: `Avançar com velocidade usando o que já se sabe: ${goal}`,
      b: `Evitar uma decisão bonita, mas frágil, enquanto faltam ${financialSignal} e ${customerSignal}.`,
    },
    frames: [
      { title: 'Decidir agora com condições', detail: 'Aprovar a direção, mas registrar lacunas, donos, gates e revisão curta.', selected: true },
      { title: 'Pedir dados antes de decidir', detail: 'Pausar a decisão até fechar evidências mínimas de finanças, cliente e execução.', selected: false },
      { title: 'Rodar piloto controlado', detail: 'Reduzir risco com um teste de 30 dias antes de comprometer escala.', selected: false },
      { title: 'Reformular o problema', detail: 'Voltar para Problem Build se a pergunta ainda mistura muitos assuntos.', selected: false },
    ],
    evidenceMap: buildEvidenceMap(company, entries, documents, snapshot),
    recommendedQuestion: snapshot?.founderQuestion
      ?? `Qual decisão ${name} deve tomar agora, e quais condições precisam ser registradas para avançar com segurança?`,
    decisionQuestions: [
      snapshot?.founderQuestion
        ?? `Qual decisão ${name} deve tomar agora, e quais condições precisam ser registradas para avançar com segurança?`,
      'Que evidência mínima mudaria a recomendação da sala?',
      'Quais riscos aceitamos agora e quais precisam virar gate de revisão?',
      'Quem deve ser o dono real da decisão e do próximo ponto de prova?',
      'O que deve ser comunicado ao time, clientes ou parceiros depois da decisão?',
    ],
    confidence: Math.min(82, 48 + entries.length * 4 + documents.length * 3),
    missingContext: missingContext(entries),
  }
}

function buildBrief(diagnosis: StrategyDiagnosis): BoardBrief {
  return {
    boardBrief: `A sala deve decidir uma pergunta concreta, sem fingir que o Company Brain está completo. Use o contexto confirmado, marque lacunas como risco ativo e transforme a recomendação em decisão, dono, condições, evidências pedidas e data de revisão.`,
    roleBriefs: genericBoardAgents.map(agent => ({
      code: agent.code,
      angle: agent.angle,
      evidence: agent.evidence,
      pressure: agent.pressure,
    })),
  }
}

function buildTranscript(company: CurrentCompany | null, diagnosis: StrategyDiagnosis): BoardTurn[] {
  const name = companyLabel(company)
  return [
    {
      code: 'BB',
      text: `Contexto da sala: ${name} trouxe uma decisão com confiança parcial. A função do conselho não é preencher lacunas com opinião. É separar o que está confirmado, o que é hipótese e o que precisa virar pedido de dados ou condição de aprovação.`,
      tag: 'ENQUADRA A SALA',
      synth: {
        agreements: ['A decisão pode avançar se as lacunas forem explícitas.'],
        risks: ['Decidir sem marcar premissas frágeis cria falsa confiança.'],
      },
    },
    {
      code: 'CEO',
      text: `Se aprovarmos a direção, segunda-feira precisa mudar prioridade, dono e cadência. Uma decisão boa para ${name} deve dizer o que para, o que começa, quem responde e quando a liderança revisa evidência nova.`,
      tag: 'OPERACIONALIZA',
      synth: {
        agreements: ['Toda decisão precisa virar rotina operacional.'],
        risks: ['Sem dono e cadência, a decisão vira ata bonita e pouca mudança.'],
      },
    },
    {
      code: 'CFO',
      text: `Financeiro: eu não bloquearia a conversa, mas condicionaria escala. A sala precisa de receita, margem, caixa, custo de execução e concentração. Sem isso, o máximo responsável é aprovar um piloto ou uma fase de validação.`,
      tag: 'CONDICIONA ESCALA',
      synth: {
        agreements: ['É possível avançar por validação antes de comprometer escala.'],
        risks: ['Sem economia clara, a tese pode consumir caixa ou foco sem retorno proporcional.'],
      },
    },
    {
      code: 'CMO',
      text: `Marca e mercado: a decisão precisa ser fácil de repetir fora da sala. Se clientes, equipe ou parceiros não entendem por que essa escolha importa, a execução perde tração. A pergunta é: que memória queremos criar depois desta decisão?`,
      tag: 'MEMÓRIA DE MERCADO',
      synth: {
        agreements: ['A decisão precisa ter uma narrativa simples para o mercado e para o time.'],
        disagreements: ['Clareza interna não garante consideração externa.'],
      },
    },
    {
      code: 'CRO',
      text: `Receita: uma direção estratégica só importa se muda oferta, pipeline, objeção ou conversão. Quero ver qual pitch muda, qual conta entra primeiro, qual métrica prova avanço e qual objeção derruba a tese.`,
      tag: 'ARQUITETURA DE RECEITA',
      synth: {
        agreements: ['A recomendação deve virar movimento comercial testável.'],
        risks: ['Sem métrica comercial, a decisão fica abstrata demais.'],
      },
    },
    {
      code: 'PRD',
      text: `Produto e operação: a sala precisa confirmar capacidade. Quem executa? Que sistema, processo, dado ou rotina precisa existir? Uma decisão pode ser estrategicamente certa e operacionalmente cedo demais.`,
      tag: 'CAPACIDADE REAL',
      synth: {
        agreements: ['Capacidade operacional deve entrar como condição da decisão.'],
        risks: ['Prometer antes de ter capacidade cria dívida operacional e reputacional.'],
      },
    },
    {
      code: 'CAT',
      text: `Categoria: comparem a decisão com alternativas reais, não com o plano ideal. Clientes, concorrentes e substitutos não esperam a tese amadurecer. O território escolhido precisa ser defensável contra opções maiores, mais baratas ou mais conhecidas.`,
      tag: 'PADRÃO DE CATEGORIA',
      synth: {
        agreements: ['A decisão precisa nomear um território defensável.'],
        disagreements: ['Ser internamente coerente não basta se o mercado compara por outro critério.'],
      },
    },
    {
      code: 'CRM',
      text: `Cliente: eu pediria sinais de uso, retenção, recorrência, feedback e comportamento. Se essa decisão melhora valor para cliente, precisamos saber qual cliente sente a diferença primeiro e que evidência mostrará isso.`,
      tag: 'EVIDÊNCIA DE CLIENTE',
      synth: {
        agreements: ['A decisão deve ter um ponto de prova centrado no cliente.'],
        risks: ['Sem dado de cliente, a sala pode otimizar para convicção interna.'],
      },
    },
  ]
}

function buildAdvisoryTranscripts(company: CurrentCompany | null, diagnosis: StrategyDiagnosis): Partial<Record<SessionTypeId, BoardTurn[]>> {
  const name = companyLabel(company)
  return {
    problem: [
      {
        code: 'BB',
        text: `Vamos tratar isso como diagnóstico, não como votação. Primeiro separo sintoma, causa provável, hipótese e evidência ausente. Para ${name}, a pergunta útil é: o que está acontecendo de verdade e o que ainda estamos só presumindo?`,
        tag: 'ABRE DIAGNÓSTICO',
        synth: {
          agreements: ['A conversa começa formulando melhor o problema.'],
          risks: ['Pular para decisão agora pode cristalizar uma hipótese fraca.'],
        },
      },
      {
        code: 'CEO',
        text: 'Do ponto de vista operacional, eu quero saber onde o problema aparece na rotina: prioridade, time, cliente, caixa, produto ou venda. Se não localizarmos o sintoma na operação, o plano nasce bonito e pouco executável.',
        tag: 'LOCALIZA SINTOMA',
        synth: {
          agreements: ['O diagnóstico precisa apontar onde a empresa sente o problema.'],
          risks: ['Um problema mal localizado vira iniciativa genérica.'],
        },
      },
      {
        code: 'CMO',
        text: 'Se houver confusão de mercado, marca ou mensagem, eu mapearia o que o cliente entende hoje, o que deveria entender e que prova faria essa mudança ser crível. Isso vira hipótese de posicionamento, não ainda campanha.',
        tag: 'TESTA MERCADO',
        synth: {
          agreements: ['A leitura de mercado pode revelar se o problema é de narrativa, demanda ou oferta.'],
          disagreements: ['Nem todo problema comercial é problema de marketing.'],
        },
      },
      {
        code: 'CFO',
        text: `Eu manteria a análise honesta: sem receita, margem, caixa e custo do problema, qualquer recomendação para ${name} precisa vir com faixa de confiança e pedido de dados. Diagnóstico bom também diz o que não sabe.`,
        tag: 'MARCA LACUNAS',
        synth: {
          agreements: ['O plano deve separar evidência confirmada de hipótese.'],
          risks: ['Falta de dados financeiros reduz confiança da recomendação.'],
        },
      },
    ],
    reset: [
      {
        code: 'BB',
        text: `Vou conduzir como consultoria estratégica. A saída não é aprovar uma decisão; é um plano para ${name}: diagnóstico, direção, workstreams, KPIs, riscos e perguntas que podem virar decisões depois.`,
        tag: 'ABRE PLANO',
        synth: {
          agreements: ['A sessão deve fechar com plano e próximos passos.'],
          risks: ['Sem critérios, plano estratégico vira lista de desejos.'],
        },
      },
      {
        code: 'CEO',
        text: 'Plano bom muda calendário, dono e foco. Eu estruturaria três frentes no máximo, cada uma com dono, ritual semanal, métrica de avanço e uma coisa que deve parar para liberar capacidade.',
        tag: 'DESENHA EXECUÇÃO',
        synth: {
          agreements: ['Workstreams precisam de donos, cadência e trade-offs.'],
          risks: ['Adicionar frentes sem parar nada cria sobrecarga.'],
        },
      },
      {
        code: 'CFO',
        text: 'Eu colocaria limites econômicos no plano: investimento máximo, prazo de validação, métrica que prova retorno e gatilho para reduzir escopo. Estratégia sem guardrail financeiro vira aposta sem proteção.',
        tag: 'DEFINE GUARDRAILS',
        synth: {
          agreements: ['O plano precisa ter limites e gatilhos de revisão.'],
          risks: ['Sem guardrails, execução pode consumir foco e caixa demais.'],
        },
      },
      {
        code: 'CRO',
        text: 'A estratégia precisa aparecer no pipeline: oferta, pitch, ICP, objeções e primeira evidência comercial. Se a direção não muda a conversa de venda ou retenção, ela ainda está abstrata demais.',
        tag: 'LIGA RECEITA',
        synth: {
          agreements: ['Plano estratégico deve produzir movimento comercial mensurável.'],
          risks: ['Direção sem teste comercial demora a revelar se funciona.'],
        },
      },
    ],
    campaign: [
      {
        code: 'BB',
        text: `Vou conduzir como plano de marketing e marca. A saída esperada para ${name} é posicionamento, narrativa, canais, campanha, workstreams, KPIs e evidências que precisam entrar no Company Brain.`,
        tag: 'ABRE MARKETING',
        synth: {
          agreements: ['A sessão deve construir plano de marketing antes de sugerir decisões futuras.'],
          risks: ['Pular direto para campanha sem diagnóstico de marca cria execução frágil.'],
        },
      },
      {
        code: 'CMO',
        text: 'Eu começaria pelo posicionamento: quem precisa nos escolher, contra qual alternativa, por que agora e que frase o mercado deveria conseguir repetir. Sem essa memória, canais e campanha só amplificam ruído.',
        tag: 'POSICIONAMENTO',
        synth: {
          agreements: ['O plano precisa de uma promessa simples e defensável.'],
          disagreements: ['Mais canal não resolve uma mensagem indistinta.'],
        },
      },
      {
        code: 'MDA',
        text: 'Para GTM, eu separaria canal de ritual de compra. Quais canais chegam ao ICP, qual oferta abre a conversa, que prova reduz risco e qual sequência transforma atenção em pipeline ou demanda qualificada?',
        tag: 'DESENHA GTM',
        synth: {
          agreements: ['Plano de marketing precisa explicar canal, oferta e sequência.'],
          risks: ['Escolher canal sem ritual de compra claro desperdiça energia.'],
        },
      },
      {
        code: 'CRO',
        text: 'Receita entra para garantir que o plano gere conversa comercial. Quero ver impacto em pitch, objeções, proposta de valor, conversão e pipeline. Marketing que não conversa com venda fica difícil de defender.',
        tag: 'LIGA PIPELINE',
        synth: {
          agreements: ['KPIs comerciais devem acompanhar KPIs de marca e campanha.'],
          risks: ['Métricas de vaidade podem mascarar falta de receita.'],
        },
      },
      {
        code: 'CAT',
        text: 'Categoria: o plano precisa dizer contra qual comparação mental estamos competindo. Se o cliente compara por preço, conveniência, confiança ou status, a mensagem precisa vencer nesse critério real.',
        tag: 'CATEGORIA',
        synth: {
          agreements: ['A narrativa deve vencer uma comparação de categoria concreta.'],
          disagreements: ['A empresa pode estar contando uma história diferente da que o cliente usa para comprar.'],
        },
      },
      {
        code: 'CRM',
        text: 'Cliente e comunidade: antes de escalar campanha, eu buscaria sinais qualitativos de quem já confia, compra, retorna ou indica. Isso alimenta prova, segmentação e mensagens menos genéricas.',
        tag: 'PROVA DE CLIENTE',
        synth: {
          agreements: ['A voz do cliente deve alimentar posicionamento e prova.'],
          risks: ['Sem evidência de cliente, o plano pode ficar autocentrado.'],
        },
      },
    ],
  }
}

function buildCannedTurns(diagnosis: StrategyDiagnosis): DecisionRoomPack['cannedTurns'] {
  return {
    challenge: {
      code: 'MDA',
      text: 'Pressão adicional: escolha uma situação real de compra, venda, contratação, operação ou cliente. Quem precisa mudar de comportamento? O que essa pessoa faz diferente depois da recomendação ou do plano? Sem esse exemplo, a tese ainda está longe demais da execução.',
      tag: 'PRESSIONA A TESE',
      synth: {
        disagreements: ['Sem exemplo operacional, a recomendação pode soar genérica.'],
        risks: ['A sala pode recomendar uma direção que ninguém consegue executar na prática.'],
      },
    },
    evidence: {
      code: 'RE',
      text: `Pedido de evidência: ${diagnosis.missingContext.slice(0, 4).join(' ')} Se esses dados não existirem agora, registre a lacuna e transforme a recomendação em plano condicional ou fase de validação.`,
      tag: 'DADOS NECESSÁRIOS',
      studio: true,
      synth: {
        agreements: ['É possível avançar sem todos os dados, desde que a recomendação seja condicional.'],
        risks: ['Lacunas escondidas viram falsa confiança.'],
      },
    },
    invite: {
      code: 'CAT',
      text: 'Papel convidado: especialista de categoria. Minha recomendação é escolher um benchmark, um concorrente e um substituto. A sala precisa saber contra quem o plano compete na cabeça do cliente, do investidor, do parceiro ou do time.',
      tag: 'CATEGORIA CONVIDADA',
      synth: {
        agreements: ['Comparações externas ajudam a testar se a tese é defensável.'],
        risks: ['Sem referência de categoria, o plano pode ficar autocentrado.'],
      },
    },
  }
}

function buildDecision(company: CurrentCompany | null, diagnosis: StrategyDiagnosis): DecisionRecord {
  const name = companyLabel(company)
  return {
    id: `DEC-${company?.slug?.toUpperCase() ?? 'GEN'}-001`,
    statement: `Validar a decisão prioritária de ${name} com condições, evidências mínimas e revisão em 30 dias.`,
    rationale: `A sala convergiu que ${name} pode avançar se a decisão registrar o que está confirmado, o que permanece hipótese e quais dados precisam ser coletados antes de escalar.`,
    rejectedOptions: ['Aprovar escala sem dados mínimos', 'Adiar indefinidamente sem dono', 'Transformar a conversa em opinião sem decisão registrada'],
    confidence: diagnosis.confidence,
    owner: 'Founder + Board Brain',
    conditions: ['Registrar lacunas aceitas', 'Definir dono e métrica de prova', 'Coletar evidências mínimas', 'Revisar a decisão em 30 dias'],
    reviewDate: addDays(30),
    linked: diagnosis.evidenceMap.map(item => item.source).slice(0, 5),
  }
}

function buildOutputs(company: CurrentCompany | null): ExecutionOutput[] {
  const name = companyLabel(company)
  return [
    { type: 'plan', title: `Plano consultivo - ${name}`, body: 'Diagnóstico, análise executiva, recomendação, workstreams, KPIs, riscos, premissas e perguntas que precisam virar decisão.', sources: ['Advisory Session', 'Company Brain'], pages: 7 },
    { type: 'memo', title: `Memo da decisão - ${name}`, body: 'Decisão, racional, opções rejeitadas, condições, evidências e perguntas abertas para revisão.', sources: ['Decision Room', 'Company Brain'], pages: 4 },
    { type: 'strategy', title: 'Brief de estratégia', body: 'Tese central, opções, riscos, condições, implicações para operação e mercado.', sources: ['Strategy Core', 'Company Brain'], pages: 5 },
    { type: 'sales', title: 'Narrativa comercial', body: 'Nova abertura comercial, objeções, proposta de valor e sinais de validação.', sources: ['CRO', 'CMO', 'Go-to-market'], pages: 4 },
    { type: 'plan', title: 'Plano de validação em 30 dias', body: 'Donos, marcos, pedidos de dados, checkpoints e gates de decisão.', sources: ['Decision Room', 'PM Studio'], pages: 4 },
    { type: 'minutes', title: 'Ata da sala', body: 'Síntese dos turnos, divergências, riscos e condições para avançar sem dados completos.', sources: ['Hot Seat transcript', 'Synthesis'], pages: 3 },
  ]
}

function buildFollowUps(diagnosis: StrategyDiagnosis): FollowUp[] {
  return [
    { title: 'Fechar evidências mínimas da decisão', owner: 'Founder + Board Brain', due: addDays(10), status: 'Aberto', dependency: diagnosis.missingContext[0] ?? 'Company Brain', escalation: 'Escalar se a decisão estiver avançando sem evidência registrada.' },
    { title: 'Definir dono, métrica e checkpoint de 30 dias', owner: 'CEO Operador', due: addDays(7), status: 'Aberto', dependency: 'Decisão aprovada ou adiada', escalation: 'Sem dono e revisão, não registrar como decisão final.' },
    { title: 'Revisar a decisão com novos dados', owner: 'Board Brain', due: addDays(30), status: 'Aberto', dependency: 'Evidências coletadas e execução inicial', escalation: 'Abrir Revisão de Decisão se as condições não forem cumpridas.' },
  ]
}

async function loadCurrentCompanyBrain() {
  const user = await getSessionUser()
  if (!user) {
    return {
      company: null,
      entries: [] as MemoryEntry[],
      documents: [] as UploadedDocument[],
      snapshot: null as BoardSourceSnapshot | null,
    }
  }

  const company = await getCurrentCompanyForUser(user)
  if (!company) {
    return {
      company: null,
      entries: [] as MemoryEntry[],
      documents: [] as UploadedDocument[],
      snapshot: null as BoardSourceSnapshot | null,
    }
  }
  const snapshot = await resolveBoardSourceSnapshot({ company })

  return {
    company,
    entries: snapshot.brainEntries.map(entry => ({
      id: entry.id,
      category: entry.category,
      source_type: entry.sourceType,
      title: entry.title,
      content: entry.content,
      confidence_score: entry.confidenceScore,
      source_document_id: entry.sourceDocumentId,
      created_at: entry.createdAt,
    })),
    documents: snapshot.documents.map(document => ({
      id: document.id,
      original_filename: document.filename,
      document_type: document.documentType,
      status: document.status,
      summary: document.summary,
      created_at: document.createdAt,
    })),
    snapshot,
  }
}

export async function buildGenericDecisionRoomPack(): Promise<DecisionRoomPack> {
  const { company, entries, documents, snapshot } = await loadCurrentCompanyBrain()
  const diagnosis = buildDiagnosis(company, entries, documents, snapshot ?? undefined)
  const boardBrief = buildBrief(diagnosis)
  const decisions = [buildDecision(company, diagnosis)]
  const outputs = buildOutputs(company)
  const followUps = buildFollowUps(diagnosis)
  const advisoryTranscripts = buildAdvisoryTranscripts(company, diagnosis)

  return {
    readout: {
      mode: 'mock',
      sourceSnapshot: snapshot ? summarizeSourceSnapshot(snapshot) : undefined,
      boardAgents: genericBoardAgents,
      studioAgents: genericStudioAgents,
      sessionTypes: genericSessionTypes,
      diagnosis,
      boardBrief,
      decisions,
      outputs,
      followUps,
    },
    transcript: buildTranscript(company, diagnosis),
    advisoryTranscripts,
    cannedTurns: buildCannedTurns(diagnosis),
    decisions,
    followUps,
    outputs,
  }
}
