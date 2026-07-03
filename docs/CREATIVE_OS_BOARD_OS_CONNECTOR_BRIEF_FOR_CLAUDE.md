# Creative OS <> Board OS Connector Brief For Claude

Date: 2026-07-03

Audience: Claude working inside the Creative OS codebase.

Purpose: prepare the Creative OS side of the integration so Board OS and Creative OS can share company context, request Creative OS strategy capabilities, and create a future commercial handoff between the two products.

## The Strategic Rationale

Board OS and Creative OS should remain separate products, but they should recognize the same company when a client uses both.

Board OS is where leadership teams run decision rooms, preserve board memory, challenge assumptions, capture decisions, and turn uncertainty into governance-grade next steps.

Creative OS is where brand, strategy, campaign, and creative operating materials are diagnosed, generated, reviewed, and improved.

The commercial logic is important:

- A company created in Board OS should also be able to exist in Creative OS.
- A Board OS client may later be pitched Creative OS as an add-on when the board work reveals a brand, marketing, positioning, campaign, or go-to-market gap.
- A company already using Creative OS may later want Board OS when strategic work needs governance, advisor challenge, board preparation, or decision memory.
- The two systems should share enough context to make the handoff feel intelligent, without merging databases or making either product dependent on the other.

This is not a full product merger. It is a controlled bridge between two operating systems:

- Board OS owns decisions, board sessions, advisor rooms, company brain evidence, follow-ups, and governance memory.
- Creative OS owns brand strategy, campaign planning, creative briefs, strategic messaging, distinctive assets, and creative execution artifacts.
- Shared company identity and selected strategic context should travel between them.

## Required Creative OS Work

Build the Creative OS service boundary that Board OS can call from server-side routes.

Board OS already expects this endpoint:

```text
POST {CREATIVE_OS_URL}/api/board-os/capabilities
Authorization: Bearer {CREATIVE_OS_API_KEY}
Content-Type: application/json
```

The first implementation can be narrow. It does not need to sync every record. It needs to prove that:

1. Board OS can call Creative OS securely.
2. Creative OS can receive a company context and capability request.
3. Creative OS can return structured outputs that Board OS can display.
4. The same company can be matched or created across both systems.
5. Failures are safe and observable.

## Capability Endpoint

Create a server-side API route:

```text
POST /api/board-os/capabilities
```

Auth:

```text
Authorization: Bearer {CREATIVE_OS_API_KEY}
```

Reject missing or invalid tokens with `401`.

Expected request shape:

```json
{
  "capability": "runStrategyDiagnosis",
  "company": {
    "name": "Example Company",
    "website": "https://example.com",
    "industry": "Consumer",
    "boardOsCompanyId": "uuid-from-board-os",
    "creativeOsCompanyId": "optional-existing-id",
    "canonicalCompanyKey": "example-company"
  },
  "diagnosis": {
    "statedProblem": "The leadership team is debating whether to reposition the brand.",
    "inferredProblem": "The real issue may be weak category memory and unclear audience priority.",
    "tension": {
      "a": "The company needs short-term commercial proof.",
      "b": "The brand may need a sharper long-term point of view."
    },
    "frames": [],
    "evidenceMap": [],
    "recommendedQuestion": "Should we prioritize repositioning before the next campaign cycle?",
    "decisionQuestions": [
      "Should we prioritize repositioning before the next campaign cycle?",
      "What evidence would make this decision safer?"
    ],
    "confidence": 72,
    "missingContext": [
      "Brand tracking",
      "Sales pipeline by segment",
      "Recent campaign performance"
    ]
  },
  "boardBrief": {
    "boardBrief": "Current Board OS brief.",
    "roleBriefs": []
  },
  "outputs": []
}
```

Supported capability values:

```text
runStrategyDiagnosis
createBoardBrief
createRoleBriefs
createCampaignPlan
compressRoomOutcome
```

Response can be partial. Board OS already sanitizes and falls back to its local output when a field is missing.

Expected response shape:

