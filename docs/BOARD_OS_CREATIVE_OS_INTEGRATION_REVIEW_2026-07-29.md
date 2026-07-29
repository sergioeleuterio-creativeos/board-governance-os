# Board OS ↔ Creative OS Integration Review

Last updated: 2026-07-29

## Decision

Enable only the explicit v1 Strategic Source Document handoff. Keep automatic company sync and legacy capability mutations disabled.

Sprint 5 resolves the blocking contract and write-isolation issues identified below. Board OS remains the governance source of truth; Creative OS receives one immutable, founder-confirmed derivative source document and returns durable artifact references with provenance.

Status:

- product boundary: sound;
- infrastructure isolation: verified;
- public route availability: verified;
- unauthenticated authorization behavior: verified;
- live authenticated v1 handoff: passed in production with an isolated QA company;
- schema compatibility: passed through the runtime-validated `1.0` envelope;
- write isolation: passed; analysis is read-only and linking/import requires an explicit operation;
- observability and evolution safety: request IDs, immutable hashes, idempotency, provenance, timeout, retry, circuit breaker, and kill switches are active.

The findings later in this document describe the legacy bridge as originally reviewed. They remain relevant historical evidence, but that bridge is disabled in the shipped Board OS path.

## What was verified

### Repositories and deployed code

- Board OS repository:
  - remote: `sergioeleuterio-creativeos/board-governance-os`;
  - local and remote `main`: `3a226bc97fbc3953e115dd867750fe047a782867`;
  - typecheck passed.
- Creative OS repository:
  - remote: `sergioeleuterio-creativeos/creative-os`;
  - local and remote `main`: `ed3005d8619752faeced4c48925f8265273a8b46`;
  - typecheck passed with incremental output disabled;
  - connector routes and middleware exemption remain present on current `main`.

### Database isolation

The systems use different Supabase projects:

- Board OS: `jzmwrwzrmpjftuirqljc.supabase.co`;
- Creative OS: `mrmpworscgvnkbfujhbv.supabase.co`.

No database, authentication project, storage bucket, or user table is shared by configuration in the checked-out applications.

### Production route availability

`https://www.creative-os.ai` returned HTTP 200.

Five consecutive unauthenticated probes against each connector route returned HTTP 401:

| Route | Results | Average response |
|---|---:|---:|
| `/api/board-os/capabilities` | 5 × 401 | 274 ms |
| `/api/board-os/companies/upsert` | 5 × 401 | 185 ms |

This verifies:

- both production routes are deployed;
- middleware permits the routes to reach their route-level authorization;
- the connector kill switch is currently enabled rather than returning 503;
- unauthenticated requests do not reach payload processing.

It does not verify that the currently configured shared key works.

### Board OS environment currently available here

- `CREATIVE_OS_MODE=mock`;
- no local `CREATIVE_OS_URL`;
- no local `CREATIVE_OS_API_KEY`;
- `CREATIVE_OS_SYNC_ENABLED=false`;
- connector smoke test therefore exits successfully with an explicit skip.

This is safe, but it is not a live connector test.

## Authorization findings

### P0 — Integration secret is committed

A Board OS integration secret is written in the tracked Creative OS sprint document `SPRINT-78-board-os-connector.md`.

The secret must be treated as compromised even if it is no longer the production value:

1. rotate the Creative OS `BOARD_OS_INTEGRATION_API_KEY`;
2. set the matching rotated value as Board OS `CREATIVE_OS_API_KEY`;
3. remove the literal secret from the current file;
4. consider purging it from Git history;
5. use separate preview and production keys;
6. support two active key versions temporarily for zero-downtime rotation.

The exposed value was not used for an authenticated production call during this review.

### Missing Vercel authorization

The Creative OS project is linked locally to Vercel, but the available Vercel authorization returned HTTP 403 for project metadata.

Therefore this review could not independently verify:

- production environment-variable presence and target scope;
- the production deployment commit;
- preview versus production key separation;
- current connector logs and failure rates.

Vercel project/team read access must be restored before the authenticated smoke test.

### Missing live connector authorization

Board OS has no usable local `CREATIVE_OS_API_KEY` or URL. An authenticated capability call and idempotent company-link replay could not be run safely.

Do not recover the key from the committed document. Rotate and inject a new key through the deployment platforms.

## Contract conflicts

### P0 — Capability calls are not read-only

Board OS treats `CREATIVE_OS_SYNC_ENABLED=false` as capability-only mode.

Creative OS `/api/board-os/capabilities` calls `resolveOrCreateCompanyLink()` before generating an answer. It may:

- create a Creative OS company;
- create or update a link;
- update link metadata and `last_synced_at`;
- add audit events.

This means turning Board OS to `CREATIVE_OS_MODE=http` can modify Creative OS even while Board OS reports **sync disabled**.

Required correction:

