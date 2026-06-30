import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const rateLimit = checkRateLimit(rateLimitKey(request, 'password-reset', email), 3, 15 * 60 * 1000)
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll() {
          // Password reset requests do not need to write session cookies.
        },
      },
    }
  )

  const redirectTo = `${getPublicAppUrl()}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error('Password reset request failed', {
      status: error.status,
      code: error.code,
      name: error.name,
      message: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