```json
{
  "company": {
    "creativeOsCompanyId": "creative-os-company-id",
    "boardOsCompanyId": "uuid-from-board-os",
    "canonicalCompanyKey": "example-company"
  },
  "diagnosis": {
    "statedProblem": "Sharpened statement from Creative OS.",
    "inferredProblem": "Sharper strategic diagnosis.",
    "tension": {
      "a": "Commercial proof is needed now.",
      "b": "The brand needs compounding memory, not another isolated campaign."
    },
    "frames": [
      {
        "title": "Category Memory",
        "detail": "The issue is not only campaign performance. It is whether the company is becoming easier to remember and choose.",
        "selected": true
      }
    ],
    "evidenceMap": [
      {
        "claim": "The company lacks enough brand tracking to prove salience.",
        "source": "Board OS Company Brain",
        "status": "PARTIAL"
      }
    ],
    "recommendedQuestion": "What decision would improve commercial proof and brand memory at the same time?",
    "decisionQuestions": [
      "What decision would improve commercial proof and brand memory at the same time?",
      "What evidence must be collected before committing budget?"
    ],
    "confidence": 78,
    "missingContext": [
      "Brand tracking baseline",
      "Campaign attribution by audience"
    ]
  },
  "boardBrief": {
    "boardBrief": "Board-ready synthesis written by Creative OS.",
    "roleBriefs": []
  },
  "roleBriefs": [],
  "outputs": [
    {
      "type": "campaign_plan",
      "title": "Campaign Plan",
      "body": "Creative OS campaign planning output.",
      "sources": [
        "Board OS Company Brain",
        "Creative OS strategy layer"
      ],
      "pages": 4
    }
  ]
}
```

## Company Identity And Two-Way Creation

Creative OS needs a small integration layer that can link one real-world company across both systems.

Do not rely on company name alone. Use a mapping record.

Suggested table or collection:

```text
integration_company_links
```

Suggested fields:

```text
id
board_os_company_id
creative_os_company_id
canonical_company_key
company_name
primary_domain
source_system
link_status
created_at
updated_at
last_synced_at
metadata
```

Rules:

- If Board OS sends `boardOsCompanyId` and no matching link exists, Creative OS should create or link a Creative OS company.
- If Creative OS already has a company with the same verified domain or explicit external link, attach the Board OS ID instead of creating a duplicate.
- If Creative OS creates a company first, it should be possible later to create or link the Board OS company using the same mapping table.
- Use `canonicalCompanyKey` and `primary_domain` as matching hints, not as final proof.
- Preserve source system: `board_os`, `creative_os`, or `manual_link`.
- Keep an audit trail for link creation and changes.

## Company Sync Endpoint

Add a second endpoint for company upsert. This gives us a clean bridge before deeper event sync.

```text
POST /api/board-os/companies/upsert
Authorization: Bearer {CREATIVE_OS_API_KEY}
Content-Type: application/json
```

Request:

```json
{
  "sourceSystem": "board_os",
  "idempotencyKey": "board-os-company-upsert:uuid:2026-07-03T12:00:00Z",
  "company": {
    "boardOsCompanyId": "uuid-from-board-os",
    "creativeOsCompanyId": null,
    "canonicalCompanyKey": "example-company",
    "name": "Example Company",
    "website": "https://example.com",
    "industry": "Consumer",
    "market": "Brazil",
    "description": "Short business description.",
    "createdByEmail": "client@example.com"
  },
  "context": {
    "boardOsReason": "Company created for decision room.",
    "availableEvidence": [
      "website",
      "uploaded transcript",
      "company brain summary"
    ],
    "missingEvidence": [
      "brand tracking",
      "commercial data"
    ]
  }
}
```

Response:

```json
{
  "ok": true,
  "link": {
    "boardOsCompanyId": "uuid-from-board-os",
    "creativeOsCompanyId": "creative-os-company-id",
    "canonicalCompanyKey": "example-company",
    "linkStatus": "linked"
  },
  "created": {
    "creativeOsCompany": true
  }
}
```

Future reverse direction:

Creative OS should later expose or call the equivalent Board OS endpoint when a Creative OS company wants Board OS enabled. The payload should be symmetrical:

```text
POST {BOARD_OS_URL}/api/creative-os/companies/upsert
Authorization: Bearer {BOARD_OS_API_KEY}
```

Do not build this reverse endpoint inside Creative OS unless Board OS has the matching route ready. For now, design the Creative OS data model so reverse linking is possible.

## Event Sync: Parked For Later

