import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { ensureUserWorkspace } from '@/lib/shadow-board/bootstrap'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') || '/dashboard'
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`)
  }

  try {
    await ensureUserWorkspace(user)
    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bootstrap_failed'
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)
  }
}

export async function POST() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const bootstrap = await ensureUserWorkspace(user)
    return NextResponse.json({ bootstrap })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bootstrap workspace' },
      { status: 500 }
    )
  }
}