- analysis/capability calls must be read-only;
- only the explicit company-link endpoint may create or update identity;
- the handoff action must require explicit founder intent.

### P0 — Evidence status vocabulary disagrees

Creative OS returns:

- `CONFIRMED`;
- `PARTIAL`;
- `MISSING`.

Board OS expects:

- `CONFIRMADO`;
- `DERIVADO`;
- `RISCO ATIVO`;
- `FALTANDO`;
- `PARCIAL`.

Board OS currently accepts the remote string without runtime mapping or schema validation. Unexpected values can reach the UI and lose correct labels, colors, or logic.

Required correction:

- use language-neutral API enum values: `confirmed`, `derived`, `active_risk`, `missing`, `partial`;
- translate only at the UI boundary;
- validate all remote responses at runtime.

### P0 — Role brief schemas disagree

Creative OS returns:

```json
{ "role": "CFO", "brief": "..." }
```

Board OS expects:

```json
{
  "code": "CFO",
  "angle": "...",
  "evidence": "...",
  "pressure": "..."
}
```

The Board OS sanitizer matches by `code`, so the current Creative OS role briefs are discarded and replaced by local fallbacks.

### P0 — Output type schemas disagree

Creative OS returns:

- `campaign_plan`;
- `room_outcome_summary`.

Board OS accepts:

- `memo`;
- `strategy`;
- `sales`;
- `campaign`;
- `plan`;
- `minutes`.

The Board OS sanitizer only enriches an output whose type already exists in the fallback list. `campaign_plan` and `room_outcome_summary` therefore do not match and are discarded.

### P1 — The connector makes too many model calls

One Board OS readout can run:

1. `runStrategyDiagnosis`;
2. `createBoardBrief`;
3. `createCampaignPlan`.

The first call is sequential. The next two are parallel. Each Board OS call permits 45 seconds, while Creative OS permits a model call of up to 35 seconds.

Consequences:

- a page read can trigger three paid model calls;
- total wall time can exceed a normal application-route budget;
- repeated navigation can regenerate the same work;
- partial outages become slow pages rather than controlled background work.

Required correction:

- one consolidated analysis call per source snapshot;
- cache by source-snapshot hash;
- do not run model capabilities as an incidental consequence of page rendering;
- generate in a durable background job or explicit Chair action.

### P1 — Failures are invisible

Board OS catches HTTP errors, timeouts, and parse failures and silently returns local fallback content.

This protects availability, but it makes the UI and operators unable to distinguish:

- Creative OS analysis;
- Board OS fallback;
- stale cache;
- timeout;
- invalid schema;
- authorization failure.

Every artifact needs provenance and connector status. Client UI can stay calm; operational logs cannot stay silent.

### P1 — No versioned contract

The connector has:

- no contract version;
- no response schema version;
- no request correlation propagated across systems;
- no input hash;
- no capability idempotency key;
- no compatibility negotiation;
- no deprecation policy.

Either repository can evolve and silently degrade the other into fallback mode.

### P2 — Origin allowlisting is not authentication

The Creative OS allowlist checks `Origin` only when the header is present. Normal server-to-server calls from Board OS do not send it.

The bearer key remains the real control. Keep the allowlist as defense-in-depth, but do not report it as an authorization boundary.

## Stable product boundary

### Board OS owns

- raw founder conversation and uploaded evidence;
- company context and plan versions;
- diagnostic question and board agenda;
- board packs and released versions;
- human and synthetic board participation;
- transcripts, minutes, decisions, owners, review dates, and follow-ups;
- the Strategic Source Document produced after the hot seat.

### Creative OS owns

- Brand Foundation;
- Strategy Core;
- positioning and messaging;
- audience and category strategy;
- campaign briefs and campaign plans;
- creative production and performance learning;
- its own brands and brand-level memory.

### Shared, but never jointly editable

- company identity link;
- explicitly selected strategic context;
- versioned Strategic Source Document;
- derivative-artifact references and status;
- provenance.

Board OS sends a snapshot. Creative OS creates derivatives. Creative OS never overwrites Board OS governance records. Board OS never edits Creative OS brand memory directly.

## Target interaction model

### 1. Analysis without identity mutation

During intake or hot-seat preparation, Board OS may request Strategy Core or Brand Foundation analysis.

The request:

- is read-only;
- contains only explicitly selected context;
- does not create a Creative OS company;
- returns a versioned analysis artifact with sources, assumptions, and warnings.

### 2. Board OS hot seat

Board OS stores the returned analysis as an input snapshot. Synthetic and human board members deliberate against that frozen version.

Creative OS does not participate in board orchestration, minutes, decisions, or follow-ups.

### 3. Strategic Source Document

The Chair creates one canonical handoff document from:

