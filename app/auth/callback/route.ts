import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'
  const isRecovery = type === 'recovery' || next === '/reset-password'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectTo = isRecovery ? '/reset-password' : next
      return NextResponse.redirect(`${origin}/api/auth/bootstrap?next=${encodeURIComponent(redirectTo)}`)
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
    })
    if (!error) {
      const redirectTo = isRecovery ? '/reset-password' : next
      return NextResponse.redirect(`${origin}/api/auth/bootstrap?next=${encodeURIComponent(redirectTo)}`)
    }
  }

  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
