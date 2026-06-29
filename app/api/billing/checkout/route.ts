import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireOrganizationAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { appUrl, BillingPlanCode, planMode, stripePriceForPlan, stripeRequest } from '@/lib/stripe-server'

const allowedPlans: BillingPlanCode[] = [
  'free_diagnostic',
  'monthly_cycle',
  'fortnightly_cycle',
  'quarterly_cycle',
  'extra_session_pack',
]

type StripeCustomer = {
  id: string
}

type StripeCheckoutSession = {
  id: string
  url: string | null
}

function planFromBody(value: unknown): BillingPlanCode {
  return typeof value === 'string' && allowedPlans.includes(value as BillingPlanCode)
    ? value as BillingPlanCode
    : 'monthly_cycle'
}

async function ensureStripeCustomer({
  organizationId,
  organizationName,
  email,
}: {
  organizationId: string
  organizationName: string
  email: string | null | undefined
}) {
  const service = serviceClient()
  const { data: organization, error } = await service
    .from('organizations')
    .select('id, stripe_customer_id')
    .eq('id', organizationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (organization?.stripe_customer_id) return organization.stripe_customer_id as string

  const customerParams = new URLSearchParams()
  customerParams.set('name', organizationName)
  if (email) customerParams.set('email', email)
  customerParams.set('metadata[organization_id]', organizationId)

  const customer = await stripeRequest<StripeCustomer>('customers', customerParams)
  const { error: updateError } = await service
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', organizationId)

  if (updateError) throw new Error(updateError.message)
  return customer.id
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)
  const planCode = planFromBody(body?.plan_code)
  const priceId = stripePriceForPlan(planCode)

  if (!priceId) {
    return NextResponse.json({ error: `Stripe price not configured for ${planCode}` }, { status: 503 })
  }

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ error: 'Nenhuma empresa ativa encontrada.' }, { status: 404 })

    const access = await requireOrganizationAdmin(company.organization_id)
    if (isAuthError(access)) return access

    const service = serviceClient()
    const { data: organization, error: organizationError } = await service
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', company.organization_id)
      .maybeSingle()

    if (organizationError) throw new Error(organizationError.message)
    if (!organization) return NextResponse.json({ error: 'Organizacao nao encontrada.' }, { status: 404 })

    const customerId = organization.stripe_customer_id
      || await ensureStripeCustomer({
        organizationId: organization.id,
        organizationName: organization.name,
        email: user.email,
      })

    const mode = planMode(planCode)
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('customer', customerId)
    params.set('client_reference_id', organization.id)
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
    params.set('success_url', `${appUrl()}/dashboard?billing=success`)
    params.set('cancel_url', `${appUrl()}/dashboard?billing=cancelled`)
    params.set('metadata[organization_id]', organization.id)
    params.set('metadata[company_id]', company.id)
    params.set('metadata[plan_code]', planCode)

    if (mode === 'subscription') {
      params.set('subscription_data[metadata][organization_id]', organization.id)
      params.set('subscription_data[metadata][company_id]', company.id)
      params.set('subscription_data[metadata][plan_code]', planCode)
    }

    const session = await stripeRequest<StripeCheckoutSession>('checkout/sessions', params)

    await service.from('audit_events').insert({
      organization_id: organization.id,
      company_id: company.id,
      actor_user_id: user.id,
      event_type: 'billing.checkout_created',
      entity_type: 'organization',
      entity_id: organization.id,
      metadata: {
        plan_code: planCode,
        price_id: priceId,
        checkout_session_id: session.id,
      },
    })

    return NextResponse.json({ checkout_session_id: session.id, url: session.url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel criar o checkout.' },
      { status: 500 }
    )
  }
}
