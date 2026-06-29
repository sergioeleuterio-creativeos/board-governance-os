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

  const companyId = ((companyMemberships ?? []) as CompanyMembershipRow[])[0]?.company_id
  if (companyId) {
    const { data: company, error } = await service
      .from('companies')
      .select('id, organization_id, name, slug, status, stage')
      .eq('id', companyId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (company) return company as CurrentCompany
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

  const { data: company, error } = await service
    .from('companies')
    .select('id, organization_id, name, slug, status, stage')
    .eq('organization_id', organizationMembership.organization_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return company as CurrentCompany | null
}