Do not start with full event mirroring.

Once company linking works, these events can be added:

```text
company.upserted
diagnostic.created
board_session.completed
decision.approved
output.generated
creative_brief.created
campaign_plan.created
```

For the first connector test, keep sync limited to:

- company upsert/link
- capability request
- capability response

Board OS currently keeps:

```text
CREATIVE_OS_SYNC_ENABLED=false
```

That should remain false until the event policy is implemented and approved.

## Data Boundaries

Creative OS should not receive everything Board OS knows.

Allowed for first integration:

- company name
- website/domain
- industry/category
- market
- high-level company description
- selected Company Brain summaries
- decision questions
- missing context
- evidence map with source names
- generated Board OS readout fields

Avoid for first integration:

- raw uploaded private files unless explicitly selected
- full transcripts unless explicitly selected
- passwords, tokens, auth metadata
- Board OS internal organization or billing records
- unrelated company data from the same organization

Creative OS outputs returned to Board OS should include provenance:

- which input context was used
- what is inferred
- what evidence is missing
- what should be validated by the client

## Failure Behavior

The endpoint should be designed for graceful failure.

Requirements:

- Return `401` for invalid auth.
- Return `400` for malformed payloads.
- Return `422` when the capability is known but the input cannot support a useful answer.
- Return `500` only for unexpected server failure.
- Time out long-running model calls before Board OS reaches its timeout.
- Never return unstructured prose as the top-level response.

Board OS currently uses a 45 second timeout:

```text
CREATIVE_OS_TIMEOUT_MS=45000
```

Creative OS should target a response under 30 seconds for the first test.

## Implementation Notes For Claude

Build this as a server-side integration. Nothing should be exposed in browser bundles.

Recommended Creative OS environment variables:

```bash
BOARD_OS_INTEGRATION_API_KEY=""
BOARD_OS_ALLOWED_ORIGINS="https://www.board-os.ai,https://board-os.ai"
BOARD_OS_CONNECTOR_MODE="enabled"
```

If Creative OS already has a pattern for integration secrets, use the existing pattern instead of inventing a new one.

Add structured logging, but never log secrets or full private source documents.

Log:

- request id
- capability name
- linked company ids
- response status
- duration
- fallback reason, if any

Do not log:

- authorization header
- API key
- raw uploaded documents
- raw transcripts unless the client has explicitly opted into debug logging

## Acceptance Criteria

The Creative OS side is ready when:

- `POST /api/board-os/capabilities` exists and validates bearer auth.
- `POST /api/board-os/companies/upsert` exists and can create or link a Creative OS company from a Board OS company payload.
- The company link mapping prevents duplicate companies when the same domain or explicit IDs are sent again.
- The capability endpoint returns valid JSON for all five Board OS capability names.
- Partial responses are intentional and documented.
- A failed Creative OS call does not break Board OS.
- A test Board OS company can appear in Creative OS as a linked company.
- A Creative OS company can be prepared for future Board OS activation through the same mapping model.

## Suggested Test Path

1. Create a test company in Board OS.
2. Call Creative OS company upsert with the Board OS company ID.
3. Confirm Creative OS creates or links the company.
4. Call `runStrategyDiagnosis`.
5. Call `createBoardBrief`.
6. Call `createRoleBriefs`.
7. Call `createCampaignPlan`.
8. Call `compressRoomOutcome`.
9. Repeat the same company upsert and confirm no duplicate company is created.
10. Force invalid auth and confirm `401`.
11. Force a model timeout and confirm Creative OS returns a controlled failure.
12. Flip Board OS Preview to:

```bash
CREATIVE_OS_MODE="http"
CREATIVE_OS_URL="https://<creative-os-service-domain>"
CREATIVE_OS_API_KEY="<shared-secret>"
CREATIVE_OS_SYNC_ENABLED="false"
```

13. Run Board OS QA in Preview before any production change.

## What Not To Build Yet

Do not build a broad two-way database sync yet.

Do not copy Board OS data wholesale into Creative OS.

Do not make Creative OS required for Board OS to function.

Do not make Board OS required for Creative OS to function.

Do not expose Creative OS credentials, Claude workflow credentials, or model provider keys to the browser.

The first win is a clean bridge: shared company identity, server-side capability calls, and safe fallback.

