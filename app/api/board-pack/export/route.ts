import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

export const maxDuration = 30

type SupportedExportType = 'html' | 'csv'

interface BoardPackRow {
  id: string
  organization_id: string
  company_id: string
  governance_cycle_id: string
  version: number
  executive_summary: string | null
  strategic_questions: unknown
  risk_map: unknown
  priority_ranking: unknown
  meeting_agenda: unknown
  decision_candidates: unknown
  export_payload: unknown
}

const contentTypes: Record<SupportedExportType, string> = {
  html: 'text/html',
  csv: 'text/csv',
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function sectionRows(label: string, value: unknown): string[] {
  if (!Array.isArray(value)) return [[label, JSON.stringify(value ?? '')].map(csvCell).join(',')]
  return value.map((item, index) => [label, index + 1, typeof item === 'string' ? item : JSON.stringify(item)].map(csvCell).join(','))
}

function renderHtml(boardPack: BoardPackRow, companyName: string): string {
  const questions = asArray(boardPack.strategic_questions)
  const risks = asArray(boardPack.risk_map)
  const priorities = asArray(boardPack.priority_ranking)
  const agenda = asArray(boardPack.meeting_agenda)
  const decisions = asArray(boardPack.decision_candidates)
  const payload = asRecord(boardPack.export_payload)
  const financialReport = asRecord(payload.financial_report)
  const advisorReports = asArray(payload.advisor_reports)

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Board Pack - ${escapeHtml(companyName)}</title>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 48px; color: #1f2933; line-height: 1.55; }
    h1, h2 { font-family: Georgia, "Times New Roman", serif; color: #111827; }
    h1 { font-size: 34px; margin-bottom: 4px; }
    h2 { font-size: 22px; margin-top: 34px; border-top: 1px solid #d8c7a1; padding-top: 18px; }
    .meta { color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
    .summary { font-size: 18px; max-width: 860px; }
    li { margin: 8px 0; }
    pre { white-space: pre-wrap; background: #f7f2e8; padding: 14px; border-radius: 6px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 22px; }
    th, td { border-bottom: 1px solid #e5ddce; text-align: left; padding: 9px; vertical-align: top; }
    th { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
  </style>
</head>
<body>
  <p class="meta">Board Governance OS · Board Pack v${boardPack.version}</p>
  <h1>${escapeHtml(companyName)}</h1>
  <p class="summary">${escapeHtml(boardPack.executive_summary || 'No executive summary available.')}</p>

  <h2>Strategic Questions</h2>
  <ol>${questions.map(item => `<li>${escapeHtml(typeof item === 'string' ? item : JSON.stringify(item))}</li>`).join('')}</ol>

  <h2>Risk Map</h2>
  ${risks.map(item => `<pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`).join('')}

  <h2>Financial Reports</h2>
  ${Object.entries(financialReport).map(([section, rows]) => `
    <h3>${escapeHtml(section)}</h3>
    <table>
      <tbody>${asArray(rows).map(row => `<tr>${Object.values(asRecord(row)).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `).join('') || '<p>No structured financial report available yet.</p>'}

  <h2>Structured Advisor Reports</h2>
  ${advisorReports.map(item => `<pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`).join('') || '<p>No advisor reports available yet.</p>'}

  <h2>Priority Ranking</h2>
  ${priorities.map(item => `<pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`).join('')}

  <h2>Meeting Agenda</h2>
  <ol>${agenda.map(item => `<li>${escapeHtml(typeof item === 'string' ? item : JSON.stringify(item))}</li>`).join('')}</ol>

  <h2>Decision Candidates</h2>
  ${decisions.map(item => `<pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`).join('')}
</body>
</html>`
}

function renderCsv(boardPack: BoardPackRow, companyName: string): string {
  const payload = asRecord(boardPack.export_payload)
  const financialReport = asRecord(payload.financial_report)
  const advisorReports = asArray(payload.advisor_reports)
  return [
    ['section', 'index', 'content'].map(csvCell).join(','),
    ['company', 1, companyName].map(csvCell).join(','),
    ['executive_summary', 1, boardPack.executive_summary ?? ''].map(csvCell).join(','),
    ...sectionRows('strategic_question', boardPack.strategic_questions),
    ...Object.entries(financialReport).flatMap(([section, rows]) => sectionRows(`financial_${section}`, rows)),
    ...sectionRows('advisor_report', advisorReports),
    ...sectionRows('risk', boardPack.risk_map),
    ...sectionRows('priority', boardPack.priority_ranking),
    ...sectionRows('agenda', boardPack.meeting_agenda),
    ...sectionRows('decision_candidate', boardPack.decision_candidates),
  ].join('\n')
}

function renderExport(boardPack: BoardPackRow, companyName: string, exportType: SupportedExportType): string {
  if (exportType === 'html') return renderHtml(boardPack, companyName)
  return renderCsv(boardPack, companyName)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const boardPackId = typeof body?.board_pack_id === 'string' ? body.board_pack_id : null
  const exportType = (typeof body?.export_type === 'string' ? body.export_type : 'html') as SupportedExportType

  if (!boardPackId) return NextResponse.json({ error: 'board_pack_id is required' }, { status: 400 })
  if (!['html', 'csv'].includes(exportType)) {
    return NextResponse.json({ error: 'export_type must be html or csv' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: boardPack, error: boardPackError } = await service
    .from('board_packs')
    .select('id, organization_id, company_id, governance_cycle_id, version, executive_summary, strategic_questions, risk_map, priority_ranking, meeting_agenda, decision_candidates, export_payload')
    .eq('id', boardPackId)
    .maybeSingle()

  if (boardPackError) return NextResponse.json({ error: boardPackError.message }, { status: 500 })
  if (!boardPack) return NextResponse.json({ error: 'board pack not found' }, { status: 404 })

  const access = await requireCompanyAdmin(boardPack.company_id)
  if (isAuthError(access)) return access

  const { data: company, error: companyError } = await service
    .from('companies')
    .select('name')
    .eq('id', boardPack.company_id)
    .maybeSingle()

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

  const companyName = company?.name ?? 'Company'
  const content = renderExport(boardPack as BoardPackRow, companyName, exportType)
  const storagePath = [
    boardPack.organization_id,
    boardPack.company_id,
    boardPack.id,
    `${randomUUID()}-board-pack-v${boardPack.version}.${exportType}`,
  ].join('/')

  const { error: uploadError } = await service.storage
    .from('board-exports')
    .upload(storagePath, Buffer.from(content, 'utf8'), {
      contentType: contentTypes[exportType],
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: artifact, error: artifactError } = await service
    .from('export_artifacts')
    .insert({
      organization_id: boardPack.organization_id,
      company_id: boardPack.company_id,
      governance_cycle_id: boardPack.governance_cycle_id,
      board_pack_id: boardPack.id,
      export_type: exportType,
      status: 'ready',
      storage_bucket: 'board-exports',
      storage_path: storagePath,
      metadata: {
        source: 'board-pack-export-api',
        content_type: contentTypes[exportType],
        bytes: Buffer.byteLength(content, 'utf8'),
      },
    })
    .select('id')
    .single()

  if (artifactError || !artifact) {
    await service.storage.from('board-exports').remove([storagePath])
    return NextResponse.json({ error: artifactError?.message || 'failed to create export artifact' }, { status: 500 })
  }

  await service.from('audit_events').insert({
    organization_id: boardPack.organization_id,
    company_id: boardPack.company_id,
    actor_user_id: access.id,
    event_type: 'board_pack.export_created',
    entity_type: 'export_artifact',
    entity_id: artifact.id,
    metadata: {
      board_pack_id: boardPack.id,
      export_type: exportType,
      storage_bucket: 'board-exports',
      storage_path: storagePath,
    },
  })

  return NextResponse.json({
    mode: 'live-supabase',
    artifact_id: artifact.id,
    storage_bucket: 'board-exports',
    storage_path: storagePath,
    export_type: exportType,
    content_type: contentTypes[exportType],
  })
}
