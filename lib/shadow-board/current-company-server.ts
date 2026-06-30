import 'server-only'

import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
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

export const CURRENT_COMPANY_COOKIE = 'board_governance_current_company_id'

function preferOperationalCompany(companies: CurrentCompany[]) {
  return companies.find((company) => company.metadata?.training_pack !== true) ?? companies[0] ?? null
}

async function selectedCompanyId() {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_COMPANY_COOKIE)?.value ?? null
}

function preferSelectedCompany(companies: CurrentCompany[], selectedId: string | null) {
  if (!selectedId) return null
  return companies.find((company) => company.id === selectedId) ?? null
}

export async function getCurrentCompanyForUser(user: User): Promise<CurrentCompany | null> {
  await ensureUserWorkspace(user)

  const service = serviceClient()
  const selectedId = await selectedCompanyId()
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
    const orderedCompanies = companyIds.map((id) => companiesById.get(id)).filter(Boolean) as CurrentCompany[]
    const preferred = preferSelectedCompany(orderedCompanies, selectedId) ?? preferOperationalCompany(orderedCompanies)
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
  const availableCompanies = (companies ?? []) as CurrentCompany[]
  return preferSelectedCompany(availableCompanies, selectedId) ?? preferOperationalCompany(availableCompanies)
}
