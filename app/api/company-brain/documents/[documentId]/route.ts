import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

type RouteContext = {
  params: Promise<{ documentId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const { documentId } = await params
  const body = await request.json().catch(() => null)
  const relevance = body?.relevance === 'excluded' ? 'excluded' : body?.relevance === 'included' ? 'included' : null

  if (!documentId) return NextResponse.json({ error: 'document id is required' }, { status: 400 })
  if (!relevance) return NextResponse.json({ error: 'relevance must be included or excluded' }, { status: 400 })

  const service = serviceClient()
  const { data: document, error } = await service
    .from('uploaded_documents')
    .select('id, organization_id, company_id, metadata')
    .eq('id', documentId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: 'document not found' }, { status: 404 })

  const access = await requireCompanyAdmin(document.company_id)
  if (isAuthError(access)) return access

  const metadata = document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
    ? document.metadata as Record<string, unknown>
    : {}

  const { error: updateError } = await service
    .from('uploaded_documents')
    .update({
      metadata: {
        ...metadata,
        governance_relevance: relevance,
        relevance_updated_at: new Date().toISOString(),
        relevance_updated_by: user.id,
      },
    })
    .eq('id', documentId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: memoryError } = await service
    .from('company_brain_entries')
    .update({ status: relevance === 'included' ? 'active' : 'inactive' })
    .eq('source_document_id', documentId)

  if (memoryError) return NextResponse.json({ error: memoryError.message }, { status: 500 })

  await service.from('audit_events').insert({
    organization_id: document.organization_id,
    company_id: document.company_id,
    actor_user_id: user.id,
    event_type: relevance === 'included' ? 'company_brain.document_included' : 'company_brain.document_excluded',
    entity_type: 'uploaded_document',
    entity_id: documentId,
    metadata: { relevance },
  })

  return NextResponse.json({
    document_id: documentId,
    relevance,
  })
}
