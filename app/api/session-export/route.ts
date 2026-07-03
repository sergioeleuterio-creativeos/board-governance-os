import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export const maxDuration = 30

type SupportedExportType = 'html' | 'csv' | 'pdf'

type SessionRow = {
  id: string
  organization_id: string
  company_id: string
  governance_cycle_id: string | null
  board_pack_id: string | null
  session_type: string
  status: string
  opened_at: string | null
  closed_at: string | null
  closure_recommendation: string | null
  closure_summary: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type CompanyRow = {
  name: string
}

const SUPPORTED_EXPORT_TYPES: SupportedExportType[] = ['html', 'csv', 'pdf']
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60
const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60

const contentTypes: Record<SupportedExportType, string> = {
  html: 'text/html',
  csv: 'text/csv',
  pdf: 'application/pdf',
}

function signedUrlTtlSeconds() {
  const configured = Number.parseInt(process.env.EXPORT_SIGNED_URL_TTL_SECONDS || '', 10)
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SIGNED_URL_TTL_SECONDS
  return Math.min(configured, MAX_SIGNED_URL_TTL_SECONDS)
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapePdf(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/·/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function valueText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join('; ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = valueText(item)
        return text ? `${friendlyLabel(key)}: ${text}` : null
      })
      .filter(Boolean)
      .join(' | ')
  }
  return String(value)
}

