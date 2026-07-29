'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AdvisorMark, Panel, SectionTitle, StatusPill } from '@/components/shadow-board/ui'

type Participant = {
  id: string
  participant_type: 'human' | 'synthetic'
  display_name: string
  role_label: string
  advisor_key: string | null
  status: string
}

type Contribution = {
  id: string
  participant_id: string
  reply_to_id: string | null
  contribution_type: string
  phase: string
  body: string
  visibility: 'sealed' | 'released'
  submitted_at: string
  author_snapshot: {
    display_name?: string
    role_label?: string
    participant_type?: string
  }
}

type ActiveBoard = {
  company: { id: string; name: string }
  meeting: {
    id: string
    status: string
    meeting_timezone: string
    current_phase: BoardPhase
    phase_started_at: string
    phase_deadline_at: string | null
    phase_schedule: Array<{ phase: BoardPhase; startsAt: string; endsAt: string | null }>
    active_question: string
  }
  board_pack: {
    id: string
    version: number
    status: string
    executive_summary: string | null
    strategic_questions: unknown
    meeting_agenda: unknown
    decision_candidates: unknown
    locked_at: string
    released_at: string
    content_hash: string
    source_snapshot_id: string | null
  }
  participants: Participant[]
  contributions: Contribution[]
  caller_participant_id: string | null
  can_manage: boolean
}

type BoardReadout = {
  active: ActiveBoard | null
  available_pack: {
    id: string
    version: number
    executive_summary: string | null
    strategic_questions: unknown
    meeting_agenda: unknown
    decision_candidates: unknown
  } | null
  company: { id: string; name: string } | null
  can_manage: boolean
  error?: string
}

type StrategicSourceReadout = {
  persisted: boolean
  document: {
    id: string
    version: number
    title: string
    status: 'ready' | 'handed_off' | 'superseded'
    immutable_hash: string
    board_pack_hash: string
    handed_off_at: string | null
    content: {
      decisionInQuestion?: string
      chairSynthesis?: string | null
      approvedDirection?: {
        title?: string
        decision?: string | null
      } | null
      sourceReferences?: string[]
    }
  } | null
  handoff: {
    id: string
    status: string
    creative_os_artifact_id: string | null
    creative_os_url: string | null
    accepted_at: string | null
    last_error: string | null
  } | null
  connector: {
    enabled: boolean
    status: string
    contractVersion: string
  }
  can_generate: boolean
}

type BoardPhase =
  | 'pack_review'
  | 'independent_analysis'
  | 'peer_challenge'
  | 'final_positions'
  | 'chair_synthesis'
  | 'founder_decision'
  | 'closed'

const PHASE_LABELS: Record<BoardPhase, string> = {
  pack_review: 'Leitura do pack',
  independent_analysis: 'Análise independente',
  peer_challenge: 'Perguntas entre membros',
  final_positions: 'Posições finais',
  chair_synthesis: 'Síntese do Chair',
  founder_decision: 'Decisão do founder',
  closed: 'Ata encerrada',
}

const CONTRIBUTION_TYPES: Record<BoardPhase, string> = {
  pack_review: 'founder_question',
  independent_analysis: 'independent_analysis',
  peer_challenge: 'challenge',
  final_positions: 'final_position',
  chair_synthesis: 'chair_synthesis',
  founder_decision: 'decision',
  closed: 'minutes_note',
}

const PHASE_PROMPTS: Record<BoardPhase, string> = {
  pack_review: 'Que pergunta, restrição, ou evidência o board precisa considerar antes de começar?',
  independent_analysis: 'Qual é a sua leitura independente? Nomeie a recomendação, a evidência, e o principal risco.',
  peer_challenge: 'Que hipótese de outro membro precisa ser testada? Faça uma pergunta que possa mudar a recomendação.',
  final_positions: 'Depois das perguntas, qual é sua posição final e sob quais condições?',
  chair_synthesis: 'O Chair está consolidando as posições.',
  founder_decision: 'Registre a decisão, o porquê, as condições, o responsável, e a data de revisão.',
  closed: 'A reunião foi encerrada e registrada em ata.',
}

const ADVISOR_COLORS: Record<string, string> = {
  board_brain: '#C4922F',
  finance: '#3E6B4F',
  operator: '#4A5A6A',
  growth: '#2F6E6A',
  risk: '#A23B2D',
  customer: '#7A4E63',
  talent: '#85702F',
}

