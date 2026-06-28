/**
 * SERVER-ONLY auth helpers for API route handlers.
 * Import only inside /app/api/ route files — never in client components.
 *
 * Uses the cookie-based Supabase session so the caller must be a real
 * authenticated user; a raw service-role key is not sufficient to pass
 * requireAuth / requireAdmin.
 */
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

// ── Session client (reads the caller's cookie session) ────────────────────────
async function sessionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

// ── Service client (bypasses RLS for privileged operations) ──────────────────
export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = await sessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Require any authenticated user ───────────────────────────────────────────
// Returns the user object, or a 401 NextResponse.
export async function requireAuth(): Promise<User | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  return user
}

// ── Require a platform super admin ───────────────────────────────────────────
// Checks user_profiles.is_super_admin. Organization/company admins are scoped by
// the helpers below.
export async function requireSuperAdmin(): Promise<User | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = serviceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return user
}

// Backward-compatible alias for older admin routes.
export async function requireAdmin(): Promise<User | NextResponse> {
  return requireSuperAdmin()
}

export async function requireOrganizationAdmin(organizationId: string): Promise<User | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = serviceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_super_admin) return user

  const { data: membership } = await service
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'super_admin'])
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return user
}

export async function requireCompanyAdmin(companyId: string): Promise<User | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = serviceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_super_admin) return user

  const { data: companyMembership } = await service
    .from('company_memberships')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['founder', 'admin', 'advisor_operator'])
    .maybeSingle()

  if (companyMembership) return user

  const { data: company } = await service
    .from('companies')
    .select('organization_id')
    .eq('id', companyId)
    .maybeSingle()

  if (company?.organization_id) {
    return requireOrganizationAdmin(company.organization_id)
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── Type guard ────────────────────────────────────────────────────────────────
export function isAuthError(v: User | NextResponse): v is NextResponse {
  return v instanceof NextResponse
}
