import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

type MemoryEntry = {
  id: string
  category: string
  source_type: string
  title: string
  content: string
  confidence_score: number | null
  created_at: string
  source_document_id: string | null
}

type UploadedDocument = {
  id: string
  original_filename: string
  file_ext: string | null
  document_type: string | null
  status: string
  summary: string | null
  created_at: string
  metadata: Record<string, unknown>
}

const categories = ['fact', 'goal', 'financial', 'risk', 'team', 'decision', 'plan', 'question', 'customer', 'operations'] as const

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({
        company: null,
        stats: Object.fromEntries(categories.map((category) => [category, 0])),
        memory_entries: [],
        unresolved_questions: [],
        recent_documents: [],
      })
    }

    const service = serviceClient()
    const [entriesResult, questionsResult, documentsResult] = await Promise.all([
      service
        .from('company_brain_entries')
        .select('id, category, source_type, title, content, confidence_score, created_at, source_document_id')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(80),
      service
        .from('company_brain_entries')
        .select('id, title, content, confidence_score, created_at')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .eq('category', 'question')
        .order('created_at', { ascending: false })
        .limit(12),
      service
        .from('uploaded_documents')
        .select('id, original_filename, file_ext, document_type, status, summary, created_at, metadata')
        .eq('company_id', company.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (entriesResult.error) throw new Error(entriesResult.error.message)
    if (questionsResult.error) throw new Error(questionsResult.error.message)
    if (documentsResult.error) throw new Error(documentsResult.error.message)

    const entries = (entriesResult.data ?? []) as MemoryEntry[]
    const stats = Object.fromEntries(categories.map((category) => [
      category,
      entries.filter((entry) => entry.category === category).length,
    ]))

    return NextResponse.json({
      company,
      stats,
      memory_entries: entries,
      unresolved_questions: questionsResult.data ?? [],
      recent_documents: (documentsResult.data ?? []) as UploadedDocument[],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Company Brain readout' },
      { status: 500 }
    )
  }
}
