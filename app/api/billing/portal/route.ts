import { NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireOrganizationAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { appUrl, stripeRequest } from '@/lib/stripe-server'

type StripePortalSession = {
  id: string
  url: string
}

export async function POST() {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ error: 'Nenhuma empresa ativa encontrada.' }, { status: 404 })

    const access = await requireOrganizationAdmin(company.organization_id)
    if (isAuthError(access)) return access

    const service = serviceClient()
    const { data: organization, error } = await service
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('id', company.organization_id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!organization?.stripe_customer_id) {
      return NextResponse.json({ error: 'Stripe customer not found for this organization' }, { status: 404 })
    }

    const params = new URLSearchParams()
    params.set('customer', organization.stripe_customer_id)
    params.set('return_url', `${appUrl()}/dashboard`)

    const session = await stripeRequest<StripePortalSession>('billing_portal/sessions', params)

    await service.from('audit_events').insert({
      organization_id: organization.id,
      company_id: company.id,
      actor_user_id: user.id,
      event_type: 'billing.portal_created',
      entity_type: 'organization',
      entity_id: organization.id,
      metadata: {
        portal_session_id: session.id,
      },
    })

    return NextResponse.json({ portal_session_id: session.id, url: session.url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel abrir o portal de billing.' },
      { status: 500 }
    )
  }
}
