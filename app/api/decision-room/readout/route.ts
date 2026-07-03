import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { getDecisionRoomReadout } from '@/lib/decision-room/contracts'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    return NextResponse.json(await getDecisionRoomReadout())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load decision-room readout' },
      { status: 500 },
    )
  }
}
