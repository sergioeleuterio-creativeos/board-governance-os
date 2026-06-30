import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import { getCurrentCompanyForUser } from '@/lib/shadow-board/current-company-server'
import { getPublicAppUrl } from '@/lib/shadow-board/site-url'
import { configuredAdminEmailRecipients, sendProductEmail } from '@/lib/email/send'
import { renderReferralRequestEmail } from '@/lib/email/templates'
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit'

const allowedAdvisorKeys = ['board_brain', 'finance', 'operator', 'growth', 'risk', 'customer', 'talent'] as const

export async function GET() {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) return NextResponse.json({ company: null, referral_requests: [] })

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const service = serviceClient()
    const { data, error } = await service
      .from('referral_requests')
      .select('id, follow_up_id, recommended_by_agent_key, context_summary, status, created_at, metadata')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      company,
      referral_requests: data ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load referral requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const body = await request.json().catch(() => null)
  const followUpId = typeof body?.follow_up_id === 'string' ? body.follow_up_id : null
  const requestedCategory = typeof body?.requested_category === 'string' ? body.requested_category.trim() : ''
  const freeformContext = typeof body?.context_summary === 'string' ? body.context_summary.trim() : ''
  const recommendedByAgentKey = allowedAdvisorKeys.includes(body?.recommended_by_agent_key)
    ? body.recommended_by_agent_key as (typeof allowedAdvisorKeys)[number]
    : null

  try {
    const company = await getCurrentCompanyForUser(user)
    if (!company) {
      return NextResponse.json({ error: 'Company is required before requesting a referral' }, { status: 400 })
    }

    const access = await requireCompanyAdmin(company.id)
    if (isAuthError(access)) return access

    const rateLimit = checkRateLimit(rateLimitKey(request, 'referral-request', `${user.id}:${company.id}`), 20, 60 * 60 * 1000)
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds)

    const service = serviceClient()
    const followUpResult = followUpId
      ? await service
        .from('follow_ups')
        .select('id, title, action, description, source_agent_key, company_id, governance_cycle_id')
        .eq('id', followUpId)
        .maybeSingle()
      : { data: null, error: null }

    if (followUpResult.error) {
      return NextResponse.json({ error: followUpResult.error.message }, { status: 500 })
    }

    if (followUpId && !followUpResult.data) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    if (followUpResult.data && followUpResult.data.company_id !== company.id) {
      return NextResponse.json({ error: 'Follow-up does not belong to current company' }, { status: 403 })
    }

    const followUp = followUpResult.data
    const contextSummary = freeformContext
      || [
        requestedCategory ? `Categoria solicitada: ${requestedCategory}` : null,
        followUp?.title ?? followUp?.action ?? null,
        followUp?.description ?? null,
      ].filter(Boolean).join('\n')
      || 'Referral requested from Board Governance OS follow-up context.'

    const { data, error } = await service
      .from('referral_requests')
      .insert({
        organization_id: company.organization_id,
        company_id: company.id,
        governance_cycle_id: followUp?.governance_cycle_id ?? null,
        follow_up_id: followUp?.id ?? null,
        recommended_by_agent_key: recommendedByAgentKey ?? followUp?.source_agent_key ?? null,
        requested_by: user.id,
        context_summary: contextSummary,
        status: 'requested',
        metadata: {
          source: 'follow-up-get-connected',
          requested_category: requestedCategory || null,
        },
      })
      .select('id, status, context_summary, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create referral request' }, { status: 500 })
    }

    let notification: { sent?: boolean; skipped?: boolean; error?: string } = { skipped: true }
    const recipients = configuredAdminEmailRecipients()
    if (recipients.length) {
      try {
        const email = renderReferralRequestEmail({
          companyName: company.name,
          requestedBy: user.email ?? user.id,
          recommendationContext: contextSummary,
          appUrl: getPublicAppUrl(),
        })
        await sendProductEmail({ to: recipients, ...email })
        notification = { sent: true }
      } catch (emailError) {
        notification = { error: emailError instanceof Error ? emailError.message : 'notification_failed' }
      }
    }

    return NextResponse.json({ referral_request: data, notification })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create referral request' },
      { status: 500 }
    )
  }
}
