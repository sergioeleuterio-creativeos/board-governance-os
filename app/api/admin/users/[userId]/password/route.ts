import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { isAuthError, requireSuperAdmin, serviceClient } from '@/lib/auth-server'

type RouteContext = {
  params: Promise<{ userId: string }>
}

function makeTemporaryPassword() {
  return `Bgo-${randomBytes(12).toString('base64url')}-${new Date().getFullYear()}!`
}

export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await requireSuperAdmin()
  if (isAuthError(admin)) return admin

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const service = serviceClient()
  const temporaryPassword = makeTemporaryPassword()
  const { data, error } = await service.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Could not set temporary password' }, { status: 500 })
  }

  return NextResponse.json({
    user_id: data.user.id,
    email: data.user.email,
    temporary_password: temporaryPassword,
    expires_note: 'Share this once. The user should change it from the reset-password screen after signing in.',
  })
}
