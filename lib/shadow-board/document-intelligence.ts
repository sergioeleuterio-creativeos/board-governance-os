import 'server-only'

import JSZip from 'jszip'
import { serviceClient } from '@/lib/auth-server'

const MAX_EXTRACTED_TEXT_CHARS = 120_000
const MAX_MEMORY_TEXT_CHARS = 8_000
const MAX_FINANCIAL_SIGNALS = 40

type ExtractionKind = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt' | 'unknown'

interface UploadedDocumentRow {
  id: string
  organization_id: string
  company_id: string
  uploaded_by: string | null
  storage_bucket: string
  storage_path: string
  original_filename: string
  mime_type: string | null
  file_ext: string | null
  file_size_bytes: number | null
  document_type: string | null
}

export interface DocumentExtractionResult {
  documentId: string
  companyId: string
  originalFilename: string
  kind: ExtractionKind
  charactersExtracted: number
  extractionRowsCreated: number
  memoryEntriesCreated: number
  summary: string
}

function extensionFor(fileName: string | null | undefined): string {
  return fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
}

function extractionKindFor(document: UploadedDocumentRow): ExtractionKind {
  const ext = document.file_ext?.toLowerCase() || extensionFor(document.original_filename)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'xlsx') return 'xlsx'
  if (ext === 'pptx') return 'pptx'
  if (ext === 'csv') return 'csv'
  if (ext === 'txt') return 'txt'
  return 'unknown'
}

function normalizeText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_CHARS)
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractTextRuns(xml: string): string[] {
  return Array.from(xml.matchAll(/<(?:a:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a:)?t>/g))
    .map(match => decodeXml(match[1].replace(/<[^>]+>/g, '')).trim())
    .filter(Boolean)
}

function readableName(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || value
}

function buildSummary(text: string, fileName: string): string {
  const compact = normalizeText(text)
  if (!compact) return `No readable text could be extracted from ${fileName}.`

  const sentences = compact
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 32)
    .slice(0, 4)

  const body = sentences.length > 0 ? sentences.join(' ') : compact.slice(0, 600)
  return `${readableName(fileName)}: ${body}`.slice(0, 1_800)
}

function detectMemoryCategory(text: string): 'financial' | 'risk' | 'customer' | 'operations' | 'plan' | 'fact' {
  const lower = text.toLowerCase()
  if (/(revenue|receita|margin|margem|cash|caixa|runway|ebitda|budget|or[cç]amento)/.test(lower)) return 'financial'
  if (/(risk|risco|compliance|concentration|concentra[cç][aã]o|dependency|depend[eê]ncia)/.test(lower)) return 'risk'
  if (/(customer|cliente|brand|marca|market|mercado|retention|reten[cç][aã]o|churn)/.test(lower)) return 'customer'
  if (/(process|processo|operation|opera[cç][aã]o|workflow|cadence|cad[eê]ncia|owner|respons[aá]vel)/.test(lower)) return 'operations'
  if (/(plan|plano|roadmap|priority|prioridade|timeline|cronograma|goal|objetivo)/.test(lower)) return 'plan'
  return 'fact'
}

function extractFinancialSignals(text: string) {
  const financialPattern = /(dre|p&l|profit|loss|receita|revenue|faturamento|margem|margin|ebitda|lucro|profit|cash|caixa|runway|burn|ocf|operating cash flow|fluxo de caixa|capex|opex|budget|or[cç]amento|custo|cost|cac|ltv|churn|retention|reten[cç][aã]o|inadimpl[eê]ncia|endividamento|debt|roi|roas|ticket|arpu|arr|mrr)/i
  const valuePattern = /(?:R\$|\$|BRL|USD|EUR)?\s*-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s*(?:%|pp|bps|mil|mi|m|k|mm|bn|bi)?/gi
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 8 && line.length <= 500)

  return lines
    .filter((line) => financialPattern.test(line))
    .map((line) => {
      const values = Array.from(line.matchAll(valuePattern)).map((match) => match[0].trim())
      return {
        line,
        values: [...new Set(values)].slice(0, 8),
      }
    })
    .filter((signal) => signal.values.length || financialPattern.test(signal.line))
    .slice(0, MAX_FINANCIAL_SIGNALS)
}

