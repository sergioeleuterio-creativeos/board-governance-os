import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/auth-server'
import { BillingPlanCode, stripeWebhookSecret, verifyStripeSignature } from '@/lib/stripe-server'

type StripeEvent = {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

const allowedPlans: BillingPlanCode[] = [
  'free_diagnostic',
  'monthly_cycle',
  'fortnightly_cycle',
  'quarterly_cycle',
  'extra_session_pack',
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function planCodeFromMetadata(metadata: Record<string, unknown>): BillingPlanCode {
  const plan = stringValue(metadata.plan_code)
  return plan && allowedPlans.includes(plan as BillingPlanCode) ? plan as BillingPlanCode : 'monthly_cycle'
}

function statusForStripe(value: unknown) {
  const status = stringValue(value) ?? 'incomplete'
  if (status === 'canceled') return 'cancelled'
  if (['trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'incomplete'].includes(status)) return status
  return 'incomplete'
}

function isoFromUnix(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null
}

function firstStripePriceId(object: Record<string, unknown>): string | null {
  const items = asRecord(object.items)
  const data = Array.isArray(items.data) ? items.data : []
  const first = asRecord(data[0])
  const price = asRecord(first.price)
  return stringValue(price.id)
}

async function organizationIdForCustomer(stripeCustomerId: string | null) {
  if (!stripeCustomerId) return null
  const service = serviceClient()
  const { data } = await service
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  return data?.id ?? null
}

async function upsertSubscription(object: Record<string, unknown>, eventType: string) {
  const service = serviceClient()
  const metadata = asRecord(object.metadata)
  const stripeCustomerId = stringValue(object.customer)
  const organizationId = stringValue(metadata.organization_id) ?? await organizationIdForCustomer(stripeCustomerId)
  const stripeSubscriptionId = stringValue(object.id)

  if (!organizationId || !stripeSubscriptionId) {
    return { skipped: true, reason: 'missing_organization_or_subscription' }
  }

  const planCode = planCodeFromMetadata(metadata)
  const { error } = await service
    .from('subscriptions')
    .upsert({
      organization_id: organizationId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan_code: planCode,
      status: statusForStripe(object.status),
      current_period_start: isoFromUnix(object.current_period_start),
      current_period_end: isoFromUnix(object.current_period_end),
      cancel_at_period_end: Boolean(object.cancel_at_period_end),
      metadata: {
        source: 'stripe_webhook',
        last_event_type: eventType,
        stripe_price_id: firstStripePriceId(object),
      },
    }, { onConflict: 'stripe_subscription_id' })

  if (error) throw new Error(error.message)
  return { skipped: false, subscription_id: stripeSubscriptionId }
}

async function createUsagePackageFromCheckout(object: Record<string, unknown>) {
  const service = serviceClient()
  const metadata = asRecord(object.metadata)
  const organizationId = stringValue(metadata.organization_id)
  const planCode = planCodeFromMetadata(metadata)
  const checkoutSessionId = stringValue(object.id)

  if (!organizationId || !checkoutSessionId || planCode !== 'extra_session_pack') {
    return { skipped: true, reason: 'not_extra_session_pack' }
  }

  const { data: existing, error: existingError } = await service
    .from('usage_packages')
    .select('id')
    .eq('organization_id', organizationId)
    .contains('metadata', { checkout_session_id: checkoutSessionId })
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return { skipped: true, reason: 'already_recorded' }

  const sessionsIncluded = Number.parseInt(process.env.BILLING_EXTRA_SESSION_PACK_SESSIONS || '1', 10)
  const deepDivesIncluded = Number.parseInt(process.env.BILLING_EXTRA_SESSION_PACK_DEEP_DIVES || '3', 10)
  const { error } = await service
    .from('usage_packages')
    .insert({
      organization_id: organizationId,
      stripe_price_id: stringValue(metadata.price_id),
      package_code: planCode,
      sessions_included: Number.isFinite(sessionsIncluded) ? sessionsIncluded : 1,
      deep_dives_included: Number.isFinite(deepDivesIncluded) ? deepDivesIncluded : 3,
      status: 'active',
      metadata: {
        source: 'stripe_checkout',
        checkout_session_id: checkoutSessionId,
        stripe_customer_id: stringValue(object.customer),
      },
    })

  if (error) throw new Error(error.message)
  return { skipped: false, package_code: planCode }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const secret = stripeWebhookSecret()

  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 503 })
  }

  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as StripeEvent
  const object = event.data.object
  const service = serviceClient()
  let result: unknown = { skipped: true }

  try {
    if (event.type === 'checkout.session.completed') {
      result = await createUsagePackageFromCheckout(object)
    }

    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      result = await upsertSubscription(object, event.type)
    }

    await service.from('audit_events').insert({
      organization_id: stringValue(asRecord(object.metadata).organization_id),
      company_id: stringValue(asRecord(object.metadata).company_id),
      actor_user_id: null,
      event_type: `stripe.${event.type}`,
      entity_type: 'stripe_event',
      entity_id: null,
      metadata: {
        stripe_event_id: event.id,
        result,
      },
    })

    return NextResponse.json({ received: true, result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stripe webhook handling failed' },
      { status: 500 }
    )
  }
}
