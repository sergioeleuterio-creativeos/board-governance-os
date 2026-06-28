import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/look-feel',
  '/dashboard',
  '/company',
  '/governance-run',
  '/board-pack',
  '/shadow-board',
  '/decisions',
  '/follow-ups',
  '/design-system',
  '/mobile',
  '/auth/callback',
  '/api/auth',
]

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_RULES = [
  { prefix: '/api/governance', max: 20, windowMs: 60_000 },
  { prefix: '/api/ai', max: 30, windowMs: 60_000 },
  { prefix: '/api/admin', max: 60, windowMs: 60_000 },
]

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RATE_LIMIT_RULES.find(r => pathname.startsWith(r.prefix))
  if (!rule) return true

  const key = `${ip}:${rule.prefix}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs })
    return true
  }

  entry.count++
  return entry.count <= rule.max
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  if (!checkRateLimit(ip, pathname)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
    })
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some(p => p !== '/' && pathname.startsWith(p))
  if (isPublic) return addSecurityHeaders(NextResponse.next())

  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorised' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  return addSecurityHeaders(response)
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.openai.com https://api.anthropic.com https://challenges.cloudflare.com",
      "font-src 'self'",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; ')
  )
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
