import { NextResponse } from 'next/server'
import { getSessionUser, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({ company: null, follow_ups: [] })
    }

    const service = serviceClient()
    const { data, error } = await service
      .from('follow_ups')
      .select('id, title, action, description, status, priority, due_date, completed_at, owner_label, owner, source_agent_key, decision_id, created_at, updated_at')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(150)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      company,
      follow_ups: data ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load follow-ups' },
      { status: 500 }
    )
  }
}
