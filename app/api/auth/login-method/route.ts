import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/login-method
 *
 * Compatibility endpoint for the former mixed login flow.
 * Board Governance OS is password-only, so this route always returns
 * the stricter method and does not reveal account existence.
 */
export async function POST(req: NextRequest) {
  await req.json().catch(() => null)
  return NextResponse.json({ method: 'password' })
}
