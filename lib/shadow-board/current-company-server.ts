import 'server-only'

import type { User } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/auth-server'
import { ensureUserWorkspace } from '@/lib/shadow-board/bootstrap'

type CompanyMembershipRow = {
  company_id: string
  role: string
}

export type CurrentCompany = {
  id: string
  organization_id: string
  name: string
  slug: string
  status: string
  stage?: string | null
  metadata?: Record<string, unknown> | null
}

function preferOperationalCompany(companies: CurrentCompany[]) {
  return companies.find((company) => company.metadata?.training_pack !== true) ?? companies[0] ?? null
}

export async function getCurrentCompanyForUser(user: User): Promise<CurrentCompany | null> {
  await ensureUserWorkspace(user)

  const service = serviceClient()
  const { data: companyMemberships, error: companyMembershipError } = await service
    .from('company_memberships')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (companyMembershipError) throw new Error(companyMembershipError.message)

  const companyIds = ((companyMemberships ?? []) as CompanyMembershipRow[]).map((membership) => membership.company_id)
  if (companyIds.length) {
    const { data: companies, error } = await service
      .from('companies')
      .select('id, organization_id, name, slug, status, stage, metadata')
      .in('id', companyIds)

    if (error) throw new Error(error.message)
    const companiesById = new Map(((companies ?? []) as CurrentCompany[]).map((company) => [company.id, company]))
    const preferred = preferOperationalCompany(companyIds.map((id) => companiesById.get(id)).filter(Boolean) as CurrentCompany[])
    if (preferred) return preferred
  }

  const { data: organizationMembership, error: organizationMembershipError } = await service
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (organizationMembershipError) throw new Error(organizationMembershipError.message)
  if (!organizationMembership?.organization_id) return null

  const { data: companies, error } = await service
    .from('companies')
    .select('id, organization_id, name, slug, status, stage, metadata')
    .eq('organization_id', organizationMembership.organization_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return preferOperationalCompany((companies ?? []) as CurrentCompany[])
}
