import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type DocumentRow = {
  id: string
  organization_id: string
  company_id: string
  uploaded_by: string | null
  original_filename: string
  file_ext: string | null
  file_size_bytes: number | null
  document_type: string | null
  status: string
  summary: string | null
  metadata: unknown
  created_at: string
  updated_at: string
}

type NamedRow = {
  id: string
  name?: string
  email?: string | null
  full_name?: string | null
}

function mapById<T extends { id: string }>(rows: T[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

function governanceRelevanceFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const relevance = (metadata as Record<string, unknown>).governance_relevance
  if (relevance === 'included' || relevance === 'excluded') return relevance
  return null
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: documents, error } = await service
    .from('uploaded_documents')
    .select('id, organization_id, company_id, uploaded_by, original_filename, file_ext, file_size_bytes, document_type, status, summary, metadata, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const documentRows = (documents ?? []) as DocumentRow[]
  const organizationIds = [...new Set(documentRows.map((document) => document.organization_id))]
  const companyIds = [...new Set(documentRows.map((document) => document.company_id))]
  const userIds = [...new Set(documentRows.map((document) => document.uploaded_by).filter(Boolean))] as string[]
  const documentIds = documentRows.map((document) => document.id)

  const [organizationsResult, companiesResult, usersResult, extractionsResult] = await Promise.all([
    organizationIds.length
      ? service.from('organizations').select('id, name').in('id', organizationIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? service.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from('user_profiles').select('id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? service.from('document_extractions').select('id, document_id, extraction_type, status, confidence_score, created_at').in('document_id', documentIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (organizationsResult.error) return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  if (companiesResult.error) return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  if (usersResult.error) return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
  if (extractionsResult.error) return NextResponse.json({ error: extractionsResult.error.message }, { status: 500 })

  const organizationsById = mapById((organizationsResult.data ?? []) as NamedRow[])
  const companiesById = mapById((companiesResult.data ?? []) as NamedRow[])
  const usersById = mapById((usersResult.data ?? []) as NamedRow[])
  const extractionsByDocument = new Map<string, Array<Record<string, unknown>>>()

  for (const extraction of extractionsResult.data ?? []) {
    const documentId = String(extraction.document_id)
    const list = extractionsByDocument.get(documentId) ?? []
    list.push(extraction as Record<string, unknown>)
    extractionsByDocument.set(documentId, list)
  }

  return NextResponse.json({
    documents: documentRows.map((document) => ({
      ...document,
      governance_relevance: governanceRelevanceFromMetadata(document.metadata),
      organization_name: organizationsById.get(document.organization_id)?.name ?? 'Organizacao sem nome',
      company_name: companiesById.get(document.company_id)?.name ?? 'Empresa sem nome',
      uploaded_by_label: document.uploaded_by
        ? usersById.get(document.uploaded_by)?.full_name || usersById.get(document.uploaded_by)?.email || 'Usuario'
        : 'Sistema',
      extractions: extractionsByDocument.get(document.id) ?? [],
      extraction_count: extractionsByDocument.get(document.id)?.length ?? 0,
    })),
  })
}
