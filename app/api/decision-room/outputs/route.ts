import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { createExecutionOutputs } from '@/lib/decision-room/contracts'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const company = await getCurrentCompanyForUser(user)
    const outputList = await createExecutionOutputs({ queue: stringArray(body.queue), company })
    return NextResponse.json({ outputs: outputList })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create outputs' },
      { status: 500 },
    )
  }
}
