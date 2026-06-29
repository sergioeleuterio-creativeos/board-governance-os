import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type SessionRow = {
  id: string
  organization_id: string
  company_id: string
  governance_cycle_id: string
  board_pack_id: string | null
  started_by: string | null
  session_type: string
  status: string
  opened_at: string | null
  expires_at: string | null
  closed_at: string | null
  closure_recommendation: string | null
  closure_summary: string | null
  usage_units_consumed: number
  created_at: string
  updated_at: string
}

type NamedRow = {
  id: string
  name: string
  title?: string | null
}

function mapById<T extends { id: string }>(rows: T[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

export async function GET() {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const service = serviceClient()
  const { data: sessions, error: sessionsError } = await service
    .from('board_sessions')
    .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, started_by, session_type, status, opened_at, expires_at, closed_at, closure_recommendation, closure_summary, usage_units_consumed, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(60)

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const sessionRows = (sessions ?? []) as SessionRow[]
  const companyIds = [...new Set(sessionRows.map((session) => session.company_id))]
  const organizationIds = [...new Set(sessionRows.map((session) => session.organization_id))]
  const cycleIds = [...new Set(sessionRows.map((session) => session.governance_cycle_id))]

  const [companiesResult, organizationsResult, cyclesResult] = await Promise.all([
    companyIds.length
      ? service.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    organizationIds.length
      ? service.from('organizations').select('id, name').in('id', organizationIds)
      : Promise.resolve({ data: [], error: null }),
    cycleIds.length
      ? service.from('governance_cycles').select('id, title').in('id', cycleIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (companiesResult.error) {
    return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  }

  if (organizationsResult.error) {
    return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  }

  if (cyclesResult.error) {
    return NextResponse.json({ error: cyclesResult.error.message }, { status: 500 })
  }

  const companiesById = mapById((companiesResult.data ?? []) as NamedRow[])
  const organizationsById = mapById((organizationsResult.data ?? []) as NamedRow[])
  const cyclesById = mapById((cyclesResult.data ?? []) as NamedRow[])

  return NextResponse.json({
    sessions: sessionRows.map((session) => ({
      ...session,
      company_name: companiesById.get(session.company_id)?.name ?? 'Empresa sem nome',
      organization_name: organizationsById.get(session.organization_id)?.name ?? 'Organizacao sem nome',
      governance_cycle_title: cyclesById.get(session.governance_cycle_id)?.title ?? null,
    })),
  })
}
