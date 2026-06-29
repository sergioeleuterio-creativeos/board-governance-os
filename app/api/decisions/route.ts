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
      return NextResponse.json({ company: null, decisions: [] })
    }

    const service = serviceClient()
    const { data, error } = await service
      .from('decisions')
      .select('id, title, decision, status, closure_recommendation, rationale, risks, expected_outcome, tradeoffs, risk_level, confidence_score, conditions, owner_label, owner, review_date, metadata, created_at, updated_at')
      .eq('company_id', company.id)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      company,
      decisions: data ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load decisions' },
      { status: 500 }
    )
  }
}
