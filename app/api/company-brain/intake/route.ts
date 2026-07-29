import { NextRequest, NextResponse } from 'next/server'
import { buildIntakeResult, createEmptyIntakeDraft, type CompanyBrainIntakeDraft } from '@/lib/shadow-board/intake'
import { isAuthError, requireAuth } from '@/lib/auth-server'
import { persistCompanyBrainIntake } from '@/lib/shadow-board/intake-persistence'
import { CURRENT_COMPANY_COOKIE } from '@/lib/shadow-board/current-company-server'

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

  try {
    const body = await request.json().catch(() => null)

    if (!body?.draft) {
      return NextResponse.json({ error: 'draft is required' }, { status: 400 })
    }

    const draft = body.draft as CompanyBrainIntakeDraft
    const result = buildIntakeResult(draft)
    const persistence = await persistCompanyBrainIntake(user, result.draft, result)
    if (!persistence.companyId || !persistence.governanceCycleId) {
      return NextResponse.json(
        { error: 'Company context was not durably created.', persisted: false },
        { status: 500 },
      )
    }

    const response = NextResponse.json({
      mode: 'live-supabase',
      persisted: true,
      nextAdapter: 'supabase-storage-files',
      companyName: result.draft.company.name.trim() || 'Untitled company',
      result,
      persistence,
    })
    response.cookies.set(CURRENT_COMPANY_COOKIE, persistence.companyId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    })
    return response
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create company context.',
        persisted: false,
      },
      { status: 500 },
    )
  }
}
