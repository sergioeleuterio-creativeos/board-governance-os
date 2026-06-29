import 'server-only'

import { serviceClient } from '@/lib/auth-server'

type UsageKind = 'session' | 'deep_dive'

type UsagePackageRow = {
  id: string
  sessions_included: number
  sessions_used: number
  deep_dives_included: number
  deep_dives_used: number
  expires_at: string | null
}

export function billingEnforcementEnabled() {
  return process.env.BILLING_ENFORCEMENT_ENABLED === 'true'
}

function remainingFor(row: UsagePackageRow, kind: UsageKind) {
  if (kind === 'session') return row.sessions_included - row.sessions_used
  return row.deep_dives_included - row.deep_dives_used
}

function isExpired(row: UsagePackageRow) {
  return row.expires_at ? row.expires_at < new Date().toISOString() : false
}

export async function consumeUsagePackageUnit(organizationId: string, kind: UsageKind) {
  if (!billingEnforcementEnabled()) {
    return { ok: true, enforced: false, packageId: null }
  }

  const service = serviceClient()
  const { data, error } = await service
    .from('usage_packages')
    .select('id, sessions_included, sessions_used, deep_dives_included, deep_dives_used, expires_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const packages = ((data ?? []) as UsagePackageRow[]).filter((row) => !isExpired(row))
  const selected = packages.find((row) => remainingFor(row, kind) > 0)

  if (!selected) {
    return {
      ok: false,
      enforced: true,
      packageId: null,
      error: kind === 'session'
        ? 'Nenhum pacote de sessoes disponivel.'
        : 'Nenhum pacote de deep dives disponivel.',
    }
  }

  const nextSessionsUsed = kind === 'session' ? selected.sessions_used + 1 : selected.sessions_used
  const nextDeepDivesUsed = kind === 'deep_dive' ? selected.deep_dives_used + 1 : selected.deep_dives_used
  const exhausted = nextSessionsUsed >= selected.sessions_included && nextDeepDivesUsed >= selected.deep_dives_included

  const { error: updateError } = await service
    .from('usage_packages')
    .update({
      sessions_used: nextSessionsUsed,
      deep_dives_used: nextDeepDivesUsed,
      status: exhausted ? 'exhausted' : 'active',
    })
    .eq('id', selected.id)

  if (updateError) throw new Error(updateError.message)

  return { ok: true, enforced: true, packageId: selected.id }
}
