import { NextRequest, NextResponse } from 'next/server'
import { buildIntakeResult, createEmptyIntakeDraft, type CompanyBrainIntakeDraft } from '@/lib/shadow-board/intake'
import { isAuthError, requireAuth } from '@/lib/auth-server'
import { persistCompanyBrainIntake } from '@/lib/shadow-board/intake-persistence'

export async function GET() {
  const draft = createEmptyIntakeDraft()
  return NextResponse.json({
    mode: 'live-supabase',
    result: buildIntakeResult(draft),
  })
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)

  if (!body?.draft) {
    return NextResponse.json({ error: 'draft is required' }, { status: 400 })
  }

  const draft = body.draft as CompanyBrainIntakeDraft
  const result = buildIntakeResult(draft)
  const persistence = await persistCompanyBrainIntake(user, result.draft, result)

  return NextResponse.json({
    mode: 'live-supabase',
    persisted: true,
    nextAdapter: 'supabase-storage-files',
    result,
    persistence,
  })
}
