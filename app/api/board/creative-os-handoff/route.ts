import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAuthError, requireCompanyAdmin, serviceClient } from '@/lib/auth-server'
import {
  CREATIVE_OS_CONTRACT_VERSION,
  CREATIVE_OS_HANDOFF_SCHEMA_VERSION,
  validateCreativeOSEnvelope,
  type CreativeOSEnvelope,
} from '@/lib/creative-os/contract'
import {
  creativeOSHandoffReadiness,
  sendStrategicSourceHandoff,
} from '@/lib/creative-os/handoff-client'

export const maxDuration = 35

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const documentId = typeof body?.strategic_source_document_id === 'string'
    ? body.strategic_source_document_id
    : ''
  const confirmed = body?.confirm_handoff === true
  if (!documentId || !confirmed) {
    return NextResponse.json(
      { error: 'An explicit Strategic Source Document and founder confirmation are required' },
      { status: 400 },
    )
  }

  try {
    const service = serviceClient()
    const { data: document, error: documentError } = await service
      .from('strategic_source_documents')
      .select('id, organization_id, company_id, board_session_id, version, title, status, source_snapshot_id, source_snapshot_hash, board_pack_hash, content, markdown, source_references, immutable_hash')
      .eq('id', documentId)
      .maybeSingle()
    if (documentError || !document) {
      return NextResponse.json({ error: documentError?.message || 'Strategic Source Document not found' }, { status: 404 })
    }
    const access = await requireCompanyAdmin(document.company_id)
    if (isAuthError(access)) return access

    const { data: company, error: companyError } = await service
      .from('companies')
      .select('id, name, metadata')
      .eq('id', document.company_id)
      .single()
    if (companyError) throw new Error(companyError.message)

    const integration = (
      company.metadata
      && typeof company.metadata === 'object'
      && !Array.isArray(company.metadata)
      && typeof (company.metadata as Record<string, unknown>).creative_os === 'object'
    )
      ? (company.metadata as Record<string, Record<string, unknown>>).creative_os
      : {}
    const creativeOsCompanyId = typeof integration.creativeOsCompanyId === 'string'
      ? integration.creativeOsCompanyId
      : typeof integration.creative_os_company_id === 'string'
        ? integration.creative_os_company_id
        : undefined
    const idempotencyKey = `board-os:ssd:${document.id}:v${document.version}:${document.immutable_hash}`

    const { data: existing, error: existingError } = await service
      .from('creative_os_handoffs')
      .select('id, status, request_id, attempt_count, creative_os_company_id, creative_os_artifact_id, creative_os_url, accepted_at, provenance, warnings')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing?.status === 'accepted' && existing.creative_os_artifact_id) {
      return NextResponse.json({
        persisted: true,
        handed_off: true,
        reused: true,
        handoff: existing,
      })
    }

    const requestId = existing?.request_id ?? randomUUID()
    const envelope: CreativeOSEnvelope = {
      contractVersion: CREATIVE_OS_CONTRACT_VERSION,
      requestId,
      idempotencyKey,
      operation: 'import_handoff',
      sourceSystem: 'board_os',
      companyRef: {
        boardOsCompanyId: document.company_id,
        ...(creativeOsCompanyId ? { creativeOsCompanyId } : {}),
      },
      sourceSnapshot: {
        id: document.source_snapshot_id || `strategic-source:${document.id}`,
        version: document.version,
        hash: document.immutable_hash,
      },
      payload: {
        strategicSourceDocument: {
          id: document.id,
          schemaVersion: CREATIVE_OS_HANDOFF_SCHEMA_VERSION,
          title: document.title,
          version: document.version,
          immutableHash: document.immutable_hash,
          boardPackHash: document.board_pack_hash,
          sourceSnapshotHash: document.source_snapshot_hash,
          content: document.content,
          markdown: document.markdown,
          sourceReferences: document.source_references,
        },
      },
    }
    const validation = validateCreativeOSEnvelope(envelope)
    if (!validation.ok) {
      return NextResponse.json({ error: `Handoff contract invalid: ${validation.error}` }, { status: 500 })
    }

    const readiness = creativeOSHandoffReadiness()
    const now = new Date().toISOString()
    const baseRecord = {
      organization_id: document.organization_id,
      company_id: document.company_id,
      strategic_source_document_id: document.id,
      requested_by: user.id,
      request_id: requestId,
      idempotency_key: idempotencyKey,
      contract_version: CREATIVE_OS_CONTRACT_VERSION,
      operation: 'import_handoff',
      input_hash: document.immutable_hash,
      creative_os_company_id: creativeOsCompanyId ?? null,
      provenance: {
        provider: 'board_os',
        source_document_id: document.id,
        source_snapshot_id: document.source_snapshot_id,
        source_snapshot_hash: document.source_snapshot_hash,
        board_pack_hash: document.board_pack_hash,
      },
    }

    let handoffId = existing?.id
    if (!handoffId) {
      const { data: created, error: createError } = await service
        .from('creative_os_handoffs')
        .insert({
          ...baseRecord,
          status: readiness.enabled ? 'sending' : 'prepared',
          attempt_count: readiness.enabled ? 1 : 0,
          last_attempt_at: readiness.enabled ? now : null,
          warnings: readiness.enabled ? [] : ['Creative OS handoff is not enabled. The immutable document remains ready in Board OS.'],
        })
        .select('id')
        .single()
      if (createError || !created) throw new Error(createError?.message || 'Could not persist the handoff request')
      handoffId = created.id
    } else if (readiness.enabled) {
      const { error: updateError } = await service
        .from('creative_os_handoffs')
        .update({
          status: 'sending',
          requested_by: user.id,
          attempt_count: (existing?.attempt_count ?? 0) + 1,
          last_attempt_at: now,
          last_error: null,
        })
        .eq('id', handoffId)
      if (updateError) throw new Error(updateError.message)
    }

    if (!readiness.enabled) {
      return NextResponse.json({
        persisted: true,
        handed_off: false,
        handoff_id: handoffId,
        connector: readiness,
        error: 'The source document is ready. Creative OS receiving access is still disabled, so nothing was sent.',
      }, { status: 503 })
    }

    const result = await sendStrategicSourceHandoff(envelope)
    if (!result.ok) {
      const status = result.status === 'degraded' ? 'degraded' : 'failed'
      await service
        .from('creative_os_handoffs')
        .update({
          status,
          last_error: result.error.slice(0, 1000),
          response_payload: result.response ?? {},
          provenance: {
            ...baseRecord.provenance,
            connector_status: result.status,
            duration_ms: result.durationMs,
          },
          warnings: result.response?.warnings ?? [result.error],
        })
        .eq('id', handoffId)
      return NextResponse.json({
        persisted: true,
        handed_off: false,
        handoff_id: handoffId,
        connector: readiness,
        error: result.error,
      }, { status: result.status === 'rejected' ? 422 : 502 })
    }

    const artifact = result.response.artifact!
    const returnedCompanyId = result.response.companyRef?.creativeOsCompanyId ?? creativeOsCompanyId ?? null
    const acceptedAt = new Date().toISOString()
    const { error: finalError } = await service
      .from('creative_os_handoffs')
      .update({
        status: 'accepted',
        creative_os_company_id: returnedCompanyId,
        creative_os_artifact_id: artifact.id,
        creative_os_url: artifact.url ?? null,
        accepted_at: acceptedAt,
        last_error: null,
        response_payload: result.response,
        provenance: {
          ...result.response.provenance,
          connector_duration_ms: result.durationMs,
          connector_attempts: result.attempts,
        },
        warnings: result.response.warnings,
      })
      .eq('id', handoffId)
    if (finalError) throw new Error(finalError.message)

    const { error: documentUpdateError } = await service
      .from('strategic_source_documents')
      .update({ status: 'handed_off', handed_off_at: acceptedAt })
      .eq('id', document.id)
    if (documentUpdateError) throw new Error(documentUpdateError.message)

    return NextResponse.json({
      persisted: true,
      handed_off: true,
      handoff_id: handoffId,
      creative_os_artifact_id: artifact.id,
      creative_os_company_id: returnedCompanyId,
      creative_os_url: artifact.url ?? null,
      provenance: result.response.provenance,
      warnings: result.response.warnings,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Creative OS handoff failed' },
      { status: 500 },
    )
  }
}
