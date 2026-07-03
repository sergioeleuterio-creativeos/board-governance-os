import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const company = await getCurrentCompanyForUser(user)
    return NextResponse.json(await getDecisionRoomReadout({ company }))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load decision-room readout' },
      { status: 500 },
    )
  }
}
