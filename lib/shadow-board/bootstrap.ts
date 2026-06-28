import 'server-only'

import type { User } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/auth-server'
import type { OrganizationRole } from '@/lib/shadow-board/domain'

function configuredAdminEmails(): Set<string> {
  const raw = [
    process.env.BOARD_GOVERNANCE_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
  ].filter(Boolean).join(',')

  return new Set(
    raw
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isConfiguredSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return configuredAdminEmails().has(email.trim().toLowerCase())
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return slug || 'workspace'
}

function displayNameFor(user: User): string | null {
  const metadata = user.user_metadata ?? {}
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

function organizationNameFor(user: User): string {
  const email = user.email?.trim().toLowerCase()
  const domain = email?.split('@')[1]?.split('.')[0]
  const name = displayNameFor(user)
  if (name) return `${name}'s workspace`
  if (domain) return `${domain.charAt(0).toUpperCase()}${domain.slice(1)} workspace`
  return 'Board Governance workspace'
}

export async function ensureUserWorkspace(user: User) {
  const service = serviceClient()
  const email = user.email?.trim().toLowerCase() ?? null
  const fullName = displayNameFor(user)
  const isSuperAdmin = isConfiguredSuperAdminEmail(email)

  const { error: profileError } = await service
    .from('user_profiles')
    .upsert({
      id: user.id,
      email,
      full_name: fullName,
      locale: 'pt-BR',
      timezone: process.env.BOARD_GOVERNANCE_DEFAULT_TIMEZONE || 'America/Sao_Paulo',
      is_super_admin: isSuperAdmin,
      status: 'active',
    }, { onConflict: 'id' })

  if (profileError) throw new Error(profileError.message)

  const { data: existingMembership, error: membershipError } = await service
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)

  if (existingMembership?.organization_id) {
    const { data: organization, error: orgError } = await service
      .from('organizations')
      .select('id, name, slug, default_locale, status')
      .eq('id', existingMembership.organization_id)
      .maybeSingle()

    if (orgError) throw new Error(orgError.message)
    return {
      profile: { id: user.id, email, full_name: fullName, is_super_admin: isSuperAdmin },
      organization,
      membership: existingMembership,
      created: false,
    }
  }

  const orgName = organizationNameFor(user)
  const slugBase = slugify(orgName)
  const slug = `${slugBase}-${user.id.slice(0, 8)}`

  const { data: organization, error: orgError } = await service
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      owner_user_id: user.id,
      default_locale: 'pt-BR',
      status: 'active',
    })
    .select('id, name, slug, default_locale, status')
    .single()

  if (orgError || !organization) {
    throw new Error(orgError?.message || 'Failed to create organization')
  }

  const role: OrganizationRole = isSuperAdmin ? 'super_admin' : 'owner'
  const { data: membership, error: createMembershipError } = await service
    .from('organization_memberships')
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .select('organization_id, role')
    .single()

  if (createMembershipError || !membership) {
    throw new Error(createMembershipError?.message || 'Failed to create organization membership')
  }

  return {
    profile: { id: user.id, email, full_name: fullName, is_super_admin: isSuperAdmin },
    organization,
    membership,
    created: true,
  }
}
