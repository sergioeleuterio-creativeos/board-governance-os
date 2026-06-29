import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type AuditRow = {
  id: string
  created_at: string
  organization_id: string | null
  company_id: string | null
  actor_user_id: string | null
  event_type: string
  entity_type: string | null
  entity_id: string | null
  metadata: unknown
}

type NamedRow = {
  id: string
  name?: string
  email?: string | null
  full_name?: string | null
}

function mapById<T extends { id: string }>(rows: T[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

export async function GET(request: NextRequest) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('event_type')?.trim()
  const entityType = searchParams.get('entity_type')?.trim()

  const service = serviceClient()
  let query = service
    .from('audit_events')
    .select('id, created_at, organization_id, company_id, actor_user_id, event_type, entity_type, entity_id, metadata')
    .order('created_at', { ascending: false })
    .limit(150)

  if (eventType) query = query.ilike('event_type', `%${eventType}%`)
  if (entityType) query = query.eq('entity_type', entityType)

  const { data: events, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const eventRows = (events ?? []) as AuditRow[]
  const organizationIds = [...new Set(eventRows.map((event) => event.organization_id).filter(Boolean))] as string[]
  const companyIds = [...new Set(eventRows.map((event) => event.company_id).filter(Boolean))] as string[]
  const actorIds = [...new Set(eventRows.map((event) => event.actor_user_id).filter(Boolean))] as string[]

  const [organizationsResult, companiesResult, usersResult] = await Promise.all([
    organizationIds.length
      ? service.from('organizations').select('id, name').in('id', organizationIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? service.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    actorIds.length
      ? service.from('user_profiles').select('id, email, full_name').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (organizationsResult.error) return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  if (companiesResult.error) return NextResponse.json({ error: companiesResult.error.message }, { status: 500 })
  if (usersResult.error) return NextResponse.json({ error: usersResult.error.message }, { status: 500 })

  const organizationsById = mapById((organizationsResult.data ?? []) as NamedRow[])
  const companiesById = mapById((companiesResult.data ?? []) as NamedRow[])
  const usersById = mapById((usersResult.data ?? []) as NamedRow[])

  return NextResponse.json({
    events: eventRows.map((event) => ({
      ...event,
      organization_name: event.organization_id ? organizationsById.get(event.organization_id)?.name ?? null : null,
      company_name: event.company_id ? companiesById.get(event.company_id)?.name ?? null : null,
      actor_label: event.actor_user_id
        ? usersById.get(event.actor_user_id)?.full_name || usersById.get(event.actor_user_id)?.email || 'Usuario'
        : 'Sistema',
    })),
  })
}