function firstQuestion(value: unknown) {
  if (!Array.isArray(value)) return ''
  const first = value[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object') {
    const record = first as Record<string, unknown>
    return [record.question, record.title, record.decision].find(item => typeof item === 'string') as string ?? ''
  }
  return ''
}

function participantCode(participant: Participant) {
  if (participant.participant_type === 'human') {
    return participant.display_name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  }
  const codes: Record<string, string> = {
    board_brain: 'BB',
    finance: 'CFO',
    operator: 'COO',
    growth: 'CMO',
    risk: 'RK',
    customer: 'CX',
    talent: 'PE',
  }
  return codes[participant.advisor_key ?? ''] ?? 'AI'
}

function dateTime(value: string | null, timezone = 'America/Sao_Paulo') {
  if (!value) return 'Sem prazo'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}

export function AsyncBoardScreen() {
  const [readout, setReadout] = useState<BoardReadout | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [question, setQuestion] = useState('')
  const [contribution, setContribution] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Board member')
  const [invitationUrl, setInvitationUrl] = useState('')
  const [sourceReadout, setSourceReadout] = useState<StrategicSourceReadout | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)

  async function loadStrategicSource(sessionId: string) {
    setSourceLoading(true)
    const response = await fetch(
      `/api/board/strategic-source?board_session_id=${encodeURIComponent(sessionId)}`,
      { cache: 'no-store' },
    )
    const payload = await response.json().catch(() => null) as StrategicSourceReadout | null
    if (response.ok && payload) setSourceReadout(payload)
    setSourceLoading(false)
  }

  async function loadBoard() {
    setLoading(true)
    setError('')
    const response = await fetch('/api/board/meetings', { cache: 'no-store' })
    const payload = await response.json().catch(() => null) as BoardReadout | null
    if (!response.ok || !payload) {
      setError(payload?.error ?? 'Não foi possível abrir o board.')
      setLoading(false)
      return
    }
    setReadout(payload)
    if (!question) setQuestion(firstQuestion(payload.available_pack?.strategic_questions))
    if (
      payload.active?.can_manage
      && payload.active.meeting.current_phase === 'closed'
    ) {
      await loadStrategicSource(payload.active.meeting.id)
    } else {
      setSourceReadout(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = readout?.active ?? null
  const participantById = useMemo(
    () => new Map((active?.participants ?? []).map(participant => [participant.id, participant])),
    [active?.participants],
  )
  const phase = active?.meeting.current_phase ?? null
  const canContribute = Boolean(
    active?.caller_participant_id
    && phase
    && !['chair_synthesis', 'closed'].includes(phase),
  )

  async function startBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!readout?.available_pack?.id || question.trim().length < 10) return
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/board/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_pack_id: readout.available_pack.id,
        active_question: question.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        starts_at: new Date().toISOString(),
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) setError(payload?.error ?? 'Não foi possível abrir esta reunião.')
    else {
      setNotice('Pack travado. O board já pode começar a leitura.')
      await loadBoard()
    }
    setWorking(false)
  }

  async function prepareBoardPack() {
    if (!readout?.company?.id) return
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/governance/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: readout.company.id }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) {
      setError(payload?.error ?? 'Não foi possível preparar o pack.')
    } else {
      setNotice('O Advisor preparou o pack. Agora nomeie a decisão e abra o board.')
      await loadBoard()
    }
    setWorking(false)
  }

  async function inviteHuman(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!active?.meeting.id || !inviteEmail.trim()) return
    setWorking(true)
    setError('')
    setNotice('')
    setInvitationUrl('')
    const response = await fetch('/api/board/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_session_id: active.meeting.id,
        email: inviteEmail.trim(),
        display_name: inviteName.trim(),
        role_label: inviteRole.trim(),
        delivery_mode: window.location.hostname === 'localhost' ? 'preview' : 'email',
      }),
    })
    const payload = await response.json().catch(() => null) as {
      error?: string
      invitation_url?: string
      notification?: { sent?: boolean; error?: string }
    } | null
    if (!response.ok) setError(payload?.error ?? 'Não foi possível enviar o convite.')
    else {
      setInvitationUrl(payload?.invitation_url ?? '')
      setNotice(payload?.notification?.sent
        ? 'Convite enviado. Esta pessoa receberá o mesmo pack travado.'
        : 'Convite criado. Copie o link reservado para compartilhar.')
      setInviteEmail('')
      setInviteName('')
      await loadBoard()
    }
    setWorking(false)
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!active || !phase || !contribution.trim()) return
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/board/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_session_id: active.meeting.id,
        contribution_type: CONTRIBUTION_TYPES[phase],
        body: contribution.trim(),
      }),
    })
    const payload = await response.json().catch(() => null) as { error?: string; visibility?: string } | null
    if (!response.ok) setError(payload?.error ?? 'Não foi possível registrar sua contribuição.')
    else {
      setContribution('')
      setNotice(payload?.visibility === 'sealed'
        ? 'Sua posição foi registrada e ficará fechada até esta fase terminar.'
        : 'Sua contribuição entrou na conversa do board.')
      await loadBoard()
    }
    setWorking(false)
  }

  async function revokeParticipant(participantId: string) {
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/board/participants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: participantId, action: 'revoke' }),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) setError(payload?.error ?? 'Não foi possível revogar este assento.')
    else {
      setNotice('Assento revogado. O acesso à reunião foi encerrado.')
      await loadBoard()
    }
    setWorking(false)
  }

  async function generateStrategicSource() {
    if (!active) return
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/board/strategic-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_session_id: active.meeting.id }),
    })
    const payload = await response.json().catch(() => null) as {
      error?: string
      strategic_source_document_id?: string
    } | null
    if (!response.ok || !payload?.strategic_source_document_id) {
      setError(payload?.error ?? 'Não foi possível criar a Fonte Estratégica.')
    } else {
      setNotice('Fonte Estratégica criada e travada. Ela já pode ser baixada ou entregue ao Creative OS.')
      await loadStrategicSource(active.meeting.id)
    }
    setWorking(false)
  }

  async function handoffToCreativeOS() {
    if (!active || !sourceReadout?.document) return
    const confirmed = window.confirm(
      'Enviar esta versão imutável ao Creative OS? O Creative OS poderá criar briefings e campanhas, mas não poderá alterar a memória do Board OS.',
    )
    if (!confirmed) return
    setWorking(true)
    setError('')
    setNotice('')
    const response = await fetch('/api/board/creative-os-handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategic_source_document_id: sourceReadout.document.id,
        confirm_handoff: true,
      }),
    })
    const payload = await response.json().catch(() => null) as {
      error?: string
      handed_off?: boolean
    } | null
    if (!response.ok || !payload?.handed_off) {
      setError(payload?.error ?? 'O Creative OS não aceitou o documento. Nada foi sobrescrito.')
    } else {
      setNotice('Creative OS aceitou esta versão. O Board OS preservou o documento e a proveniência.')
      await loadStrategicSource(active.meeting.id)
    }
    setWorking(false)
  }

  if (loading) {
    return <Panel><p className="sb-muted">Abrindo o board...</p></Panel>
  }

  if (!active) {
    return (
      <div className="sb-async-board-shell">
        <header className="sb-board-opening">
          <p className="sb-eyebrow">Board</p>
          <h1>Uma decisão. O mesmo pack. Leituras independentes.</h1>
          <p>O Chair organiza a sequência. Humanos e advisors entram no próprio tempo, sem perder a conversa.</p>
        </header>

        {error && <p className="sb-error">{error}</p>}

        <Panel className="sb-board-launch">
          <SectionTitle label="Próxima reunião" />
          {readout?.available_pack ? (
            <form onSubmit={startBoard}>
              <p className="sb-code">PACK v{readout.available_pack.version}</p>
              <p className="sb-board-pack-summary">
                {readout.available_pack.executive_summary || 'O pack está pronto para uma pergunta específica do board.'}
              </p>
              <label htmlFor="board-question">Que decisão este board precisa ajudar a tomar?</label>
              <textarea
                id="board-question"
                value={question}
                onChange={event => setQuestion(event.target.value)}
                placeholder="Ex.: Devemos concentrar o investimento no plano de aquisição ou preservar caixa até validar retenção?"
                required
              />
              <div className="sb-board-launch-footer">
                <span>Ao abrir, esta versão do pack e suas fontes ficam travadas.</span>
                <button className="btn-primary" disabled={working || question.trim().length < 10}>
                  {working ? 'Abrindo...' : 'Travar pack e abrir o board'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="sb-serif-callout">O board precisa transformar o contexto atual em um pack antes de começar.</p>
              {readout?.company && readout.can_manage ? (
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => void prepareBoardPack()}
                  disabled={working}
                >
                  {working ? 'Preparando...' : 'Pedir ao Advisor para preparar o pack'}
                </button>
              ) : (
                <a href="/rooms" className="btn-primary mt-4">Preparar com o Advisor</a>
              )}
            </div>
          )}
        </Panel>
      </div>
    )
  }

  return (
    <div className="sb-async-board-shell">
      <header className="sb-board-meeting-header">
        <div>
          <p className="sb-eyebrow">{active.company.name} · Board Pack v{active.board_pack.version}</p>
          <h1>{active.meeting.active_question}</h1>
          <p>Fase atual: <strong>{PHASE_LABELS[active.meeting.current_phase]}</strong> · até {dateTime(active.meeting.phase_deadline_at, active.meeting.meeting_timezone)}</p>
        </div>
        <StatusPill tone={active.meeting.current_phase === 'closed' ? 'positive' : 'caution'}>
          {PHASE_LABELS[active.meeting.current_phase]}
        </StatusPill>
      </header>

      {error && <p className="sb-error">{error}</p>}
      {notice && <p className="sb-success">{notice}</p>}

      <section className="sb-async-roster" aria-label="Pessoas e advisors neste board">
        {active.participants.map(participant => (
          <article key={participant.id}>
            <AdvisorMark
              code={participantCode(participant)}
              color={participant.participant_type === 'human' ? '#655A49' : ADVISOR_COLORS[participant.advisor_key ?? ''] ?? '#4A5A6A'}
              size="sm"
            />
            <div>
              <strong>{participant.display_name}</strong>
              <span>{participant.role_label} · {participant.participant_type === 'human' ? 'Humano' : 'Advisor sintético'}</span>
            </div>
            <small>{participant.status}</small>
            {active.can_manage
              && participant.participant_type === 'human'
              && participant.role_label !== 'Founder'
              && !['revoked', 'expired', 'declined'].includes(participant.status)
              && (
                <button
                  type="button"
                  className="sb-revoke-seat"
                  disabled={working}
                  onClick={() => void revokeParticipant(participant.id)}
                >
                  Revogar
                </button>
              )}
          </article>
        ))}
      </section>

      <section className="sb-board-context-strip">
        <div>
          <span>PACK TRAVADO</span>
          <strong>{active.board_pack.content_hash?.slice(0, 12)}</strong>
        </div>
        <div>
          <span>FONTE</span>
          <strong>{active.board_pack.source_snapshot_id?.slice(-12) || 'Pack canônico'}</strong>
        </div>
        <div>
          <span>CONTRIBUIÇÕES VISÍVEIS</span>
          <strong>{active.contributions.filter(item => item.visibility === 'released').length}</strong>
        </div>
      </section>

      <div className="sb-async-board-grid">
        <main className="sb-board-conversation">
          <div className="sb-board-conversation-heading">
            <div>
              <p className="sb-eyebrow">Conversa do board</p>
              <h2>O que cada pessoa disse</h2>
            </div>
            <span>Em ordem de registro</span>
          </div>

          <div className="sb-mixed-transcript">
            {active.contributions.map(item => {
              const participant = participantById.get(item.participant_id)
              return (
                <article key={item.id} className={item.visibility === 'sealed' ? 'is-sealed' : ''}>
                  <div className="sb-mixed-turn-author">
                    {participant && (
                      <AdvisorMark
                        code={participantCode(participant)}
                        color={participant.participant_type === 'human' ? '#655A49' : ADVISOR_COLORS[participant.advisor_key ?? ''] ?? '#4A5A6A'}
                        size="sm"
                      />
                    )}
                    <div>
                      <strong>{item.author_snapshot.display_name || participant?.display_name || 'Board member'}</strong>
                      <span>{item.author_snapshot.role_label || participant?.role_label} · {PHASE_LABELS[item.phase as BoardPhase] ?? item.phase}</span>
                    </div>
                    <small>{item.visibility === 'sealed' ? 'Só você vê até a fase fechar' : dateTime(item.submitted_at, active.meeting.meeting_timezone)}</small>
                  </div>
                  <p>{item.body}</p>
                </article>
              )
            })}
            {!active.contributions.length && (
              <p className="sb-muted">O pack foi distribuído. As leituras aparecem aqui quando cada fase for liberada.</p>
            )}
          </div>

          {canContribute && phase && (
            <form className="sb-board-composer" onSubmit={submitContribution}>
              <label htmlFor="board-contribution">{PHASE_PROMPTS[phase]}</label>
              <textarea
                id="board-contribution"
                value={contribution}
                onChange={event => setContribution(event.target.value)}
                placeholder="Escreva como você falaria na reunião. O registro preserva autoria, fase, pack, e fontes."
                required
              />
              <div>
                <span>{['independent_analysis', 'final_positions'].includes(phase) ? 'Fechado até o fim desta fase' : 'Entra na conversa agora'}</span>
                <button className="btn-primary" disabled={working || !contribution.trim()}>
                  {working ? 'Registrando...' : 'Registrar minha contribuição'}
                </button>
              </div>
            </form>
          )}
        </main>

        <aside className="sb-board-side">
          <Panel>
            <SectionTitle label="Ritmo da reunião" />
            <ol className="sb-board-phases">
              {active.meeting.phase_schedule.map(item => (
                <li key={item.phase} className={item.phase === active.meeting.current_phase ? 'is-active' : ''}>
                  <span>{PHASE_LABELS[item.phase]}</span>
                  <small>{dateTime(item.endsAt, active.meeting.meeting_timezone)}</small>
                </li>
              ))}
            </ol>
          </Panel>

          {active.can_manage && (
            <Panel>
              <SectionTitle label="Convidar uma pessoa" />
              <p className="sb-muted">Ela recebe este mesmo pack. Nenhuma Company Brain, rascunho, ou outra empresa fica acessível.</p>
              <form className="sb-invite-form" onSubmit={inviteHuman}>
                <input
                  type="text"
                  value={inviteName}
                  onChange={event => setInviteName(event.target.value)}
                  placeholder="Nome"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  placeholder="email@empresa.com"
                  required
                />
                <input
                  type="text"
                  value={inviteRole}
                  onChange={event => setInviteRole(event.target.value)}
                  placeholder="Papel no board"
                />
                <button className="btn-secondary" disabled={working}>Enviar o mesmo pack</button>
              </form>
              {invitationUrl && (
                <button
                  type="button"
                  className="sb-copy-invite"
                  onClick={() => void navigator.clipboard.writeText(invitationUrl)}
                >
                  Copiar link reservado
                </button>
              )}
            </Panel>
          )}

          {active.can_manage && active.meeting.current_phase === 'closed' && (
            <Panel className="sb-strategic-source">
              <SectionTitle label="Fonte Estratégica" />
              {sourceLoading ? (
                <p className="sb-muted">Reunindo o plano, a conversa, a decisão, e a ata...</p>
              ) : sourceReadout?.document ? (
                <>
                  <p className="sb-strategic-source-title">{sourceReadout.document.title}</p>
                  <p className="sb-muted">
                    Uma versão imutável do que foi decidido — pronta para execução sem perder contexto.
                  </p>
                  <dl>
                    <div>
                      <dt>VERSÃO</dt>
                      <dd>v{sourceReadout.document.version}</dd>
                    </div>
                    <div>
                      <dt>HASH</dt>
                      <dd>{sourceReadout.document.immutable_hash.slice(0, 12)}</dd>
                    </div>
                    <div>
                      <dt>STATUS</dt>
                      <dd>{sourceReadout.document.status === 'handed_off' ? 'Entregue' : 'Pronta'}</dd>
                    </div>
                  </dl>
                  {sourceReadout.document.content.approvedDirection && (
                    <blockquote>
                      {sourceReadout.document.content.approvedDirection.decision
                        || sourceReadout.document.content.approvedDirection.title}
                    </blockquote>
                  )}
                  <div className="sb-strategic-source-actions">
                    <a
                      className="btn-secondary"
                      href={`/api/board/strategic-source?board_session_id=${encodeURIComponent(active.meeting.id)}&download=markdown`}
                    >
                      Baixar documento
                    </a>
                    {sourceReadout.document.status === 'handed_off' ? (
                      sourceReadout.handoff?.creative_os_url
                        ? <a className="btn-primary" href={sourceReadout.handoff.creative_os_url}>Abrir no Creative OS</a>
                        : <span className="sb-source-delivered">Creative OS aceitou esta versão</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={working || !sourceReadout.connector.enabled}
                        onClick={() => void handoffToCreativeOS()}
                      >
                        Continuar no Creative OS
                      </button>
                    )}
                  </div>
                  {!sourceReadout.connector.enabled && sourceReadout.document.status !== 'handed_off' && (
                    <p className="sb-connector-protected">
                      Conexão protegida. O documento está pronto, mas nada será enviado até o contrato receptor e a chave de produção serem ativados.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="sb-muted">
                    O Chair transforma o plano, as leituras do board, a decisão, os KPIs, e os riscos em um único handoff.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={working}
                    onClick={() => void generateStrategicSource()}
                  >
                    {working ? 'Criando...' : 'Criar Fonte Estratégica'}
                  </button>
                </>
              )}
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}
