import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import {
  buildStrategicSourceDocument,
  type StrategicSourceContribution,
  type StrategicSourceInput,
} from '@/lib/board/strategic-source'
import { creativeOSHandoffReadiness } from '@/lib/creative-os/handoff-client'

type SessionRow = {
  id: string
  organization_id: string
  company_id: string
  governance_cycle_id: string
  board_pack_id: string
  status: string
  current_phase: string
  active_question: string | null
  source_snapshot_id: string | null
  source_snapshot_hash: string | null
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

async function sessionForRequest(request: NextRequest): Promise<SessionRow | null> {
  const service = serviceClient()
  const requested = request.nextUrl.searchParams.get('board_session_id')
  if (requested) {
    const { data, error } = await service
      .from('board_sessions')
      .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, status, current_phase, active_question, source_snapshot_id, source_snapshot_hash')
      .eq('id', requested)
      .eq('metadata->>async_board', 'true')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as SessionRow | null
  }
  return null
}

async function loadDocument(session: SessionRow) {
  const service = serviceClient()
  const { data: document, error } = await service
    .from('strategic_source_documents')
    .select('id, created_at, version, title, status, source_snapshot_id, source_snapshot_hash, board_pack_hash, content, markdown, source_references, immutable_hash, handed_off_at')
    .eq('board_session_id', session.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const { data: handoff, error: handoffError } = document
    ? await service
      .from('creative_os_handoffs')
      .select('id, created_at, status, contract_version, request_id, creative_os_company_id, creative_os_artifact_id, creative_os_url, attempt_count, accepted_at, last_error, provenance, warnings')
      .eq('strategic_source_document_id', document.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null }
  if (handoffError) throw new Error(handoffError.message)
  return { document, handoff }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const session = await sessionForRequest(request)
    if (!session) return NextResponse.json({ error: 'Board meeting not found' }, { status: 404 })
    const access = await requireCompanyAdmin(session.company_id)
    if (isAuthError(access)) return access
    const result = await loadDocument(session)

    if (request.nextUrl.searchParams.get('download') === 'markdown') {
      if (!result.document) return NextResponse.json({ error: 'Strategic Source Document not found' }, { status: 404 })
      return new NextResponse(result.document.markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="board-os-strategic-source-v${result.document.version}.md"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    return NextResponse.json({
      persisted: Boolean(result.document),
      document: result.document,
      handoff: result.handoff,
      connector: creativeOSHandoffReadiness(),
      can_generate: session.current_phase === 'closed' || session.status === 'closed',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load the Strategic Source Document' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const sessionId = typeof body?.board_session_id === 'string' ? body.board_session_id : ''
  if (!sessionId) return NextResponse.json({ error: 'board_session_id is required' }, { status: 400 })

  try {
    const service = serviceClient()
    const { data: session, error: sessionError } = await service
      .from('board_sessions')
      .select('id, organization_id, company_id, governance_cycle_id, board_pack_id, status, current_phase, active_question, source_snapshot_id, source_snapshot_hash')
      .eq('id', sessionId)
      .eq('metadata->>async_board', 'true')
      .maybeSingle()
    if (sessionError || !session?.board_pack_id) {
      return NextResponse.json({ error: sessionError?.message || 'Board meeting not found' }, { status: 404 })
    }
    const access = await requireCompanyAdmin(session.company_id)
    if (isAuthError(access)) return access
    if (session.current_phase !== 'closed' && session.status !== 'closed') {
      return NextResponse.json(
        { error: 'Close the minutes before creating the Strategic Source Document' },
        { status: 409 },
      )
    }

    const existing = await loadDocument(session as SessionRow)
    if (existing.document) {
      return NextResponse.json({
        persisted: true,
        strategic_source_document_id: existing.document.id,
        document: existing.document,
        handoff: existing.handoff,
        reused: true,
      })
    }

    const { data: pack, error: packError } = await service
      .from('board_packs')
      .select('id, business_plan_id, version, executive_summary, strategic_questions, risk_map, decision_candidates, content_hash')
      .eq('id', session.board_pack_id)
      .single()
    if (packError || !pack?.content_hash) throw new Error(packError?.message || 'Locked board pack not found')

    const [
      companyResult,
      planResult,
      contributionsResult,
      minutesResult,
      decisionsResult,
    ] = await Promise.all([
      service.from('companies').select('id, name').eq('id', session.company_id).single(),
      pack.business_plan_id
        ? service
          .from('business_plans')
          .select('id, title, plan_type, period, business_front, version, diagnosis, priorities, kpis, workstreams, risks, assumptions, normalized_content')
          .eq('id', pack.business_plan_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      service
        .from('board_contributions')
        .select('id, phase, contribution_type, body, source_references, author_snapshot')
        .eq('board_session_id', session.id)
        .eq('visibility', 'released')
        .order('submitted_at', { ascending: true }),
      service
        .from('meeting_minutes')
        .select('id, minutes, final_recommendation, conflicts_identified')
        .eq('board_session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('decisions')
        .select('id, title, decision, rationale, conditions, owner, owner_label, review_date')
        .eq('board_session_id', session.id)
        .order('created_at', { ascending: true }),
    ])
    if (companyResult.error) throw new Error(companyResult.error.message)
    if (planResult.error) throw new Error(planResult.error.message)
    if (contributionsResult.error) throw new Error(contributionsResult.error.message)
    if (minutesResult.error) throw new Error(minutesResult.error.message)
    if (decisionsResult.error) throw new Error(decisionsResult.error.message)

    const decisions = decisionsResult.data ?? []
    const decisionIds = decisions.map(item => item.id)
    const { data: followUps, error: followUpsError } = decisionIds.length
      ? await service
        .from('follow_ups')
        .select('id, title, action, description, owner, owner_label, due_date, status')
        .in('decision_id', decisionIds)
        .order('created_at', { ascending: true })
      : { data: [], error: null }
    if (followUpsError) throw new Error(followUpsError.message)

    const contributions: StrategicSourceContribution[] = (contributionsResult.data ?? []).map(item => {
      const author = (item.author_snapshot ?? {}) as Record<string, unknown>
      return {
        id: item.id,
        phase: item.phase,
        contributionType: item.contribution_type,
        body: item.body,
        participantType: author.participant_type === 'human' ? 'human' : 'synthetic',
        displayName: typeof author.display_name === 'string' ? author.display_name : 'Board member',
        roleLabel: typeof author.role_label === 'string' ? author.role_label : 'Board member',
        sourceReferences: stringArray(item.source_references),
      }
    })

    const plan = planResult.data
    const input: StrategicSourceInput = {
      company: companyResult.data,
      plan: plan ? {
        id: plan.id,
        title: plan.title,
        planType: plan.plan_type,
        period: plan.period,
        businessFront: plan.business_front,
        version: plan.version,
        diagnosis: plan.diagnosis,
        priorities: plan.priorities ?? [],
        kpis: plan.kpis ?? [],
        workstreams: plan.workstreams ?? [],
        risks: plan.risks ?? [],
        assumptions: plan.assumptions ?? [],
        normalizedContent: plan.normalized_content ?? {},
      } : null,
      boardPack: {
        id: pack.id,
        version: pack.version,
        contentHash: pack.content_hash,
        executiveSummary: pack.executive_summary,
        strategicQuestions: pack.strategic_questions ?? [],
        risks: pack.risk_map ?? [],
        decisionCandidates: pack.decision_candidates ?? [],
      },
      boardSession: {
        id: session.id,
        activeQuestion: session.active_question || 'Decisão não nomeada',
        sourceSnapshotId: session.source_snapshot_id,
        sourceSnapshotHash: session.source_snapshot_hash,
      },
      contributions,
      minutes: minutesResult.data ? {
        id: minutesResult.data.id,
        minutes: minutesResult.data.minutes,
        finalRecommendation: minutesResult.data.final_recommendation,
        conflicts: minutesResult.data.conflicts_identified ?? [],
      } : null,
      decisions: decisions.map(item => ({
        id: item.id,
        title: item.title,
        decision: item.decision,
        rationale: item.rationale,
        conditions: item.conditions ?? [],
        owner: item.owner || item.owner_label,
        reviewDate: item.review_date,
      })),
      commitments: (followUps ?? []).map(item => ({
        id: item.id,
        title: item.title,
        action: item.action || item.description,
        owner: item.owner || item.owner_label,
        dueDate: item.due_date,
        status: item.status,
      })),
      createdAt: new Date().toISOString(),
    }
    const generated = buildStrategicSourceDocument(input)
    const { data: document, error: documentError } = await service
      .from('strategic_source_documents')
      .insert({
        organization_id: session.organization_id,
        company_id: session.company_id,
        governance_cycle_id: session.governance_cycle_id,
        business_plan_id: pack.business_plan_id,
        board_pack_id: pack.id,
        board_session_id: session.id,
        meeting_minutes_id: minutesResult.data?.id ?? null,
        version: 1,
        title: generated.title,
        status: 'ready',
        source_snapshot_id: session.source_snapshot_id,
        source_snapshot_hash: session.source_snapshot_hash,
        board_pack_hash: pack.content_hash,
        content: generated.content,
        markdown: generated.markdown,
        source_references: generated.sourceReferences,
        immutable_hash: generated.immutableHash,
        created_by: user.id,
        metadata: {
          schema_version: generated.content.schemaVersion,
          contribution_count: contributions.length,
          decision_count: decisions.length,
          commitment_count: (followUps ?? []).length,
        },
      })
      .select('id, created_at, version, title, status, source_snapshot_id, source_snapshot_hash, board_pack_hash, content, markdown, source_references, immutable_hash, handed_off_at')
      .single()
    if (documentError || !document) throw new Error(documentError?.message || 'Could not persist the Strategic Source Document')

    return NextResponse.json({
      persisted: true,
      strategic_source_document_id: document.id,
      document,
      handoff: null,
      reused: false,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create the Strategic Source Document' },
      { status: 500 },
    )
  }
}
