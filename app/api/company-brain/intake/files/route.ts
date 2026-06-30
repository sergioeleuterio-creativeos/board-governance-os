import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const BUCKET = 'company-documents'
const MAX_FILES_PER_REQUEST = Number.parseInt(process.env.MAX_FILES_PER_REQUEST || '8', 10)
const MAX_FILE_BYTES = Number.parseInt(process.env.MAX_FILE_BYTES || '', 10)
  || Number.parseInt(process.env.MAX_UPLOAD_MB || '50', 10) * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  txt: 'text/plain',
}

function textValue(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function extensionFor(fileName: string): string | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? null
}

function mimeFor(file: File): string | null {
  const ext = extensionFor(file.name)
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext]
  return file.type && Object.values(MIME_BY_EXT).includes(file.type) ? file.type : null
}

function safeFileName(fileName: string): string {
  const ext = extensionFor(fileName)
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'document'

  return ext ? `${base}.${ext}` : base
}

function documentTypeFor(fileName: string): string {
  const ext = extensionFor(fileName)
  if (ext === 'pdf') return 'pdf'
  if (ext === 'pptx') return 'presentation'
  if (ext === 'xlsx' || ext === 'csv') return 'spreadsheet'
  if (ext === 'docx' || ext === 'txt') return 'document'
  return 'source'
}

function parseClientFileIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'multipart form data is required' }, { status: 400 })

  const companyId = textValue(formData, 'company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id is required' }, { status: 400 })

  const user = await requireCompanyAdmin(companyId)
  if (isAuthError(user)) return user

  const governanceCycleId = textValue(formData, 'governance_cycle_id')
  const intakeDraftId = textValue(formData, 'intake_draft_id')
  const clientFileIds = parseClientFileIds(textValue(formData, 'client_file_ids'))
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)

  if (files.length === 0) return NextResponse.json({ error: 'files are required' }, { status: 400 })
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({
      error: `too_many_files:${MAX_FILES_PER_REQUEST}`,
    }, { status: 413 })
  }

  const service = serviceClient()
  const { data: company, error: companyError } = await service
    .from('companies')
    .select('id, organization_id')
    .eq('id', companyId)
    .maybeSingle()

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })
  if (!company) return NextResponse.json({ error: 'company not found' }, { status: 404 })

  if (governanceCycleId) {
    const { data: cycle, error: cycleError } = await service
      .from('governance_cycles')
      .select('id')
      .eq('id', governanceCycleId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (cycleError) return NextResponse.json({ error: cycleError.message }, { status: 500 })
    if (!cycle) return NextResponse.json({ error: 'governance cycle not found for company' }, { status: 404 })
  }

  const uploaded: Array<{
    id: string
    clientFileId: string | null
    originalFilename: string
    storagePath: string
  }> = []
  const errors: Array<{ clientFileId: string | null; originalFilename: string; error: string }> = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const clientFileId = clientFileIds[index] ?? null
    const mimeType = mimeFor(file)

    if (file.size > MAX_FILE_BYTES) {
      errors.push({
        clientFileId,
        originalFilename: file.name,
        error: `file_too_large:${MAX_FILE_BYTES}`,
      })
      continue
    }

    if (!mimeType) {
      errors.push({
        clientFileId,
        originalFilename: file.name,
        error: 'unsupported_file_type',
      })
      continue
    }

    const storagePath = [
      company.organization_id,
      companyId,
      intakeDraftId || 'manual',
      `${randomUUID()}-${safeFileName(file.name)}`,
    ].join('/')

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      errors.push({
        clientFileId,
        originalFilename: file.name,
        error: uploadError.message,
      })
      continue
    }

    const { data: document, error: documentError } = await service
      .from('uploaded_documents')
      .insert({
        organization_id: company.organization_id,
        company_id: companyId,
        uploaded_by: user.id,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: mimeType,
        file_ext: extensionFor(file.name),
        file_size_bytes: file.size,
        document_type: documentTypeFor(file.name),
        status: 'uploaded',
        metadata: {
          source: 'company_brain_intake',
          intake_draft_id: intakeDraftId,
          governance_cycle_id: governanceCycleId,
          client_file_id: clientFileId,
        },
      })
      .select('id')
      .single()

    if (documentError || !document) {
      await service.storage.from(BUCKET).remove([storagePath])
      errors.push({
        clientFileId,
        originalFilename: file.name,
        error: documentError?.message || 'failed_to_create_uploaded_document',
      })
      continue
    }

    if (governanceCycleId) {
      await service.from('governance_inputs').insert({
        organization_id: company.organization_id,
        company_id: companyId,
        governance_cycle_id: governanceCycleId,
        source_document_id: document.id,
        created_by: user.id,
        mode: 'file',
        prompt: 'Uploaded intake document',
        content: `${file.name} uploaded to ${BUCKET}`,
        structured_data: {
          document_id: document.id,
          original_filename: file.name,
          mime_type: mimeType,
          file_size_bytes: file.size,
        },
        metadata: {
          source: 'company_brain_intake_upload',
          intake_draft_id: intakeDraftId,
          client_file_id: clientFileId,
        },
      })
    }

    await service.from('audit_events').insert({
      organization_id: company.organization_id,
      company_id: companyId,
      actor_user_id: user.id,
      event_type: 'company_brain.document_uploaded',
      entity_type: 'uploaded_document',
      entity_id: document.id,
      metadata: {
        intake_draft_id: intakeDraftId,
        governance_cycle_id: governanceCycleId,
        original_filename: file.name,
        storage_bucket: BUCKET,
        storage_path: storagePath,
      },
    })

    uploaded.push({
      id: document.id,
      clientFileId,
      originalFilename: file.name,
      storagePath,
    })
  }

  return NextResponse.json(
    {
      mode: 'live-supabase',
      bucket: BUCKET,
      uploaded,
      errors,
      nextAdapter: 'document-extraction',
    },
    { status: errors.length > 0 && uploaded.length === 0 ? 400 : 200 }
  )
}