function friendlyLabel(value: string) {
  const labels: Record<string, string> = {
    active_question: 'Pergunta ativa',
    advisor_name: 'Advisor',
    bypassed_data: 'Lacunas aceitas',
    closure_recommendation: 'Recomendação',
    closure_summary: 'Síntese',
    confidence_score: 'Confiança',
    conflicts: 'Conflitos',
    decision_room_active_question: 'Pergunta ativa',
    decision_room_bypassed_data: 'Lacunas aceitas',
    decision_room_requested_data: 'Dados pedidos',
    decision_room_session_type: 'Tipo de sala',
    from_advisor_key: 'De',
    relationship: 'Relação',
    requested_data: 'Dados pedidos',
    risk_score: 'Risco',
    stance: 'Postura',
    status: 'Status',
    summary: 'Síntese',
    title: 'Título',
    to_advisor_key: 'Para',
  }
  return labels[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function topTexts(value: unknown, limit = 6): string[] {
  return asArray(value).map(valueText).filter(Boolean).slice(0, limit)
}

function wrapText(value: string, width = 92): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return value.slice(0, 10)
}

type SessionExportData = {
  companyName: string
  session: SessionRow
  decisions: Record<string, unknown>[]
  followUps: Record<string, unknown>[]
  agentReviews: Record<string, unknown>[]
  conversations: Record<string, unknown>[]
}

function roomLog(session: SessionRow) {
  return topTexts(asRecord(session.metadata).decision_room_log, 12)
}

function requestedData(session: SessionRow) {
  return topTexts(asRecord(session.metadata).decision_room_requested_data, 12)
}

function bypassedData(session: SessionRow) {
  return topTexts(asRecord(session.metadata).decision_room_bypassed_data, 12)
}

function exportRows(data: SessionExportData) {
  const { companyName, session, decisions, followUps, agentReviews, conversations } = data
  const rows = [
    { section: 'Empresa', index: 1, content: companyName },
    { section: 'Sessão', index: 1, content: `${friendlyLabel(session.session_type)} · ${friendlyLabel(session.status)} · aberta em ${formatDate(session.opened_at ?? session.created_at)}` },
    { section: 'Síntese', index: 1, content: session.closure_summary ?? 'Sessão salva sem síntese final.' },
    { section: 'Recomendação', index: 1, content: session.closure_recommendation ?? 'Sem recomendação final registrada.' },
    ...roomLog(session).map((content, index) => ({ section: 'Hot Seat - turnos', index: index + 1, content })),
    ...requestedData(session).map((content, index) => ({ section: 'Dados pedidos', index: index + 1, content })),
    ...bypassedData(session).map((content, index) => ({ section: 'Lacunas aceitas', index: index + 1, content })),
    ...decisions.map((decision, index) => ({ section: 'Decisões', index: index + 1, content: valueText(decision) })),
    ...agentReviews.map((review, index) => ({ section: 'Advisor reviews', index: index + 1, content: valueText(review) })),
    ...conversations.map((conversation, index) => ({ section: 'Board round', index: index + 1, content: valueText(conversation) })),
    ...followUps.map((followUp, index) => ({ section: 'Follow-ups', index: index + 1, content: valueText(followUp) })),
  ]
  return rows.filter(row => row.content.trim())
}

function renderHtml(data: SessionExportData) {
  const rows = exportRows(data)
  const sectionGroups = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    acc[row.section] = acc[row.section] ?? []
    acc[row.section].push(row)
    return acc
  }, {})
  const title = data.session.metadata?.source === 'decision-room' ? 'Hot Seat Readout' : 'Board Session Readout'

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - ${escapeHtml(data.companyName)}</title>
  <style>
    :root { --ink:#1a1814; --muted:#57534a; --brass:#c4922f; --line:#d8c7a1; --paper:#f4f2ed; --panel:#fffdfa; --chamber:#16140f; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family: Archivo, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height:1.5; }
    main { max-width:980px; margin:0 auto; padding:44px; background:var(--panel); min-height:100vh; }
    .cover { background:var(--chamber); color:var(--paper); padding:38px; margin:-44px -44px 32px; border-top:4px solid var(--brass); }
    .code { color:var(--brass); font-family:"IBM Plex Mono", Consolas, monospace; font-size:11px; text-transform:uppercase; letter-spacing:.08em; font-weight:800; }
    h1, h2 { font-family: Spectral, Georgia, serif; font-weight:600; letter-spacing:0; }
    h1 { font-size:48px; line-height:1.04; max-width:780px; margin:18px 0 0; }
    h2 { font-size:26px; border-top:1px solid var(--line); padding-top:18px; margin-top:30px; }
    .summary { font-size:20px; max-width:800px; }
    .row { border:1px solid var(--line); background:#fff; padding:14px 16px; margin:10px 0; }
    .row small { display:block; color:var(--muted); font-family:"IBM Plex Mono", Consolas, monospace; font-size:10px; font-weight:800; text-transform:uppercase; margin-bottom:5px; }
    @media print { body { background:#fff; } main { padding:28px; } .cover { margin:-28px -28px 24px; } }
  </style>
</head>
<body>
<main>
  <section class="cover">
    <p class="code">Board OS · ${escapeHtml(title)}</p>
    <h1>${escapeHtml(data.companyName)}</h1>
    <p class="summary">${escapeHtml(data.session.closure_summary ?? 'Sessão salva sem síntese final.')}</p>
  </section>
  ${Object.entries(sectionGroups).map(([section, items]) => `
    <section>
      <h2>${escapeHtml(section)}</h2>
      ${items.map(item => `<article class="row"><small>${escapeHtml(section)} ${item.index}</small>${escapeHtml(item.content)}</article>`).join('')}
    </section>
  `).join('')}
</main>
</body>
</html>`
}

function renderCsv(data: SessionExportData) {
  return [
    ['section', 'index', 'content'].map(csvCell).join(','),
    ...exportRows(data).map(row => [row.section, row.index, row.content].map(csvCell).join(',')),
  ].join('\n')
}

function renderPdf(data: SessionExportData): Buffer {
  const title = data.session.metadata?.source === 'decision-room' ? 'Hot Seat Readout' : 'Board Session Readout'
  const rows = exportRows(data)
  const pageRows: typeof rows[] = []
  const rowsPerPage = 7
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pageRows.push(rows.slice(index, index + rowsPerPage))
  }

  const textAt = (x: number, y: number, text: string, font = 'F1', size = 10, leading = 13) => [
    'BT',
    `/${font} ${size} Tf`,
    `${x} ${y} Td`,
    `${leading} TL`,
    `(${escapePdf(text.slice(0, 170))}) Tj`,
    'ET',
  ].join('\n')

  const linesAt = (x: number, y: number, lines: string[], font = 'F1', size = 10, leading = 13) => [
    'BT',
    `/${font} ${size} Tf`,
    `${x} ${y} Td`,
    `${leading} TL`,
    ...lines.map(line => `(${escapePdf(line.slice(0, 150))}) Tj T*`),
    'ET',
  ].join('\n')

  const coverStream = [
    '0.086 0.078 0.059 rg',
    '0 0 612 792 re f',
    '0.768 0.573 0.184 RG',
    '2 w',
    '48 720 m 564 720 l S',
    textAt(230, 520, `BOARD OS - ${title.toUpperCase()}`, 'F1', 10, 12).replace('BT', '0.768 0.573 0.184 rg\nBT'),
    linesAt(78, 446, wrapText(data.companyName, 30), 'F2', 32, 38).replace('BT', '0.957 0.949 0.929 rg\nBT'),
    linesAt(78, 360, wrapText(data.session.closure_summary ?? 'Sessão salva sem síntese final.', 66).slice(0, 4), 'F1', 13, 18).replace('BT', '0.804 0.761 0.698 rg\nBT'),
    textAt(252, 300, `Sessão - ${formatDate(data.session.opened_at ?? data.session.created_at)}`, 'F1', 9, 12).replace('BT', '0.659 0.631 0.573 rg\nBT'),
  ].join('\n')

  const bodyStreams = pageRows.map((chunk, pageIndex) => {
    const stream: string[] = [
      '0.957 0.949 0.929 rg',
      '0 0 612 792 re f',
      '0.768 0.573 0.184 RG',
      '1 w',
      '48 742 m 564 742 l S',
      textAt(48, 712, `${String(pageIndex + 1).padStart(2, '0')} - ${title}`, 'F1', 9, 11).replace('BT', '0.768 0.573 0.184 rg\nBT'),
      linesAt(48, 670, pageIndex === 0
        ? wrapText(data.session.closure_summary ?? 'Sessão salva sem síntese final.', 74).slice(0, 3)
        : wrapText(data.companyName, 42).slice(0, 2),
      'F2', 22, 27).replace('BT', '0.102 0.094 0.078 rg\nBT'),
    ]

    let y = pageIndex === 0 ? 550 : 595
    chunk.forEach((row) => {
      stream.push('1 1 1 rg')
      stream.push(`46 ${y - 8} 520 58 re f`)
      stream.push('0.847 0.780 0.631 RG')
      stream.push(`46 ${y - 8} 520 58 re S`)
      stream.push(textAt(58, y + 30, `${row.section}${row.index > 1 ? ` ${row.index}` : ''}`, 'F1', 7, 9).replace('BT', '0.349 0.325 0.290 rg\nBT'))
      stream.push(linesAt(58, y + 12, wrapText(row.content, 86).slice(0, 3), 'F1', 9.2, 12).replace('BT', '0.165 0.153 0.122 rg\nBT'))
      y -= 72
    })

    stream.push('0.847 0.780 0.631 RG')
    stream.push('48 48 m 564 48 l S')
    stream.push(textAt(48, 28, `Board OS - ${data.companyName}`, 'F1', 8, 10).replace('BT', '0.349 0.325 0.290 rg\nBT'))
    stream.push(textAt(528, 28, `Página ${pageIndex + 2}`, 'F1', 8, 10).replace('BT', '0.349 0.325 0.290 rg\nBT'))
    return stream.join('\n')
  })

  const streams = [coverStream, ...bodyStreams]
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>')

  const pageObjectIds: number[] = []
  for (const stream of streams) {
    const pageObjectId = objects.length + 1
    const contentObjectId = pageObjectId + 1
    pageObjectIds.push(pageObjectId)
    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjectId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

async function renderExport(data: SessionExportData, exportType: SupportedExportType) {
  if (exportType === 'html') return Buffer.from(renderHtml(data), 'utf8')
  if (exportType === 'csv') return Buffer.from(renderCsv(data), 'utf8')
  return renderPdf(data)
}

async function loadLatestCurrentSession() {
  const service = serviceClient()
  const user = await getSessionUser()
  if (!user) return { data: null, error: null }
  const currentUserCompany = await getCurrentCompanyForUser(user)
  if (!currentUserCompany) return { data: null, error: null }
  return service
    .from('board_sessions')
    .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, session_type, status, opened_at, closed_at, closure_recommendation, closure_summary, metadata, created_at')
    .eq('company_id', currentUserCompany.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const boardSessionId = typeof body?.board_session_id === 'string' ? body.board_session_id : null
  const exportType = (typeof body?.export_type === 'string' ? body.export_type : 'pdf') as SupportedExportType

  if (!SUPPORTED_EXPORT_TYPES.includes(exportType)) {
    return NextResponse.json({ error: `export_type must be one of ${SUPPORTED_EXPORT_TYPES.join(', ')}` }, { status: 400 })
  }

  const service = serviceClient()
  const sessionQuery = service
    .from('board_sessions')
    .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, session_type, status, opened_at, closed_at, closure_recommendation, closure_summary, metadata, created_at')

  const { data: session, error: sessionError } = boardSessionId
    ? await sessionQuery.eq('id', boardSessionId).maybeSingle()
    : await loadLatestCurrentSession()

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: 'board session not found' }, { status: 404 })

  const typedSession = session as SessionRow
  const access = await requireCompanyAdmin(typedSession.company_id)
  if (isAuthError(access)) return access

  const [{ data: company }, { data: decisions }, { data: agentReviews }, { data: conversations }] = await Promise.all([
    service.from('companies').select('name').eq('id', typedSession.company_id).maybeSingle(),
    service
      .from('decisions')
      .select('id, title, status, closure_recommendation, rationale, conditions, owner_label, review_date, risk_level, confidence_score, metadata')
      .eq('board_session_id', typedSession.id)
      .order('created_at', { ascending: true }),
    service
      .from('agent_reviews')
      .select('id, advisor_key, advisor_name, stance, risk_score, confidence_score, perspective, strategic_questions, recommendations, closure_recommendation')
      .eq('board_session_id', typedSession.id)
      .order('created_at', { ascending: true }),
    service
      .from('agent_conversations')
      .select('id, from_advisor_key, to_advisor_key, relationship, transcript, summary, conflicts, agreements')
      .eq('board_session_id', typedSession.id)
      .order('created_at', { ascending: true }),
  ])

  const decisionIds = (decisions ?? []).map(decision => String((decision as Record<string, unknown>).id)).filter(Boolean)
  const { data: followUps } = decisionIds.length
    ? await service
      .from('follow_ups')
      .select('id, title, owner_label, due_date, status, priority, description')
      .in('decision_id', decisionIds)
      .order('created_at', { ascending: true })
    : { data: [] }

  const content = await renderExport({
    companyName: (company as CompanyRow | null)?.name ?? 'Empresa',
    session: typedSession,
    decisions: (decisions ?? []) as Record<string, unknown>[],
    followUps: (followUps ?? []) as Record<string, unknown>[],
    agentReviews: (agentReviews ?? []) as Record<string, unknown>[],
    conversations: (conversations ?? []) as Record<string, unknown>[],
  }, exportType)

  const signedUrlTtl = signedUrlTtlSeconds()
  const storagePath = [
    typedSession.organization_id,
    typedSession.company_id,
    typedSession.id,
    `${randomUUID()}-session-readout.${exportType}`,
  ].join('/')

  const { error: uploadError } = await service.storage
    .from('board-exports')
    .upload(storagePath, content, {
      contentType: contentTypes[exportType],
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: artifact, error: artifactError } = await service
    .from('export_artifacts')
    .insert({
      organization_id: typedSession.organization_id,
      company_id: typedSession.company_id,
      governance_cycle_id: typedSession.governance_cycle_id,
      board_pack_id: typedSession.board_pack_id,
      export_type: exportType,
      status: 'ready',
      storage_bucket: 'board-exports',
      storage_path: storagePath,
      metadata: {
        source: 'session-export-api',
        board_session_id: typedSession.id,
        session_type: typedSession.session_type,
        content_type: contentTypes[exportType],
        bytes: content.byteLength,
        signed_url_ttl_seconds: signedUrlTtl,
      },
    })
    .select('id')
    .single()

  if (artifactError || !artifact) {
    await service.storage.from('board-exports').remove([storagePath])
    return NextResponse.json({ error: artifactError?.message || 'failed to create export artifact' }, { status: 500 })
  }

  await service.from('audit_events').insert({
    organization_id: typedSession.organization_id,
    company_id: typedSession.company_id,
    actor_user_id: access.id,
    event_type: 'board_session.export_created',
    entity_type: 'export_artifact',
    entity_id: artifact.id,
    metadata: {
      board_session_id: typedSession.id,
      export_type: exportType,
      storage_bucket: 'board-exports',
      storage_path: storagePath,
      signed_url_ttl_seconds: signedUrlTtl,
    },
  })

  const { data: signedUrl } = await service.storage
    .from('board-exports')
    .createSignedUrl(storagePath, signedUrlTtl)

  return NextResponse.json({
    mode: 'live-supabase',
    artifact_id: artifact.id,
    board_session_id: typedSession.id,
    storage_bucket: 'board-exports',
    storage_path: storagePath,
    export_type: exportType,
    content_type: contentTypes[exportType],
    signed_url_ttl_seconds: signedUrlTtl,
    signed_url: signedUrl?.signedUrl ?? null,
  })
}
