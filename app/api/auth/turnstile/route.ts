import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!token) {
    return NextResponse.json({ error: 'turnstile token is required' }, { status: 400 })
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'turnstile is not configured' }, { status: 503 })
  }

  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json().catch(() => null)
  if (!response.ok || result?.success !== true) {
    return NextResponse.json({ error: 'turnstile verification failed' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