- selected plan version;
- intake diagnosis;
- Creative OS analysis snapshot, when used;
- advisor contributions;
- founder answers;
- Chair synthesis;
- approved direction, unresolved questions, KPIs, and risks.

### 4. Explicit handoff to Creative OS

Only when the founder chooses **Continue in Creative OS**:

1. Board OS explicitly links or creates the Creative OS company;
2. Board OS imports one immutable Strategic Source Document version;
3. Creative OS creates briefs, campaigns, and production artifacts from it;
4. Creative OS returns its company ID, optional brand IDs, artifact IDs, URLs, and status;
5. Board OS stores references and provenance, not Creative OS internals.

### 5. Later board review

Creative OS can publish a compact execution result back to Board OS:

- artifact version;
- approved campaign or brief;
- KPI snapshot;
- assumptions changed;
- decisions requested from the board.

Board OS imports it as evidence for the next pack. It does not mirror the Creative OS database.

## Versioned connector contract

Use a single envelope in both directions:

```json
{
  "contractVersion": "1.0",
  "requestId": "uuid",
  "idempotencyKey": "stable-operation-key",
  "operation": "analyze | link_company | import_handoff | publish_result",
  "sourceSystem": "board_os",
  "companyRef": {
    "boardOsCompanyId": "uuid",
    "creativeOsCompanyId": "optional-uuid"
  },
  "sourceSnapshot": {
    "id": "uuid",
    "version": 3,
    "hash": "sha256"
  },
  "payload": {}
}
```

Every response should add:

```json
{
  "contractVersion": "1.0",
  "requestId": "same-uuid",
  "status": "completed | accepted | rejected | degraded",
  "artifact": {
    "type": "strategy_analysis",
    "schemaVersion": "1.0",
    "id": "uuid",
    "payload": {}
  },
  "provenance": {
    "sourceIds": [],
    "inferredFields": [],
    "missingEvidence": [],
    "generatedAt": "ISO-8601",
    "provider": "creative_os"
  },
  "warnings": []
}
```

## Recommended endpoints

Keep compatibility redirects temporarily, but make the stable contract explicit:

- `GET /api/integrations/board-os/v1/health`
  - authenticated;
  - no model call;
  - returns contract versions and enabled operations.
- `POST /api/integrations/board-os/v1/analyze`
  - read-only;
  - one consolidated analysis per source-snapshot hash.
- `POST /api/integrations/board-os/v1/companies/link`
  - explicit mutation;
  - idempotent;
  - never called by page rendering.
- `POST /api/integrations/board-os/v1/handoffs`
  - imports an immutable Strategic Source Document.
- `POST /api/integrations/creative-os/v1/results`
  - future Creative OS → Board OS execution-result publication.

## Runtime protections

- Rotate the exposed key before any authenticated test.
- Use separate preview and production keys.
- Support current and next key IDs during rotation.
- Prefer signed requests with timestamp and body hash; reject stale replays.
- Validate request and response schemas at runtime.
- One model generation per source snapshot.
- Cache by company, operation, contract version, and snapshot hash.
- Retry one network/5xx failure only; never retry 4xx.
- Circuit-break after repeated failures and serve an explicitly labeled cached/local result.
- Use a 30-second total Board OS connector budget, not 45 seconds per sub-call.
- Persist request ID, duration, status, artifact ID, and fallback reason.
- Never log secrets, raw documents, or full private transcripts.
- Keep a Creative OS connector kill switch.

## Deployment sequence

1. Keep Board OS production at `mock` and sync off.
2. Rotate and remove the exposed credential.
3. Restore read-only Vercel access for both projects.
4. Align enums, role briefs, outputs, and envelope schemas.
5. Make Creative OS analysis read-only.
6. Add health and contract tests to both repositories.
7. Deploy Creative OS changes first; existing Board OS remains unaffected.
8. Configure a separate Board OS preview key and Creative OS preview authorization.
9. Run authenticated preview tests:
   - health;
   - all supported artifacts;
   - malformed payload;
   - invalid signature;
   - timeout;
   - schema mismatch;
   - repeated input hash;
   - explicit company link twice with no duplicate;
   - verify no company is created by analysis.
10. Enable Board OS preview HTTP analysis with company linking still off.
11. Run the full QA founder journey and inspect provenance.
12. Enable explicit preview handoff.
13. Promote contract and keys to production.
14. Keep an immediate kill switch and local fallback.

## Access and approvals still needed

1. Restore or grant read-only Vercel team access for the linked Creative OS project and the Board OS project.
2. Rotate the integration key in Creative OS and set the matching Board OS secret.
3. Authorize one isolated Creative OS QA company for the idempotent link and handoff test.
4. Provide a Board OS preview deployment target before production configuration changes.
5. Provide database migration authority for the Board OS participant/contribution work and any Creative OS connector migration.

No Google, Outlook, Slack, Teams, WhatsApp, or email connector is required for this bridge.
