import { NextRequest, NextResponse } from 'next/server'
import { extractUploadedDocument } from '@/lib/shadow-board/document-intelligence'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)
  const documentId = typeof body?.document_id === 'string' ? body.document_id : null
  if (!documentId) return NextResponse.json({ error: 'document_id is required' }, { status: 400 })

  const service = serviceClient()
  const { data: document, error } = await service
    .from('uploaded_documents')
    .select('id, company_id')
    .eq('id', documentId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: 'document not found' }, { status: 404 })

  const access = await requireCompanyAdmin(document.company_id)
  if (isAuthError(access)) return access

  try {
    const result = await extractUploadedDocument(documentId, user.id)
    return NextResponse.json({
      mode: 'live-supabase',
      result,
      nextAdapter: 'governance-run-from-company-brain',
    })
  } catch (extractError) {
    return NextResponse.json(
      { error: extractError instanceof Error ? extractError.message : 'document extraction failed' },
      { status: 500 }
    )
  }
}
