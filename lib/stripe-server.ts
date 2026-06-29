import 'server-only'

import crypto from 'node:crypto'

export type BillingPlanCode =
  | 'free_diagnostic'
  | 'monthly_cycle'
  | 'fortnightly_cycle'
  | 'quarterly_cycle'
  | 'extra_session_pack'

const priceEnvByPlan: Record<BillingPlanCode, string> = {
  free_diagnostic: 'STRIPE_PRICE_FREE_DIAGNOSTIC',
  monthly_cycle: 'STRIPE_PRICE_MONTHLY_CYCLE',
  fortnightly_cycle: 'STRIPE_PRICE_FORTNIGHTLY_CYCLE',
  quarterly_cycle: 'STRIPE_PRICE_QUARTERLY_CYCLE',
  extra_session_pack: 'STRIPE_PRICE_EXTRA_SESSION_PACK',
}

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || ''
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || ''
}

export function stripePriceForPlan(planCode: BillingPlanCode) {
  return process.env[priceEnvByPlan[planCode]] || ''
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey())
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.board-os.ai'
}

export function planMode(planCode: BillingPlanCode): 'subscription' | 'payment' {
  return planCode === 'extra_session_pack' || planCode === 'free_diagnostic' ? 'payment' : 'subscription'
}

export async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const key = stripeSecretKey()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message = payload?.error?.message || text || 'stripe_request_failed'
    throw new Error(message)
  }

  return payload as T
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false
  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => {
    const [key, value] = part.split('=')
    return [key, value]
  }))
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const actual = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (actual.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(actual, expectedBuffer)
}