function buildFinancialSummary(signals: Array<{ line: string; values: string[] }>, fileName: string) {
  if (!signals.length) return ''
  const preview = signals
    .slice(0, 8)
    .map((signal) => {
      const values = signal.values.length ? ` (${signal.values.join(', ')})` : ''
      return `${signal.line}${values}`
    })
    .join(' | ')

  return `${readableName(fileName)} contem sinais financeiros/operacionais relevantes para Board Pack: ${preview}`.slice(0, 1_800)
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const slides: string[] = []
  for (const name of slideFiles) {
    const xml = await zip.file(name)?.async('string')
    if (!xml) continue
    const text = extractTextRuns(xml).join(' ')
    if (text) slides.push(`${name.replace('ppt/slides/', '').replace('.xml', '')}: ${text}`)
  }

  return slides.join('\n\n')
}

function sharedStringsFromXml(xml: string): string[] {
  return Array.from(xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g))
    .map(match => extractTextRuns(match[1]).join(' '))
}

function worksheetTextFromXml(xml: string, sharedStrings: string[]): string {
  const rows = Array.from(xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g))
  return rows.map(rowMatch => {
    const cells = Array.from(rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g))
    return cells.map(cellMatch => {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      if (/t="s"/.test(attrs)) {
        const index = Number.parseInt(body.match(/<v>(.*?)<\/v>/)?.[1] ?? '', 10)
        return Number.isFinite(index) ? sharedStrings[index] ?? '' : ''
      }
      if (/t="inlineStr"/.test(attrs)) return extractTextRuns(body).join(' ')
      return decodeXml(body.match(/<v>(.*?)<\/v>/)?.[1] ?? '').trim()
    }).filter(Boolean).join('\t')
  }).filter(Boolean).join('\n')
}

async function extractXlsx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string')
  const sharedStrings = sharedXml ? sharedStringsFromXml(sharedXml) : []
  const sheetFiles = Object.keys(zip.files)
    .filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const sheets: string[] = []
  for (const name of sheetFiles) {
    const xml = await zip.file(name)?.async('string')
    if (!xml) continue
    const text = worksheetTextFromXml(xml, sharedStrings)
    if (text) sheets.push(`${name.replace('xl/worksheets/', '').replace('.xml', '')}\n${text}`)
  }

  return sheets.join('\n\n')
}

async function extractTextByKind(kind: ExtractionKind, buffer: Buffer): Promise<string> {
  if (kind === 'pdf') return extractPdf(buffer)
  if (kind === 'docx') return extractDocx(buffer)
  if (kind === 'pptx') return extractPptx(buffer)
  if (kind === 'xlsx') return extractXlsx(buffer)
  if (kind === 'csv' || kind === 'txt') return buffer.toString('utf8')
  throw new Error('unsupported_document_type')
}

