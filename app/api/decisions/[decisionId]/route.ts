import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAuth, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'

const allowedStatuses = ['candidate', 'approved', 'rejected', 'deferred', 'superseded', 'review_due', 'closed', 'open', 'reviewing', 'reversed'] as const
const allowedClosures = ['commit', 'commit_with_conditions', 'defer', 'reject', 'request_more_data', 'escalate_human_review'] as const
const actionToUpdate = {
  approve: { status: 'approved', closure_recommendation: 'commit' },
  approve_with_conditions: { status: 'approved', closure_recommendation: 'commit_with_conditions' },
  defer: { status: 'deferred', closure_recommendation: 'defer' },
  reject: { status: 'rejected', closure_recommendation: 'reject' },
  request_more_data: { status: 'reviewing', closure_recommendation: 'request_more_data' },
} as const

type DecisionImpactRow = {
  id: string
  title: string
  decision: string | null
  status: string
  rationale: string | null
  risks: string | null
  expected_outcome: string | null
  risk_level: string | null
  closure_recommendation: string | null
}

type RouteContext = {
  params: Promise<{ decisionId: string }>
}

const stopWords = new Set([
  'para',
  'pela',
  'pelo',
  'como',
  'com',
  'sem',
  'uma',
  'das',
  'dos',
  'que',
  'por',
  'mais',
  'menos',
  'sobre',
  'decisao',
  'decidir',
  'registrar',
  'aprovar',
  'acao',
  'plano',
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function keywordsFor(decision: DecisionImpactRow) {
  const text = [
    decision.title,
    decision.decision,
    decision.rationale,
    decision.risks,
    decision.expected_outcome,
    decision.risk_level,
    decision.closure_recommendation,
  ].filter(Boolean).join(' ')

  return new Set(
    normalizeText(text)
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !stopWords.has(token))
  )
}

function intersection(a: Set<string>, b: Set<string>) {
  return [...a].filter((item) => b.has(item))
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await requireAuth()
  if (isAuthError(user)) return user

  const { decisionId } = await params
  const body = await request.json().catch(() => null)
  const service = serviceClient()
  const { data: existing, error: existingError } = await service
    .from('decisions')
    .select('id, organization_id, company_id, title, decision, status, closure_recommendation, rationale, risks, expected_outcome, risk_level, metadata')
    .eq('id', decisionId)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
  }

  const access = await requireCompanyAdmin(existing.company_id)
  if (isAuthError(access)) return access

  const updates: Record<string, unknown> = {}
  const action = typeof body?.action === 'string' && body.action in actionToUpdate
    ? body.action as keyof typeof actionToUpdate
    : null
  const founderNote = typeof body?.founder_note === 'string' ? body.founder_note.trim() : ''

  if (action) {
    Object.assign(updates, actionToUpdate[action])
  }

  if (typeof body?.status === 'string') {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    updates.status = body.status
  }

  if (typeof body?.closure_recommendation === 'string') {
    if (body.closure_recommendation && !allowedClosures.includes(body.closure_recommendation)) {
      return NextResponse.json({ error: 'Invalid closure recommendation' }, { status: 400 })
    }

    updates.closure_recommendation = body.closure_recommendation || null
  }

  if (typeof body?.owner_label === 'string') updates.owner_label = body.owner_label.trim() || null
  if (typeof body?.review_date === 'string') updates.review_date = body.review_date.trim() || null

  if (action || founderNote) {
    const metadata = asRecord(existing.metadata)
    let futureImpactCheck: Record<string, unknown> | null = null

    if (action) {
      const { data: peerDecisions, error: peerDecisionsError } = await service
        .from('decisions')
        .select('id, title, decision, status, closure_recommendation, rationale, risks, expected_outcome, risk_level')
        .eq('company_id', existing.company_id)
        .neq('id', decisionId)
        .order('updated_at', { ascending: false })
        .limit(40)

      if (peerDecisionsError) {
        return NextResponse.json({ error: peerDecisionsError.message }, { status: 500 })
      }

      const currentKeywords = keywordsFor(existing as DecisionImpactRow)
      const relatedDecisions = ((peerDecisions ?? []) as DecisionImpactRow[])
        .map((decision) => {
          const overlapTerms = intersection(currentKeywords, keywordsFor(decision))
          return {
            id: decision.id,
            title: decision.title,
            status: decision.status,
            risk_level: decision.risk_level,
            closure_recommendation: decision.closure_recommendation,
            overlap_terms: overlapTerms,
            overlap_score: overlapTerms.length,
            relationship: ['approved', 'closed', 'open'].includes(decision.status) ? 'future_impact' : 'contextual_dependency',
          }
        })
        .filter((decision) => decision.overlap_score >= 2)
        .sort((a, b) => b.overlap_score - a.overlap_score)
        .slice(0, 5)

      if (relatedDecisions.length) {
        const { error: dependencyError } = await service
          .from('decision_dependencies')
          .upsert(
            relatedDecisions.map((decision) => ({
              organization_id: existing.organization_id,
              company_id: existing.company_id,
              decision_id: decisionId,
              depends_on_decision_id: decision.id,
              relationship: decision.relationship,
            })),
            { onConflict: 'decision_id,depends_on_decision_id' }
          )

        if (dependencyError) {
          return NextResponse.json({ error: dependencyError.message }, { status: 500 })
        }
      }

      futureImpactCheck = {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        trigger_action: action,
        related_decisions: relatedDecisions,
        dependency_count: relatedDecisions.length,
        risk_note: relatedDecisions.length
          ? 'Esta decisao pode alterar compromissos anteriores. Revisar tradeoffs, owners, prazos e KPIs antes de executar.'
          : 'Nenhuma dependencia direta encontrada no livro de decisoes atual.',
        review_note: action === 'approve' || action === 'approve_with_conditions'
          ? 'A proxima revisao deve confirmar se a decisao reforcou ou contradisse decisoes anteriores.'
          : 'Manter a decisao em memoria para evitar retomada sem novo contexto.',
      }
    }

    updates.metadata = {
      ...metadata,
      last_founder_action: action,
      last_founder_note: founderNote || null,
      last_founder_action_at: new Date().toISOString(),
      last_founder_action_by: user.id,
      ...(futureImpactCheck ? { future_impact_check: futureImpactCheck } : {}),
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
  }

  const { data, error } = await service
    .from('decisions')
    .update(updates)
    .eq('id', decisionId)
    .select('id, title, status, closure_recommendation, owner_label, review_date, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await service.from('audit_events').insert({
    organization_id: existing.organization_id,
    company_id: existing.company_id,
    actor_user_id: user.id,
    event_type: action ? `decision.${action}` : 'decision.updated',
    entity_type: 'decision',
    entity_id: decisionId,
    metadata: {
      updates,
      founder_note: founderNote || null,
    },
  })

  return NextResponse.json({ decision: data })
}
