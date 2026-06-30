import { NextRequest, NextResponse } from 'next/server'

type RateLimitBucket = {
  count: number
  resetAt: number
}

const globalBuckets = globalThis as typeof globalThis & {
  __boardOsRateLimitBuckets?: Map<string, RateLimitBucket>
}

function buckets() {
  if (!globalBuckets.__boardOsRateLimitBuckets) {
    globalBuckets.__boardOsRateLimitBuckets = new Map<string, RateLimitBucket>()
  }
  return globalBuckets.__boardOsRateLimitBuckets
}

export function rateLimitKey(request: NextRequest, scope: string, subject = '') {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const ip = forwardedFor || realIp || 'unknown'
  return [scope, ip, subject.trim().toLowerCase()].filter(Boolean).join(':')
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const store = buckets()
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: 0,
  }
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'rate_limited', retry_after_seconds: retryAfterSeconds },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
