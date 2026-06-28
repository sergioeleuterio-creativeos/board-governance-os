/**
 * Supabase browser client for auth operations.
 * Uses @supabase/ssr so sessions are stored in cookies (readable by middleware).
 *
 * Keep this separate from lib/supabase.ts (the data client).
 */
import { createBrowserClient } from '@supabase/ssr'

export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Compatibility helper for older login screens.
 * Board Governance OS is password-only, so stale callers always receive
 * the stricter method.
 */
export async function getLoginMethod(email: string): Promise<'password'> {
  try {
    await fetch('/api/auth/login-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    // no-op: this route is kept only for compatibility.
  }
  return 'password'
}
