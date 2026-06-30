import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

export const maxDuration = 30

type SupportedExportType = 'html' | 'csv' | 'pdf' | 'docx' | 'pptx' | 'xlsx'

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

const SUPPORTED_EXPORT_TYPES: SupportedExportType[] = ['html', 'csv', 'pdf', 'docx', 'pptx', 'xlsx']
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60
const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60

function signedUrlTtlSeconds() {
  const configured = Number.parseInt(process.env.EXPORT_SIGNED_URL_TTL_SECONDS || '', 10)
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SIGNED_URL_TTL_SECONDS
  return Math.min(configured, MAX_SIGNED_URL_TTL_SECONDS)
}

const contentTypes: Record<SupportedExportType, string> = {
  html: 'text/html',
  csv: 'text/csv',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapePdf(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
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

type ExportRow = {
  section: string
  index: number
  content: string
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

function friendlyLabel(value: string): string {
  const labels: Record<string, string> = {
    advisor_key: 'Advisor',
    advisor_name: 'Advisor',
    board_note: 'Nota do board',
    c_level_questions: 'Perguntas de conselho',
    closure_recommendation: 'Recomendacao final',
    confidence_score: 'Confianca',
    decision: 'Decisao',
    detail: 'Detalhe',
    due_in_days: 'Prazo',
    focus_area: 'Foco',
    line_item: 'Linha',
    owner_label: 'Responsavel',
    owner_suggestion: 'Responsavel sugerido',
    priority: 'Prioridade',
    risk_level: 'Risco',
    risk_score: 'Indice de risco',
    source_persona_key: 'Fonte',
    title: 'Titulo',
  }
  return labels[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function renderHtmlList(items: unknown[], empty: string) {
  if (!items.length) return `<p>${escapeHtml(empty)}</p>`
  return `<ol>${items.map(item => `<li>${escapeHtml(valueText(item))}</li>`).join('')}</ol>`
}

function renderHtmlCards(items: unknown[], empty: string) {
  if (!items.length) return `<p>${escapeHtml(empty)}</p>`
  return items.map((item) => `<div class="card">${escapeHtml(valueText(item))}</div>`).join('')
}

function renderHtmlTable(rows: unknown[], empty: string) {
  if (!rows.length) return `<p>${escapeHtml(empty)}</p>`
  const normalized = rows.map(asRecord).filter(row => Object.keys(row).length)
  if (!normalized.length) return renderHtmlList(rows, empty)
  const keys = [...new Set(normalized.flatMap(row => Object.keys(row)))].slice(0, 5)
  return `
    <table>
      <thead><tr>${keys.map(key => `<th>${escapeHtml(friendlyLabel(key))}</th>`).join('')}</tr></thead>
      <tbody>${normalized.map(row => `<tr>${keys.map(key => `<td>${escapeHtml(valueText(row[key]))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`
}

function exportRows(boardPack: BoardPackRow, companyName: string): ExportRow[] {
  const payload = asRecord(boardPack.export_payload)
  const financialReport = asRecord(payload.financial_report)
  const advisorReports = asArray(payload.advisor_reports)
  const sourceReferences = asArray(payload.source_references)
  const rows: ExportRow[] = [
    { section: 'Empresa', index: 1, content: companyName },
    { section: 'Nota de uso', index: 1, content: 'Este Board Pack e uma sintese de governanca assistida por IA. Use como estrutura de decisao, nao como substituto de conselho formal, auditoria, parecer juridico ou decisao fiduciaria.' },
    ...(sourceReferences.length
      ? sourceReferences.map((source, index) => ({ section: 'Fontes consideradas', index: index + 1, content: valueText(source) }))
      : [{ section: 'Fontes consideradas', index: 1, content: 'Company Brain, documentos enviados e memoria de decisoes disponiveis no momento da geracao.' }]),
    { section: 'Sumario executivo', index: 1, content: boardPack.executive_summary ?? '' },
  ]

  const pushSection = (section: string, value: unknown) => {
    const items = asArray(value)
    if (!items.length) {
      rows.push({ section, index: 1, content: valueText(value) })
      return
    }
    items.forEach((item, index) => rows.push({ section, index: index + 1, content: valueText(item) }))
  }

  pushSection('Perguntas estrategicas', boardPack.strategic_questions)
  Object.entries(financialReport).forEach(([section, value]) => pushSection(`Financeiro - ${section}`, value))
  pushSection('Relatorios dos advisors', advisorReports)
  pushSection('Mapa de riscos', boardPack.risk_map)
  pushSection('Ranking de prioridades', boardPack.priority_ranking)
  pushSection('Agenda da reuniao', boardPack.meeting_agenda)
  pushSection('Candidatos de decisao', boardPack.decision_candidates)

  return rows.filter(row => row.content.trim())
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

function textLines(boardPack: BoardPackRow, companyName: string): string[] {
  const lines = [`Board Pack v${boardPack.version} - ${companyName}`, '']
  for (const row of exportRows(boardPack, companyName)) {
    lines.push(`${row.section}${row.index > 1 ? ` ${row.index}` : ''}`)
    lines.push(...wrapText(row.content, 96))
    lines.push('')
  }
  return lines
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
  const sourceReferences = asArray(payload.source_references)

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Board Pack - ${escapeHtml(companyName)}</title>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #eee9df; color: #1f2933; line-height: 1.55; }
    main { max-width: 980px; margin: 0 auto; background: #fbfaf7; min-height: 100vh; padding: 52px; }
    h1, h2 { font-family: Georgia, "Times New Roman", serif; color: #111827; }
    h1 { font-size: 34px; margin-bottom: 4px; }
    h2 { font-size: 22px; margin-top: 34px; border-top: 1px solid #d8c7a1; padding-top: 18px; }
    .meta { color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
    .summary { font-size: 18px; max-width: 860px; }
    .disclaimer { background: #f7f2e8; border-left: 4px solid #d0a84e; padding: 14px 16px; margin: 22px 0; }
    .card { border: 1px solid #e5ddce; border-radius: 6px; padding: 12px 14px; margin: 10px 0; background: #fffdf9; }
    li { margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 22px; }
    th, td { border-bottom: 1px solid #e5ddce; text-align: left; padding: 9px; vertical-align: top; }
    th { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    @media print { body { background: #fff; } main { padding: 32px; } }
  </style>
</head>
<body>
<main>
  <p class="meta">Board Governance OS · Board Pack v${boardPack.version}</p>
  <h1>${escapeHtml(companyName)}</h1>
  <div class="disclaimer">
    <strong>Nota de uso.</strong> Este Board Pack e uma sintese de governanca assistida por IA. Use como estrutura de decisao, nao como substituto de conselho formal, auditoria, parecer juridico ou decisao fiduciaria.
  </div>
  <p class="summary">${escapeHtml(boardPack.executive_summary || 'Nenhum sumario executivo disponivel.')}</p>

  <h2>Fontes consideradas</h2>
  ${sourceReferences.length
    ? renderHtmlCards(sourceReferences, 'Nenhuma fonte registrada.')
    : '<p>Company Brain, documentos enviados e memoria de decisoes disponiveis no momento da geracao.</p>'}

  <h2>Perguntas estrategicas</h2>
  ${renderHtmlList(questions, 'Nenhuma pergunta estrategica registrada.')}

  <h2>Mapa de riscos</h2>
  ${renderHtmlCards(risks, 'Nenhum risco registrado.')}

  <h2>Relatorios financeiros</h2>
  ${Object.entries(financialReport).map(([section, rows]) => `
    <h3>${escapeHtml(section)}</h3>
    ${renderHtmlTable(asArray(rows), 'Sem linhas financeiras para esta secao.')}
  `).join('') || '<p>Nenhum relatorio financeiro estruturado disponivel ainda.</p>'}

  <h2>Relatorios estruturados dos advisors</h2>
  ${renderHtmlCards(advisorReports, 'Nenhum relatorio de advisor disponivel ainda.')}

  <h2>Ranking de prioridades</h2>
  ${renderHtmlCards(priorities, 'Nenhuma prioridade registrada.')}

  <h2>Agenda da reuniao</h2>
  ${renderHtmlList(agenda, 'Nenhuma agenda registrada.')}

  <h2>Candidatos de decisao</h2>
  ${renderHtmlCards(decisions, 'Nenhum candidato de decisao registrado.')}
</main>
</body>
</html>`
}

function renderCsv(boardPack: BoardPackRow, companyName: string): string {
  const payload = asRecord(boardPack.export_payload)
  const financialReport = asRecord(payload.financial_report)
  const advisorReports = asArray(payload.advisor_reports)
  const sourceReferences = asArray(payload.source_references)
  return [
    ['section', 'index', 'content'].map(csvCell).join(','),
    ['company', 1, companyName].map(csvCell).join(','),
    ['usage_note', 1, 'AI-assisted governance synthesis; not a substitute for formal board, audit, legal, or fiduciary judgment.'].map(csvCell).join(','),
    ...sectionRows('source_reference', sourceReferences.length ? sourceReferences : ['Company Brain and uploaded documents available at generation time.']),
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

function renderPdf(boardPack: BoardPackRow, companyName: string): Buffer {
  const allLines = textLines(boardPack, companyName).flatMap(line => wrapText(line, 86))
  const linesPerPage = 46
  const pages: string[][] = []
  for (let index = 0; index < allLines.length; index += linesPerPage) {
    pages.push(allLines.slice(index, index + linesPerPage))
  }

  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const pageObjectIds: number[] = []
  for (const pageLines of pages) {
    const pageObjectId = objects.length + 1
    const contentObjectId = pageObjectId + 1
    pageObjectIds.push(pageObjectId)
    const stream = [
      'BT',
      '/F1 10 Tf',
      '50 748 Td',
      '14 TL',
      ...pageLines.map(line => `(${escapePdf(line.slice(0, 110))}) Tj T*`),
      'ET',
    ].join('\n')

    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjectId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`)
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'utf8')
}

async function renderDocx(boardPack: BoardPackRow, companyName: string): Promise<Buffer> {
  const zip = new JSZip()
  const paragraphs = textLines(boardPack, companyName).map(line => `
    <w:p>
      <w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>
    </w:p>`).join('')

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>
  </w:body>
</w:document>`)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function pptTextShape(id: number, title: string, body: string, y: number): string {
  const bodyLines = wrapText(body, 74).slice(0, 9)
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="620000" y="${y}"/><a:ext cx="10800000" cy="1450000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square"/><a:lstStyle/>
        <a:p><a:r><a:rPr lang="pt-BR" sz="2400" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
        ${bodyLines.map(line => `<a:p><a:r><a:rPr lang="pt-BR" sz="1500"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`).join('')}
      </p:txBody>
    </p:sp>`
}

async function renderPptx(boardPack: BoardPackRow, companyName: string): Promise<Buffer> {
  const zip = new JSZip()
  const rows = exportRows(boardPack, companyName)
  const slideChunks: ExportRow[][] = []
  for (let index = 0; index < rows.length; index += 3) slideChunks.push(rows.slice(index, index + 3))

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideChunks.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}
</Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`)
  zip.folder('ppt')?.file('presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${slideChunks.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join('')}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`)
  zip.folder('ppt')?.folder('_rels')?.file('presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${slideChunks.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('')}
</Relationships>`)

  const slideFolder = zip.folder('ppt')?.folder('slides')
  slideChunks.forEach((chunk, index) => {
    slideFolder?.file(`slide${index + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    ${pptTextShape(2, index === 0 ? `Board Pack - ${companyName}` : `Board Pack - ${companyName} (${index + 1})`, chunk.map(row => `${row.section}: ${row.content}`).join(' '), 520000)}
    ${chunk.slice(1).map((row, rowIndex) => pptTextShape(3 + rowIndex, row.section, row.content, 2300000 + rowIndex * 1500000)).join('')}
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`)
  })

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function renderXlsx(boardPack: BoardPackRow, companyName: string): Promise<Buffer> {
  const zip = new JSZip()
  const rows = [
    ['section', 'index', 'content'],
    ...exportRows(boardPack, companyName).map(row => [row.section, String(row.index), row.content]),
  ]
  const cell = (ref: string, value: string) => `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
  const sheetRows = rows.map((row, rowIndex) => {
    const index = rowIndex + 1
    return `<row r="${index}">${cell(`A${index}`, row[0])}${cell(`B${index}`, row[1])}${cell(`C${index}`, row[2])}</row>`
  }).join('')

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)
  zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Board Pack" sheetId="1" r:id="rId1"/></sheets>
</workbook>`)
  zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`)
  zip.folder('xl')?.folder('worksheets')?.file('sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function renderExport(boardPack: BoardPackRow, companyName: string, exportType: SupportedExportType): Promise<Buffer> {
  if (exportType === 'html') return Buffer.from(renderHtml(boardPack, companyName), 'utf8')
  if (exportType === 'csv') return Buffer.from(renderCsv(boardPack, companyName), 'utf8')
  if (exportType === 'pdf') return renderPdf(boardPack, companyName)
  if (exportType === 'docx') return renderDocx(boardPack, companyName)
  if (exportType === 'pptx') return renderPptx(boardPack, companyName)
  return renderXlsx(boardPack, companyName)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const boardPackId = typeof body?.board_pack_id === 'string' ? body.board_pack_id : null
  const exportType = (typeof body?.export_type === 'string' ? body.export_type : 'html') as SupportedExportType

  if (!boardPackId) return NextResponse.json({ error: 'board_pack_id is required' }, { status: 400 })
  if (!SUPPORTED_EXPORT_TYPES.includes(exportType)) {
    return NextResponse.json({ error: `export_type must be one of ${SUPPORTED_EXPORT_TYPES.join(', ')}` }, { status: 400 })
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

  const companyName = company?.name ?? 'Empresa'
  const content = await renderExport(boardPack as BoardPackRow, companyName, exportType)
  const signedUrlTtl = signedUrlTtlSeconds()
  const storagePath = [
    boardPack.organization_id,
    boardPack.company_id,
    boardPack.id,
    `${randomUUID()}-board-pack-v${boardPack.version}.${exportType}`,
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
      signed_url_ttl_seconds: signedUrlTtl,
    },
  })

  const { data: signedUrl } = await service.storage
    .from('board-exports')
    .createSignedUrl(storagePath, signedUrlTtl)

  return NextResponse.json({
    mode: 'live-supabase',
    artifact_id: artifact.id,
    storage_bucket: 'board-exports',
    storage_path: storagePath,
    export_type: exportType,
    content_type: contentTypes[exportType],
    signed_url_ttl_seconds: signedUrlTtl,
    signed_url: signedUrl?.signedUrl ?? null,
  })
}