export async function extractUploadedDocument(
  documentId: string,
  actorUserId: string | null
): Promise<DocumentExtractionResult> {
  const service = serviceClient()
  const { data: document, error: documentError } = await service
    .from('uploaded_documents')
    .select('id, organization_id, company_id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, file_ext, file_size_bytes, document_type')
    .eq('id', documentId)
    .maybeSingle()

  if (documentError) throw new Error(documentError.message)
  if (!document) throw new Error('document_not_found')

  const typedDocument = document as UploadedDocumentRow
  const kind = extractionKindFor(typedDocument)
  if (kind === 'unknown') throw new Error('unsupported_document_type')

  await service.from('uploaded_documents').update({ status: 'processing' }).eq('id', documentId)

  try {
    const { data: blob, error: downloadError } = await service.storage
      .from(typedDocument.storage_bucket)
      .download(typedDocument.storage_path)

    if (downloadError || !blob) throw new Error(downloadError?.message || 'failed_to_download_document')

    const buffer = Buffer.from(await blob.arrayBuffer())
    const extractedText = normalizeText(await extractTextByKind(kind, buffer))
    const summary = buildSummary(extractedText, typedDocument.original_filename)
    const category = detectMemoryCategory(`${typedDocument.original_filename}\n${summary}\n${extractedText.slice(0, 2_000)}`)
    const financialSignals = extractFinancialSignals(extractedText)
    const financialSummary = buildFinancialSummary(financialSignals, typedDocument.original_filename)

    await service.from('document_extractions').delete().eq('document_id', documentId)
    await service.from('company_brain_entries').delete().eq('source_document_id', documentId)

    const extractionRows = [
      {
        organization_id: typedDocument.organization_id,
        company_id: typedDocument.company_id,
        document_id: documentId,
        extraction_type: 'text',
        content: extractedText || null,
        structured_data: {
          source: 'document-intelligence-v1',
          kind,
          original_filename: typedDocument.original_filename,
          characters: extractedText.length,
        },
        confidence_score: extractedText ? 82 : 20,
        source_locations: {},
        status: extractedText ? 'processed' : 'failed',
      },
      {
        organization_id: typedDocument.organization_id,
        company_id: typedDocument.company_id,
        document_id: documentId,
        extraction_type: 'summary',
        content: summary,
        structured_data: {
          source: 'document-intelligence-v1',
          kind,
          original_filename: typedDocument.original_filename,
        },
        confidence_score: extractedText ? 76 : 20,
        source_locations: {},
        status: extractedText ? 'processed' : 'failed',
      },
      {
        organization_id: typedDocument.organization_id,
        company_id: typedDocument.company_id,
        document_id: documentId,
        extraction_type: 'memory',
        content: summary,
        structured_data: {
          source: 'document-intelligence-v1',
          category,
          promoted_to_company_brain: Boolean(extractedText),
        },
        confidence_score: extractedText ? 72 : 20,
        source_locations: {},
        status: extractedText ? 'processed' : 'failed',
      },
      ...(financialSignals.length ? [{
        organization_id: typedDocument.organization_id,
        company_id: typedDocument.company_id,
        document_id: documentId,
        extraction_type: 'financials',
        content: financialSummary,
        structured_data: {
          source: 'document-intelligence-v1',
          kind,
          original_filename: typedDocument.original_filename,
          financial_signals: financialSignals,
          signal_count: financialSignals.length,
        },
        confidence_score: 74,
        source_locations: {},
        status: 'processed',
      }] : []),
    ]

    const { error: extractionError } = await service.from('document_extractions').insert(extractionRows)
    if (extractionError) throw new Error(extractionError.message)

    let memoryEntriesCreated = 0
    if (extractedText) {
      const memoryRows: Array<Record<string, unknown>> = [{
        organization_id: typedDocument.organization_id,
        company_id: typedDocument.company_id,
        source_document_id: documentId,
        created_by: actorUserId,
        category,
        source_type: 'file',
        title: `Document intelligence - ${typedDocument.original_filename}`,
        content: summary.length > 0 ? summary : extractedText.slice(0, MAX_MEMORY_TEXT_CHARS),
        confidence_score: 72,
        status: 'active',
        metadata: {
          source: 'document-intelligence-v1',
          kind,
          original_filename: typedDocument.original_filename,
          characters_extracted: extractedText.length,
        },
      }]

      if (financialSummary) {
        memoryRows.push({
          organization_id: typedDocument.organization_id,
          company_id: typedDocument.company_id,
          source_document_id: documentId,
          created_by: actorUserId,
          category: 'financial',
          source_type: 'file',
          title: `Financial signals - ${typedDocument.original_filename}`,
          content: financialSummary,
          confidence_score: 74,
          status: 'active',
          metadata: {
            source: 'document-intelligence-v1',
            kind,
            original_filename: typedDocument.original_filename,
            financial_signal_count: financialSignals.length,
          },
        })
      }

      const { error: memoryError } = await service.from('company_brain_entries').insert(memoryRows)

      if (memoryError) throw new Error(memoryError.message)
      memoryEntriesCreated = memoryRows.length
    }

    const { error: updateError } = await service
      .from('uploaded_documents')
      .update({
        status: extractedText ? 'processed' : 'failed',
        summary,
        metadata: {
          extraction: {
            source: 'document-intelligence-v1',
            kind,
            characters_extracted: extractedText.length,
            financial_signals: financialSignals.length,
            processed_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', documentId)

    if (updateError) throw new Error(updateError.message)

    await service.from('audit_events').insert({
      organization_id: typedDocument.organization_id,
      company_id: typedDocument.company_id,
      actor_user_id: actorUserId,
      event_type: 'company_brain.document_extracted',
      entity_type: 'uploaded_document',
      entity_id: documentId,
      metadata: {
        kind,
        original_filename: typedDocument.original_filename,
        characters_extracted: extractedText.length,
        financial_signals: financialSignals.length,
        memory_entries_created: memoryEntriesCreated,
      },
    })

    return {
      documentId,
      companyId: typedDocument.company_id,
      originalFilename: typedDocument.original_filename,
      kind,
      charactersExtracted: extractedText.length,
      extractionRowsCreated: extractionRows.length,
      memoryEntriesCreated,
      summary,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_extraction_error'
    await service
      .from('uploaded_documents')
      .update({
        status: 'failed',
        metadata: {
          extraction: {
            source: 'document-intelligence-v1',
            failed_at: new Date().toISOString(),
            error: message,
          },
        },
      })
      .eq('id', documentId)

    throw error
  }
}
