'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { AgentCode, BoardTurn, DecisionRoomReadout, SessionTypeId } from '@/lib/decision-room/types'
import { AdvisorMark, Meter, PageHeader, Panel, SectionTitle, StatusPill } from '@/components/shadow-board/ui'

type ScreenProps = {
  readout: DecisionRoomReadout
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function agentFor(code: string, boardAgents: DecisionRoomReadout['boardAgents']) {
  return boardAgents.find(agent => agent.code === code)
}

function evidenceTone(status: string): 'positive' | 'critical' | 'caution' | 'neutral' {
  if (status === 'CONFIRMADO') return 'positive'
  if (status === 'FALTANDO' || status === 'RISCO ATIVO') return 'critical'
  if (status === 'PARCIAL') return 'caution'
  return 'neutral'
}

function collectSynth(log: BoardTurn[]) {
  return log.reduce(
    (acc, turn) => {
      turn.synth?.agreements?.forEach(item => acc.agreements.push(item))
      turn.synth?.disagreements?.forEach(item => acc.disagreements.push(item))
      turn.synth?.risks?.forEach(item => acc.risks.push(item))
      return acc
    },
    { agreements: [] as string[], disagreements: [] as string[], risks: [] as string[] },
  )
}

function shortRequestLabel(item: string) {
  return item.split(':')[0]?.trim() || item
}

function newRoomId() {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function lowContext(diagnosis: DecisionRoomReadout['diagnosis']) {
  return diagnosis.confidence < 58 || diagnosis.evidenceMap.some(item => item.status === 'FALTANDO')
}

function advisorTurnCount(log: BoardTurn[]) {
  return log.filter(turn => !turn.studio).length
}

type AdvisoryPlan = {
  title: string
  subtitle: string
  question: string
  closeLabel: string
  primaryOutput: string
  queue: string[]
  focus: string[]
  workstreams: Array<{ label: string; detail: string; kpi: string }>
  emptyTitle: string
  emptyBody: string
}

const defaultAdvisorSelection: AgentCode[] = ['BB', 'CMO', 'CFO', 'CRO']

const advisoryPlans: Partial<Record<SessionTypeId, AdvisoryPlan>> = {
  problem: {
    title: 'Diagnóstico consultivo',
    subtitle: 'Vamos primeiro nomear o problema, separar sintomas de causa e decidir que tipo de ajuda vem depois.',
    question: 'O que está realmente acontecendo, quais hipóteses explicam o problema e que evidência precisamos pedir antes de recomendar um caminho?',
    closeLabel: 'Salvar diagnóstico',
    primaryOutput: 'Diagnóstico executivo',
    queue: ['Diagnóstico executivo', 'Perguntas melhores', 'Próximas decisões sugeridas'],
    focus: ['Problema declarado vs. problema inferido', 'Hipóteses concorrentes', 'Lacunas de contexto', 'Próximas opções de ação'],
    workstreams: [
      { label: 'Diagnóstico', detail: 'Sintomas, causa provável, tensão central e hipóteses alternativas.', kpi: 'Confiança do diagnóstico' },
      { label: 'Evidência', detail: 'Dados, documentos e conversas que precisam entrar no Company Brain.', kpi: 'Lacunas fechadas' },
      { label: 'Próximas escolhas', detail: 'Decisões que podem surgir depois da investigação.', kpi: 'Decisões candidatas' },
    ],
    emptyTitle: 'Comece pela investigação, não por uma decisão.',
    emptyBody: 'Os advisors vão ajudar a formular melhor o problema, pedir contexto e transformar a conversa em um diagnóstico utilizável.',
  },
  reset: {
    title: 'Plano estratégico consultivo',
    subtitle: 'Vamos transformar contexto disperso em direção, prioridades, workstreams, KPIs e riscos assumidos.',
    question: 'Qual plano estratégico faz sentido agora, quais frentes de trabalho precisam existir e como saberemos se a direção está funcionando?',
    closeLabel: 'Salvar plano estratégico',
    primaryOutput: 'Plano estratégico',
    queue: ['Resumo executivo consultivo', 'Plano estratégico', 'Workstreams e KPIs'],
    focus: ['Diagnóstico executivo', 'Prioridades', 'Workstreams', 'KPIs', 'Riscos e premissas'],
    workstreams: [
      { label: 'Direção', detail: 'Tese, escolhas explícitas, não escolhas e prioridades de 30 a 90 dias.', kpi: 'Prioridades fechadas' },
      { label: 'Execução', detail: 'Workstreams, donos, cadência e dependências operacionais.', kpi: 'Marcos cumpridos' },
      { label: 'Controle', detail: 'KPIs, riscos, premissas e gatilhos de revisão.', kpi: 'Sinais de avanço' },
    ],
    emptyTitle: 'A sala vai construir um plano, não forçar uma aprovação.',
    emptyBody: 'Use os turnos para chegar em direção, ações, responsáveis e métricas antes de transformar qualquer coisa em decisão formal.',
  },
  campaign: {
    title: 'Plano de marketing e marca',
    subtitle: 'Vamos usar CMO, go-to-market, receita e categoria para construir posicionamento, narrativa, canais, campanha e KPIs.',
    question: 'Qual plano de marketing, marca e go-to-market deve sair daqui, e que evidências de cliente, categoria e receita precisam sustentá-lo?',
    closeLabel: 'Salvar plano de marketing',
    primaryOutput: 'Plano de marketing',
    queue: ['Diagnóstico de marca', 'Narrativa e posicionamento', 'Plano de marketing', 'Workstreams e KPIs'],
    focus: ['Posicionamento', 'Narrativa', 'Canais', 'Campanha', 'KPIs comerciais'],
    workstreams: [
      { label: 'Posicionamento', detail: 'ICP, categoria, promessa, diferenciação e memória que o mercado deve repetir.', kpi: 'Clareza da proposta' },
      { label: 'Narrativa e campanha', detail: 'Mensagem central, provas, ofertas, criativos e sequência de campanha.', kpi: 'Engajamento e resposta' },
      { label: 'GTM e receita', detail: 'Canais, pipeline, objeções, handoff comercial e próximos testes.', kpi: 'Conversão e pipeline' },
    ],
    emptyTitle: 'Esta sala começa como consultoria de marketing.',
    emptyBody: 'Os advisors vão construir diagnóstico de marca, narrativa, plano de mercado, workstreams e KPIs antes de sugerir decisões futuras.',
  },
}

function advisoryPlanFor(id: string | null | undefined) {
  return id ? advisoryPlans[id as SessionTypeId] ?? null : null
}

function defaultQuestionForSession(id: SessionTypeId, diagnosis: DecisionRoomReadout['diagnosis']) {
  return advisoryPlans[id]?.question ?? diagnosis.recommendedQuestion
}

function defaultQueueForSession(id: SessionTypeId) {
  return advisoryPlans[id]?.queue ?? []
}

function defaultAgentsForSession(id: SessionTypeId): AgentCode[] {
  if (id === 'campaign') return ['BB', 'CMO', 'MDA', 'CRO', 'CAT', 'CRM']
  if (id === 'reset') return ['BB', 'CEO', 'CFO', 'CMO', 'CRO', 'PRD']
  if (id === 'problem') return ['BB', 'CEO', 'CMO', 'CFO']
  return defaultAdvisorSelection
}

function sameSelection(a: AgentCode[], b: AgentCode[]) {
  return a.length === b.length && a.every((code, index) => code === b[index])
}

function isAutoAdvisorSelection(current: AgentCode[]) {
  return [
    defaultAdvisorSelection,
    defaultAgentsForSession('problem'),
    defaultAgentsForSession('reset'),
    defaultAgentsForSession('campaign'),
  ].some(selection => sameSelection(current, selection))
}

function EvidenceList({ diagnosis }: { diagnosis: DecisionRoomReadout['diagnosis'] }) {
  return (
    <div className="grid gap-3">
      {diagnosis.evidenceMap.map(item => (
        <article key={`${item.claim}-${item.source}`} className="sb-row-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="sb-row-title">{item.claim}</p>
              <p className="sb-muted mt-1">{item.source}</p>
            </div>
            <StatusPill tone={evidenceTone(item.status)}>{item.status}</StatusPill>
          </div>
        </article>
      ))}
    </div>
  )
}

export function DecisionDashboardScreen({ readout }: ScreenProps) {
  const { boardAgents, diagnosis, decisions, followUps } = readout
  const missingCount = diagnosis.missingContext.length
  const riskScore = Math.min(100, Math.max(22, missingCount * 14 + diagnosis.evidenceMap.filter(item => item.status === 'FALTANDO').length * 18))
  const openFollowUps = followUps.filter(item => item.status !== 'Concluído').length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="01 - Painel"
        title="Board OS Decision Room"
        description="A base de comando para diagnosticar, instruir a sala, decidir, gerar entregáveis e preservar memória."
        action={<Link href="/rooms" className="btn-primary">Abrir Hot Seat</Link>}
      />

      <section className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        <Panel>
          <p className="sb-eyebrow">Contexto</p>
          <div className="mt-5 flex items-baseline gap-2">
            <strong className="sb-metric-value">{diagnosis.confidence}</strong>
            <span className="sb-muted">/ 100</span>
          </div>
          <Meter value={diagnosis.confidence} tone={diagnosis.confidence >= 70 ? 'positive' : 'caution'} />
        </Panel>
        <Panel>
          <p className="sb-eyebrow">Risco</p>
          <div className="mt-5 flex items-baseline gap-2">
            <strong className="sb-metric-value sb-tone-caution">{riskScore}</strong>
            <span className="sb-muted">/ 100</span>
          </div>
          <Meter value={riskScore} tone={riskScore >= 70 ? 'critical' : 'caution'} />
        </Panel>
        <Panel>
          <p className="sb-eyebrow">Decisões abertas</p>
          <div className="mt-5 flex items-baseline gap-2">
            <strong className="sb-metric-value">{decisions.length}</strong>
            <span className="sb-muted">aguardando sala</span>
          </div>
          <Meter value={Math.min(100, decisions.length * 22)} tone="neutral" />
        </Panel>
        <Panel>
          <p className="sb-eyebrow">Follow-ups</p>
          <div className="mt-5 flex items-baseline gap-2">
            <strong className="sb-metric-value sb-tone-critical">{openFollowUps}</strong>
            <span className="sb-muted">em aberto</span>
          </div>
          <Meter value={Math.min(100, openFollowUps * 18)} tone={openFollowUps ? 'critical' : 'positive'} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel tone="chamber">
          <SectionTitle label="Salas ativas" />
          <div className="grid gap-3">
            <article className="sb-room-row">
              <div>
                <p className="sb-code">HS · AO VIVO</p>
                <h3>{diagnosis.recommendedQuestion}</h3>
                <p>Hot Seat com agentes instruídos, múltiplas perguntas e síntese ao vivo.</p>
              </div>
              <Link href="/rooms" className="btn-gold">Continuar</Link>
            </article>
            <article className="sb-room-row">
              <div>
                <p className="sb-code">PB-018 · PAUSADA</p>
                <h3>Qual problema a queda de margem realmente revela?</h3>
                <p>Problem Build aguardando contexto financeiro.</p>
              </div>
              <Link href="/diagnosis" className="btn-chamber">Ver diagnóstico</Link>
            </article>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionTitle label="Próxima sala recomendada" />
            <p className="sb-serif-callout">Hot Seat: pressionar a próxima decisão antes de comprometer execução.</p>
            <p className="sb-muted mt-3">{diagnosis.recommendedQuestion}</p>
            <Link href="/rooms" className="btn-primary mt-4">Rodar sala</Link>
          </Panel>
          <Panel>
            <SectionTitle label="Dados que faltam" />
            <ul className="sb-clean-list">
              {diagnosis.missingContext.map(item => <li key={item}>{item}</li>)}
            </ul>
          </Panel>
        </div>
      </section>

      <Panel>
        <SectionTitle label="Conselho estratégico" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {boardAgents.map(agent => (
            <article key={agent.code} className="sb-agent-token">
              <AdvisorMark code={agent.code} color={agent.color} />
              <p>{agent.short}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function CompanyBrainDecisionScreen({ readout }: ScreenProps) {
  const { diagnosis } = readout
  const confirmed = diagnosis.evidenceMap.filter(item => item.status === 'CONFIRMADO').length
  const partial = diagnosis.evidenceMap.filter(item => item.status === 'PARCIAL').length
  const missing = diagnosis.missingContext.length
  const categoryScores = [
    ['Fatos da empresa', Math.min(100, confirmed * 18 + partial * 8)],
    ['Financeiro', diagnosis.missingContext.some(item => /finance|receita|margem|caixa|unit economics/i.test(item)) ? 35 : 82],
    ['Riscos', diagnosis.missingContext.some(item => /risco|downside|premissa/i.test(item)) ? 48 : 78],
    ['Arquivos-fonte', Math.min(100, diagnosis.evidenceMap.length * 16)],
    ['Decisões passadas', diagnosis.missingContext.some(item => /decis/i.test(item)) ? 42 : 76],
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="02 - Company Brain"
        title="Memória que limita a confiança"
        description="A sala só deve pressionar uma decisão com o contexto que consegue provar, derivar ou marcar como risco ativo."
        action={<Link href="/company/intake" className="btn-secondary">Adicionar contexto</Link>}
      />
      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle label="Completude por categoria" />
          {categoryScores.map(([label, value]) => (
            <div key={label} className="mb-4">
              <div className="flex justify-between gap-3 text-sm font-semibold"><span>{label}</span><span>{value}%</span></div>
              <Meter value={Number(value)} tone={Number(value) > 75 ? 'positive' : 'caution'} />
            </div>
          ))}
          <p className="sb-muted mt-2">{missing} lacunas ativas registradas para orientar a próxima sala.</p>
        </Panel>
        <Panel>
          <SectionTitle label="Timeline de evidências" />
          <EvidenceList diagnosis={diagnosis} />
        </Panel>
      </section>
    </div>
  )
}

export function DiagnosisScreen({ readout }: ScreenProps) {
  const { diagnosis } = readout

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="03 - Diagnóstico"
        title="Readout da Strategy Core"
        description="Antes de entrar na sala, o founder vê o problema declarado, o problema inferido, as tensões e o mapa de evidências."
        action={<Link href="/briefings" className="btn-primary">Instruir conselho</Link>}
      />
      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <SectionTitle label="Problema declarado vs inferido" />
          <div className="grid gap-4 md:grid-cols-2">
            <article className="sb-row-card">
              <p className="sb-code">DECLARADO</p>
              <h3 className="sb-row-title mt-2">{diagnosis.statedProblem}</h3>
            </article>
            <article className="sb-row-card">
              <p className="sb-code">INFERIDO</p>
              <h3 className="sb-row-title mt-2">{diagnosis.inferredProblem}</h3>
            </article>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="sb-row-card"><p className="sb-code">TENSÃO A</p><p className="sb-muted mt-2">{diagnosis.tension.a}</p></article>
            <article className="sb-row-card"><p className="sb-code">TENSÃO B</p><p className="sb-muted mt-2">{diagnosis.tension.b}</p></article>
          </div>
        </Panel>
        <Panel>
          <SectionTitle label="Confiança do diagnóstico" />
          <p className="sb-big-number">{diagnosis.confidence}%</p>
          <Meter value={diagnosis.confidence} tone="positive" />
          <p className="sb-muted mt-4">A confiança sobe quando os dados comerciais, a arquitetura da oferta e os sinais de agência forem confirmados.</p>
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle label="Enquadramentos possíveis" />
          <div className="grid gap-3">
            {diagnosis.frames.map(frame => (
              <article key={frame.title} className={`sb-row-card ${frame.selected ? 'sb-selected-card' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="sb-row-title">{frame.title}</h3>
                    <p className="sb-muted mt-1">{frame.detail}</p>
                  </div>
                  {frame.selected && <StatusPill tone="caution">Escolha SC</StatusPill>}
                </div>
              </article>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle label="Mapa de evidências" />
          <EvidenceList diagnosis={diagnosis} />
        </Panel>
      </section>

      <Panel>
        <p className="sb-code">PERGUNTA RECOMENDADA AO CONSELHO</p>
        <p className="sb-serif-callout mt-3">{diagnosis.recommendedQuestion}</p>
      </Panel>
    </div>
  )
}

export function BriefingsScreen({ readout }: ScreenProps) {
  const { boardAgents, boardBrief } = readout

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="04 - Briefings"
        title="Agentes instruídos antes de falar"
        description="O valor aqui é visível: cada papel recebe ângulo, evidências e pressão antes da sala começar."
        action={<Link href="/rooms" className="btn-primary">Escolher sala</Link>}
      />
      <Panel tone="dossier">
        <SectionTitle label="Brief do conselho" />
        <p className="sb-serif-callout">{boardBrief.boardBrief}</p>
        <p className="sb-muted mt-3">Brief Engine · derivado do Diagnóstico & Company Brain</p>
      </Panel>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boardBrief.roleBriefs.map(brief => {
          const agent = agentFor(brief.code, boardAgents)
          return (
            <Panel key={brief.code}>
              <div className="flex items-center justify-between gap-3">
                <AdvisorMark code={brief.code} color={agent?.color ?? '#4A5A6A'} />
                <StatusPill tone="positive">INSTRUÍDO</StatusPill>
              </div>
              <h2 className="mt-4 text-sm font-bold">{agent?.role}</h2>
              <p className="sb-code mt-4">Ângulo</p>
              <p className="sb-muted mt-1">{brief.angle}</p>
              <p className="sb-code mt-4">Evidência</p>
              <p className="sb-muted mt-1">{brief.evidence}</p>
              <p className="sb-code mt-4">Pressão</p>
              <p className="sb-muted mt-1">{brief.pressure}</p>
            </Panel>
          )
        })}
      </section>
    </div>
  )
}

export function RoomsScreen({ readout }: ScreenProps) {
  const { boardAgents, diagnosis, sessionTypes } = readout
  const [clientRoomId, setClientRoomId] = useState(() => newRoomId())
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<AgentCode[]>(defaultAdvisorSelection)
  const [log, setLog] = useState<BoardTurn[]>([])
  const [baseIdx, setBaseIdx] = useState(0)
  const [baseComplete, setBaseComplete] = useState(false)
  const [isolate, setIsolate] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [roomError, setRoomError] = useState('')
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [decided, setDecided] = useState<'approved' | 'deferred' | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [activeQuestion, setActiveQuestion] = useState(diagnosis.recommendedQuestion)
  const [requestedData, setRequestedData] = useState<string[]>([])
  const [bypassedData, setBypassedData] = useState<string[]>([])
  const [founderNotes, setFounderNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [boardSessionId, setBoardSessionId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [exportError, setExportError] = useState('')

  const synth = useMemo(() => collectSynth(log), [log])
  const active = sessionTypes.find(item => item.id === activeSession)
  const decisionQuestions = diagnosis.decisionQuestions?.length ? diagnosis.decisionQuestions : [diagnosis.recommendedQuestion]
  const needsIntake = lowContext(diagnosis)
  const advisorySessions = sessionTypes.filter(session => session.kind === 'advisory')
  const boardSessions = sessionTypes.filter(session => session.kind !== 'advisory')
  const activeKind = sessionTypes.find(session => session.id === activeSession)?.kind ?? 'board'
  const isAdvisory = activeKind === 'advisory'
  const activePlan = advisoryPlanFor(activeSession)
  const turnLimit = active?.maxTurns ?? (activeKind === 'advisory' ? 6 : 8)
  const usedAdvisorTurns = advisorTurnCount(log)
  const turnLimitReached = usedAdvisorTurns >= turnLimit
  const logView = isolate
    ? log.filter(turn => /DISCORDA|ATACA|PARCIAL|PRESSIONA|CONDICIONA|DADOS|RISCO/.test(turn.tag))
    : log

  function startSession(id: string) {
    const sessionId = id as SessionTypeId
    setClientRoomId(newRoomId())
    setActiveSession(id)
    setLog([])
    setBaseIdx(0)
    setBaseComplete(false)
    setIsolate(false)
    setThinking(false)
    setRoomError('')
    setDecisionOpen(false)
    setDecided(null)
    setQueue(defaultQueueForSession(sessionId))
    setActiveQuestion(defaultQuestionForSession(sessionId, diagnosis))
    setRequestedData([])
    setBypassedData([])
    setFounderNotes('')
    setSaveStatus('idle')
    setBoardSessionId(null)
    setExporting(false)
    setExportUrl(null)
    setExportError('')
    setSelectedAgents(current => {
      return isAutoAdvisorSelection(current) ? defaultAgentsForSession(sessionId) : current
    })
  }

  function toggleAgent(code: AgentCode) {
    setSelectedAgents(current => {
      if (code === 'BB') return current.includes('BB') ? current : ['BB', ...current]
      return current.includes(code)
        ? current.filter(item => item !== code)
        : [...current, code]
    })
  }

  function pushTurn(turn: BoardTurn) {
    setLog(current => [...current, turn])
  }

  async function saveSession(snapshot?: {
    log?: BoardTurn[]
    queue?: string[]
    requestedData?: string[]
    bypassedData?: string[]
    activeQuestion?: string
    baseIdx?: number
    baseComplete?: boolean
    decided?: 'approved' | 'deferred' | null
  }) {
    if (!activeSession) return null
    setSaveStatus('saving')
    try {
      const noteTurn: BoardTurn | null = founderNotes.trim()
        ? { code: 'BB', tag: 'NOTAS DO FOUNDER', text: founderNotes.trim(), studio: true }
        : null
      const persistedLog = snapshot?.log ?? log
      const response = await fetch('/api/decision-room/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRoomId,
          sessionId: activeSession,
          activeQuestion: snapshot?.activeQuestion ?? activeQuestion,
          queue: snapshot?.queue ?? queue,
          log: noteTurn ? [...persistedLog, noteTurn] : persistedLog,
          requestedData: snapshot?.requestedData ?? requestedData,
          bypassedData: snapshot?.bypassedData ?? bypassedData,
          baseIdx: snapshot?.baseIdx ?? baseIdx,
          baseComplete: snapshot?.baseComplete ?? baseComplete,
          sessionKind: activeKind,
          selectedAgents,
          decided: snapshot?.decided ?? decided,
        }),
      })
      if (!response.ok) throw new Error('save_failed')
      const payload = await response.json().catch(() => null) as { persistence?: { boardSessionId?: string } } | null
      if (payload?.persistence?.boardSessionId) setBoardSessionId(payload.persistence.boardSessionId)
      setSaveStatus('saved')
      return payload?.persistence?.boardSessionId ?? boardSessionId
    } catch {
      setSaveStatus('error')
      return null
    }
  }

  async function exportSession() {
    if (exporting) return
    setExporting(true)
    setExportError('')
    try {
      const savedSessionId = await saveSession()
      const targetSessionId = savedSessionId ?? boardSessionId
      if (!targetSessionId) throw new Error('Salve a sessão antes de exportar o PDF.')
      const response = await fetch('/api/session-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_session_id: targetSessionId,
          export_type: 'pdf',
        }),
      })
      const payload = await response.json().catch(() => null) as { signed_url?: string | null; error?: string } | null
      if (!response.ok || !payload?.signed_url) throw new Error(payload?.error ?? 'Não foi possível exportar a sessão.')
      setExportUrl(payload.signed_url)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Não foi possível exportar a sessão.')
    } finally {
      setExporting(false)
    }
  }

  async function nextTurn() {
    if (!activeSession || thinking) return
    if (turnLimitReached) {
      setBaseComplete(true)
      setRoomError(`Limite desta sessão atingido: ${turnLimit} turnos de advisor. Encerre com plano, decisão ou pedido de mais contexto.`)
      void saveSession({ baseComplete: true })
      return
    }
    setThinking(true)
    setRoomError('')
    try {
      const response = await fetch('/api/decision-room/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, index: baseIdx, selectedAgents }),
      })
      const payload = await response.json().catch(() => null) as { turn?: BoardTurn | null; error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Turno falhou.')
      if (payload?.turn) {
        const nextBaseIdx = baseIdx + 1
        const nextLog = [...log, payload.turn]
        setBaseIdx(nextBaseIdx)
        setLog(nextLog)
        void saveSession({ log: nextLog, baseIdx: nextBaseIdx })
      } else {
        setBaseComplete(true)
        void saveSession({ baseComplete: true })
      }
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Turno falhou. A síntese foi preservada.')
    } finally {
      setThinking(false)
    }
  }

  async function requestIntervention(kind: 'challenge' | 'evidence' | 'invite') {
    if (!activeSession || thinking) return
    if (turnLimitReached) {
      setRoomError(`Limite desta sessão atingido: ${turnLimit} turnos de advisor. Encerre com plano, decisão ou pedido de mais contexto.`)
      return
    }
    setThinking(true)
    setRoomError('')
    try {
      const response = await fetch('/api/decision-room/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, kind, log, selectedAgents }),
      })
      const payload = await response.json().catch(() => null) as { turn?: BoardTurn; error?: string } | null
      if (!response.ok || !payload?.turn) throw new Error(payload?.error ?? 'Intervenção falhou.')
      const nextLog = [...log, payload.turn]
      setLog(nextLog)
      void saveSession({ log: nextLog })
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Intervenção falhou. A síntese foi preservada.')
    } finally {
      setThinking(false)
    }
  }

  async function captureDecision(state: 'approved' | 'deferred') {
    if (!activeSession || thinking) return
    setThinking(true)
    setRoomError('')
    try {
      const response = await fetch('/api/decision-room/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession,
          state,
          clientRoomId,
          activeQuestion,
          queue,
          log,
          requestedData,
          bypassedData,
          selectedAgents,
        }),
      })
      const payload = await response.json().catch(() => null) as {
        queue?: string[]
        error?: string
        persistence?: { boardSessionId?: string }
      } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível registrar a decisão.')
      setDecided(state)
      setDecisionOpen(false)
      if (payload?.persistence?.boardSessionId) setBoardSessionId(payload.persistence.boardSessionId)
      if (payload?.queue) setQueue(payload.queue)
      void saveSession({ queue: payload?.queue ?? queue, decided: state })
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Não foi possível registrar a decisão.')
    } finally {
      setThinking(false)
    }
  }

  function enqueue(item: string) {
    const nextQueue = Array.from(new Set([...queue, item]))
    setQueue(nextQueue)
    void saveSession({ queue: nextQueue })
  }

  function requestData(item: string) {
    const nextRequested = Array.from(new Set([...requestedData, item]))
    const nextQueue = Array.from(new Set([...queue, `Pedido de dados: ${shortRequestLabel(item)}`]))
    const turn: BoardTurn = {
      code: 'RE',
      tag: 'DADOS SOLICITADOS',
      studio: true,
      text: `A sala registrou um pedido de dados: ${item} Sem esse bloco, a recomendação deve ficar condicional e aparecer no follow-up.`,
      synth: {
        risks: [`Dado ausente: ${shortRequestLabel(item)}`],
      },
    }
    const nextLog = [...log, turn]
    setRequestedData(nextRequested)
    setQueue(nextQueue)
    setLog(nextLog)
    void saveSession({ log: nextLog, queue: nextQueue, requestedData: nextRequested })
  }

  function bypassData(item: string) {
    const nextBypassed = Array.from(new Set([...bypassedData, item]))
    const turn: BoardTurn = {
      code: 'BB',
      tag: 'LACUNA ACEITA',
      text: `Lacuna aceita para esta rodada: ${item} A sala pode avançar, mas a decisão precisa registrar que esta evidência não estava disponível.`,
      synth: {
        risks: [`A decisão avançou sem ${shortRequestLabel(item).toLowerCase()}.`],
      },
    }
    const nextLog = [...log, turn]
    setBypassedData(nextBypassed)
    setLog(nextLog)
    void saveSession({ log: nextLog, bypassedData: nextBypassed })
  }

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sessões"
          title="Escolha que tipo de ajuda você precisa"
          description="Comece por diagnóstico e conselho quando o problema ainda está aberto. Use uma sessão de board quando já existe uma decisão para revisar."
        />
        <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <Panel>
            <SectionTitle label="Estado do contexto" />
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={needsIntake ? 'critical' : 'positive'}>
                {diagnosis.confidence}% confiança
              </StatusPill>
            </div>
            <p className="sb-muted mt-3">
              {needsIntake
                ? 'A sessão pode começar, mas a recomendação deve registrar lacunas e perguntas abertas.'
                : 'O contexto atual já sustenta uma conversa útil com advisors e próximos passos claros.'}
            </p>
          </Panel>
          <Panel>
            <SectionTitle label="Melhor próximo passo" />
            <p className="sb-muted">
              {needsIntake
                ? 'Conte mais sobre a empresa, envie arquivos ou rode uma sessão consultiva para nomear o problema.'
                : 'Escolha uma sessão consultiva para transformar contexto em plano, ou uma sessão de board para pressionar uma decisão.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/company/intake" className="btn-secondary">Contar o que está acontecendo</Link>
            </div>
          </Panel>
        </section>
        <Panel>
          <SectionTitle label="Advisors desta conversa" />
          <div className="sb-agent-picker">
            {boardAgents.map(agent => (
              <button
                key={agent.code}
                type="button"
                className={selectedAgents.includes(agent.code) ? 'is-selected' : ''}
                onClick={() => toggleAgent(agent.code)}
              >
                <AdvisorMark code={agent.code} color={agent.color} size="sm" />
                <span>{agent.short}</span>
              </button>
            ))}
          </div>
        </Panel>
        <section className="grid gap-5 xl:grid-cols-2">
          <Panel>
            <SectionTitle label="Preciso entender o problema" />
            <SessionGrid sessions={advisorySessions} onStart={startSession} />
          </Panel>
          <Panel>
            <SectionTitle label="Preciso decidir" />
            <SessionGrid sessions={boardSessions} onStart={startSession} />
          </Panel>
        </section>
      </div>
    )
  }

  return (
    <div className="sb-room-shell">
      <header className="sb-room-header">
        <div>
          <p className="sb-code">{active?.code} · {active?.name} · {isAdvisory ? 'CONSULTORIA' : 'BOARD'} · {decided ? decided.toUpperCase() : 'AO VIVO'}</p>
          <h1>{isAdvisory && activePlan ? activePlan.title : activeQuestion}</h1>
          <p className="sb-room-lede">
            {isAdvisory && activePlan
              ? activePlan.subtitle
              : 'A sala pressiona uma escolha concreta, registra trade-offs e fecha decisão, condições ou adiamento.'}
          </p>
          {isAdvisory && activePlan ? (
            <div className="sb-room-output-strip">
              {activePlan.focus.map(item => <span key={item}>{item}</span>)}
            </div>
          ) : (
            <div className="sb-room-question-switcher">
              {decisionQuestions.map((question, index) => (
                <button
                  key={question}
                  type="button"
                  className={question === activeQuestion ? 'is-active' : ''}
                  onClick={() => setActiveQuestion(question)}
                >
                  <span>Q{index + 1}</span>
                  <strong>{question}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill tone={saveStatus === 'error' ? 'critical' : saveStatus === 'saved' ? 'positive' : 'neutral'}>
            {saveStatus === 'saving' ? 'Salvando' : saveStatus === 'saved' ? 'Sessão salva' : saveStatus === 'error' ? 'Salvar falhou' : 'Rascunho local'}
          </StatusPill>
          <button type="button" className="btn-chamber" disabled={exporting} onClick={() => void exportSession()}>
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <p className="max-w-[220px] text-right text-xs text-[#B9AD98]">
                {decided ? 'Exporta o readout final da sessão.' : log.length ? 'Exporta um registro em andamento.' : 'Rode turnos antes do PDF final.'}
          </p>
          {exportUrl && <a className="btn-gold" href={exportUrl} target="_blank" rel="noreferrer">Abrir PDF</a>}
          <button type="button" className="btn-chamber-muted" onClick={() => { void saveSession(); setActiveSession(null) }}>Sair da sala</button>
        </div>
      </header>
      {exportError && <p className="sb-error">{exportError}</p>}
      {isAdvisory && activePlan && (
        <section className="sb-advisory-overview">
          <div>
            <p className="sb-code">SAÍDA ESPERADA</p>
            <h2>{activePlan.primaryOutput}</h2>
            <p>{activeQuestion}</p>
          </div>
          <div className="sb-advisory-steps">
            {activePlan.workstreams.map(item => (
              <article key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
                <em>KPI: {item.kpi}</em>
              </article>
            ))}
          </div>
        </section>
      )}
      {decided && (
        <Panel tone="dossier">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="sb-code">PRÓXIMO PASSO</p>
              <h2 className="sb-row-title mt-2">
                {isAdvisory
                  ? 'Sessão registrada. Transforme a análise em plano e próximos passos.'
                  : decided === 'approved' ? 'Decisão registrada. Feche o ciclo.' : 'Decisão adiada. Feche as evidências antes de voltar.'}
              </h2>
              <p className="sb-muted mt-2">
                {decided === 'approved'
                  ? isAdvisory
                    ? 'Exporte o PDF, revise as tarefas e transforme perguntas abertas em decisões futuras quando necessário.'
                    : 'Exporte o PDF, revise a Decision Memory e confirme os follow-ups antes de compartilhar a saída com o founder ou CEO.'
                  : 'Exporte o registro da sala, confirme os dados pedidos e use os follow-ups como condição para uma nova rodada.'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link href="/decisions" className="btn-secondary">Decision Memory</Link>
              <Link href="/follow-ups" className="btn-secondary">Follow-ups</Link>
              <Link href={isAdvisory ? '/company-brain' : '/board-pack'} className="btn-secondary">{isAdvisory ? 'Contexto' : 'Board Pack'}</Link>
            </div>
          </div>
        </Panel>
      )}

      <section className="sb-room-grid">
        <aside className="sb-room-panel">
          <SectionTitle label={isAdvisory ? 'Brief da consultoria' : 'Contexto da sessão'} />
          <p className="sb-room-question">{isAdvisory ? activeQuestion : diagnosis.statedProblem}</p>
          {isAdvisory && (
            <p className="sb-muted mt-3">
              Contexto de partida: {diagnosis.statedProblem}
            </p>
          )}
          <div className="mt-5">
            <p className="sb-code">Gaveta de evidências</p>
            <div className="mt-3 grid gap-2">
              {diagnosis.evidenceMap.slice(0, 4).map(item => (
                <article key={item.claim} className="sb-room-evidence">
                  <span>{item.status}</span>
                  <p>{item.source}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="sb-code">Dados que a sala pode pedir</p>
            <div className="mt-3 grid gap-3">
              {diagnosis.missingContext.slice(0, 5).map(item => {
                const requested = requestedData.includes(item)
                const bypassed = bypassedData.includes(item)
                return (
                  <article key={item} className="sb-room-data-request">
                    <p>{item}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="btn-chamber" disabled={requested} onClick={() => requestData(item)}>
                        {requested ? 'Pedido registrado' : 'Pedir dado'}
                      </button>
                      <button type="button" className="btn-chamber-muted" disabled={bypassed} onClick={() => bypassData(item)}>
                        {bypassed ? 'Lacuna aceita' : 'Seguir sem dado'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
          <label className="field-label mt-5" htmlFor="founder-notes">Notas do founder</label>
          <textarea
            id="founder-notes"
            className="field-textarea sb-room-notes"
            placeholder={isAdvisory ? 'O que os advisors precisam considerar para construir o plano?' : 'O que a sala precisa lembrar antes de decidir?'}
            value={founderNotes}
            onChange={event => setFounderNotes(event.target.value)}
            onBlur={() => void saveSession()}
          />
        </aside>

        <main className="sb-room-center">
          <div className="sb-room-transport">
            <button type="button" className="btn-gold" onClick={() => void nextTurn()} disabled={thinking || baseComplete || turnLimitReached}>{thinking ? 'Rodando...' : baseComplete || turnLimitReached ? 'Limite atingido' : isAdvisory ? 'Pedir conselho' : 'Próximo turno'}</button>
            <button type="button" className="btn-chamber" disabled={thinking || turnLimitReached} onClick={() => void requestIntervention('challenge')}>{isAdvisory ? 'Aprofundar' : 'Pressionar mais'}</button>
            <button type="button" className="btn-chamber" disabled={thinking || turnLimitReached} onClick={() => void requestIntervention('evidence')}>Pedir evidência</button>
            <button type="button" className="btn-chamber" disabled={thinking || turnLimitReached} onClick={() => void requestIntervention('invite')}>{isAdvisory ? 'Adicionar advisor' : 'Convidar papel'}</button>
            <button type="button" className="btn-chamber" onClick={() => setIsolate(value => !value)}>{isolate ? 'Ver todos' : 'Isolar divergência'}</button>
          </div>
          <p className="sb-code mt-3">{usedAdvisorTurns}/{turnLimit} turnos de advisor</p>

          {thinking && (
            <div className="sb-room-loading">
              <p className="sb-code">CARREGANDO TURNO</p>
              <p>{isAdvisory ? 'Board Brain está coordenando o próximo advisor e puxando a conversa para um plano útil.' : 'Board Brain está coordenando o próximo agente e checando as evidências da sala.'}</p>
            </div>
          )}

          {roomError && (
            <div className="sb-room-error">
              <p className="sb-code">TURNO PAUSADO</p>
              <p>{roomError}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-chamber" onClick={() => void nextTurn()}>Repetir turno</button>
                <button type="button" className="btn-chamber-muted" onClick={() => { setBaseIdx(current => current + 1); setRoomError('') }}>Pular agente</button>
              </div>
            </div>
          )}

          {log.length === 0 && (
            <div className="sb-room-empty">
              <p className="sb-code">{isAdvisory ? 'CONSULTORIA INSTRUÍDA' : 'SALA INSTRUÍDA'}</p>
              <h2>{isAdvisory && activePlan ? activePlan.emptyTitle : 'A sala está instruída e aguardando.'}</h2>
              <p>{isAdvisory && activePlan ? activePlan.emptyBody : 'Inicie a deliberação para revelar os turnos do conselho estratégico.'}</p>
            </div>
          )}

          <div className="grid gap-3">
            {logView.map((turn, index) => {
              const agent = agentFor(turn.code, boardAgents)
              return (
                <article key={`${turn.code}-${index}-${turn.tag}`} className="sb-turn-card">
                  <div className="flex items-start gap-3">
                    <AdvisorMark code={turn.code} color={agent?.color ?? '#51789B'} />
                    <div>
                      <p className="sb-code">{turn.tag}</p>
                      <h3>{turn.studio ? 'Research / Evidence' : agent?.role}</h3>
                      <p>{turn.text}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </main>

        <aside className="sb-room-panel">
          <SectionTitle label={isAdvisory ? 'Plano em construção' : 'Síntese ao vivo'} />
          {isAdvisory && activePlan && (
            <div className="sb-plan-preview">
              <p className="sb-code">ENTREGÁVEL</p>
              <h3>{activePlan.primaryOutput}</h3>
              <div className="mt-3 grid gap-2">
                {activePlan.workstreams.map(item => (
                  <article key={item.label} className="sb-plan-workstream">
                    <strong>{item.label}</strong>
                    <span>{item.kpi}</span>
                  </article>
                ))}
              </div>
            </div>
          )}
          <SynthesisBlock title="Concorda" items={synth.agreements} />
          <SynthesisBlock title="Discorda" items={synth.disagreements} />
          <SynthesisBlock title="Riscos" items={synth.risks} />
          <div className="mt-5 grid gap-2">
            <button type="button" className="btn-gold" onClick={() => setDecisionOpen(true)}>{isAdvisory && activePlan ? activePlan.closeLabel : 'Ir para decisão'}</button>
            <button type="button" className="btn-chamber" onClick={() => enqueue(isAdvisory && activePlan ? activePlan.primaryOutput : 'Brief de estratégia')}>{isAdvisory ? '+ Plano' : '+ Brief'}</button>
            <button type="button" className="btn-chamber" onClick={() => enqueue(isAdvisory ? 'Resumo executivo consultivo' : 'Memo do conselho')}>{isAdvisory ? '+ Resumo' : '+ Memo'}</button>
          </div>
          <div className="mt-5">
            <p className="sb-code">Fila de entregáveis</p>
            <div className="mt-3 grid gap-2">
              {queue.length === 0 && <p className="sb-muted">Nenhum artefato na fila.</p>}
              {queue.map(item => <span key={item} className="sb-room-queue">{item}</span>)}
            </div>
          </div>
        </aside>
      </section>

      {decisionOpen && (
        <div className="sb-modal-backdrop">
          <div className="sb-decision-modal">
            <p className="sb-code">{isAdvisory ? 'PLANO CONSULTIVO' : 'DECISÃO'}</p>
            <h2>{isAdvisory && activePlan ? activePlan.title : activeQuestion}</h2>
            <p>
              {isAdvisory
                ? 'Isto salva a análise como plano consultivo com diagnóstico, recomendação, workstreams, KPIs, riscos, perguntas abertas e possíveis decisões futuras. Não aprova uma decisão de board.'
                : 'Registrar decisão com racional, opções rejeitadas, dono, condições, lacunas aceitas e data de revisão.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={thinking}
                onClick={() => void captureDecision('approved')}
              >
                {isAdvisory && activePlan ? activePlan.closeLabel : 'Aprovar'}
              </button>
              <button type="button" className="btn-secondary" disabled={thinking} onClick={() => void captureDecision('deferred')}>{isAdvisory ? 'Continuar investigando' : 'Adiar'}</button>
              <button type="button" className="btn-secondary" onClick={() => setDecisionOpen(false)}>Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionGrid({ sessions, onStart }: { sessions: ScreenProps['readout']['sessionTypes']; onStart: (id: ScreenProps['readout']['sessionTypes'][number]['id']) => void }) {
  return (
    <div className="mt-4 grid gap-3">
      {sessions.map(session => (
        <button key={session.id} type="button" className={`sb-session-card ${session.primary ? 'is-primary' : ''}`} onClick={() => onStart(session.id)}>
          <span>{session.code}</span>
          <strong>{session.name}</strong>
          <em>{session.tag}</em>
          <p>{session.desc}</p>
          <small>{session.outputs.join(' · ')}</small>
        </button>
      ))}
    </div>
  )
}

function SynthesisBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="sb-synth-block">
      <div className="flex items-center justify-between gap-3">
        <p>{title}</p>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? <em>Nada ainda.</em> : (
        <ul>
          {items.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  )
}

export function OutputsScreen({ readout }: ScreenProps) {
  const { outputs, studioAgents } = readout

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="06 - Entregáveis"
        title="Execution Studio"
        description="Depois da decisão, os artefatos saem com fontes, páginas e vínculo com a memória."
      />
      <Panel>
        <SectionTitle label="Roster do studio" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {studioAgents.map(agent => (
            <article key={agent.code} className="sb-row-card">
              <p className="sb-code">{agent.code}</p>
              <h3 className="sb-row-title mt-2">{agent.name}</h3>
              <p className="sb-muted mt-1">{agent.desc}</p>
            </article>
          ))}
        </div>
      </Panel>
      <section className="grid gap-4 md:grid-cols-2">
        {outputs.map(output => (
          <Panel key={output.title} tone="dossier">
            <p className="sb-code">{output.type.toUpperCase()} · {output.pages} páginas</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold">{output.title}</h2>
            <p className="sb-muted mt-3">{output.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {output.sources.map(source => <span key={source} className="sb-source-chip">{source}</span>)}
            </div>
          </Panel>
        ))}
      </section>
    </div>
  )
}

export function DecisionMemoryScreen({ readout }: ScreenProps) {
  const { decisions } = readout

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="07 - Decision Memory"
        title="Ledger de decisões"
        description="A memória preserva racional, opções rejeitadas, confiança, dono, condições para revisitar e evidências ligadas."
      />
      <div className="grid gap-4">
        {decisions.map(decision => (
          <Panel key={decision.id} tone="dossier">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="sb-code">{decision.id} · revisão {decision.reviewDate}</p>
                <h2 className="mt-3 font-serif text-2xl font-semibold">{decision.statement}</h2>
                <p className="sb-muted mt-3">{decision.rationale}</p>
              </div>
              <StatusPill tone="positive">{decision.confidence}% confiança</StatusPill>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article><p className="sb-code">Responsável</p><p className="mt-2 text-sm font-bold">{decision.owner}</p></article>
              <article><p className="sb-code">Opções rejeitadas</p><p className="sb-muted mt-2">{decision.rejectedOptions.join(' · ')}</p></article>
              <article><p className="sb-code">Condições</p><p className="sb-muted mt-2">{decision.conditions.join(' · ')}</p></article>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

export function DecisionFollowUpsScreen({ readout }: ScreenProps) {
  const { followUps } = readout

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="08 - Follow-ups"
        title="Cadência depois da sala"
        description="Cada decisão cria trabalho: responsável, prazo, status, dependência, gatilho de escalada e lembretes."
      />
      <Panel>
        <div className="sb-table sb-followup-table">
          <div className="sb-table-head"><span>Follow-up</span><span>Dono</span><span>Prazo</span><span>Status</span></div>
          {followUps.map(item => (
            <div key={item.title} className="sb-table-row">
              <span>{item.title}<small>{item.dependency} · {item.escalation}</small></span>
              <span>{item.owner}</span>
              <span>{item.due}</span>
              <span>{item.status}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
