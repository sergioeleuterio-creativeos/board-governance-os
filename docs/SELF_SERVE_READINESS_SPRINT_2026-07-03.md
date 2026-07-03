# Self-Serve Readiness Sprint

Date: 2026-07-03

## Objective

Move Board OS closer to a self-serve client product without waiting for new external credentials. Board OS remains the system of record for companies, Company Brain, sessions, decisions, follow-ups, and exports. Creative OS is treated as an enrichment layer for strategy, brief, campaign, and room-compression outputs.

## Built Tonight

### Creative OS connector readiness

- Added server-side Creative OS readiness metadata.
- Admin IA now shows:
  - connector mode: `mock`, `http`, or `worker`
  - whether HTTP URL/API key are configured
  - whether company sync is enabled
  - timeout
  - missing env vars
  - product boundary: Board OS source of truth, Creative OS enrichment
- Creative OS QA script now passes in `mock` mode with an explicit skip message.
- Live cross-system QA still requires `CREATIVE_OS_MODE=http`, `CREATIVE_OS_URL`, and `CREATIVE_OS_API_KEY`.

### Session export and sparse PDF behavior

- Session exports now include:
  - active question
  - room state
  - next step
  - richer synthesis fallback
  - requested data
  - bypassed gaps
  - queued deliverables
- Open/incomplete rooms no longer export as a thin "no recommendation" PDF without explanation.
- Draft exports now tell the user what is missing before external sharing.

### Decision room self-serve cues

- After approve/defer, the room now shows a next-step panel.
- The panel guides the user to:
  - export the PDF
  - review Decision Memory
  - review Follow-ups
  - review Board Pack
- Export button now clarifies whether the file is final, in-progress, or premature.

### Admin recovery

- Admin Sessions now supports inline closure summary editing.
- Added recovery actions:
  - close
  - mark review
  - await founder
  - reopen
- This gives operators a way to recover sparse or partially saved sessions without direct database edits.

### Portuguese polish

Focused pt-BR polish on:

- Company Brain
- Governance Run
- Board Pack
- Admin IA
- Admin Sessions
- shared status/closure labels

## Validation

- `npm run typecheck`: passed
- `npm run qa:decision-room`: passed
- `npm run qa:creative-os-connector`: passed in mock mode with explicit live-QA instructions
- `npm run qa:exports`: passed with legacy artifact warnings only
- `npm run build`: passed

## Still Needed From Sergio

### Creative OS live QA

Provide or confirm:

- `CREATIVE_OS_MODE=http`
- `CREATIVE_OS_URL`
- `CREATIVE_OS_API_KEY`
- whether to enable `CREATIVE_OS_SYNC_ENABLED=true` in preview first

Recommendation:

- Test live sync in Vercel preview before production.
- Keep production on `mock` until at least one company upsert and one capability call pass end-to-end.

### Voice / WhatsApp intake

Decide the first implementation path:

- Fast path: WhatsApp voice/transcript manually pasted into Company Intake voice field.
- Better path: WhatsApp webhook -> audio download -> transcription -> Company Brain intake note.
- Full path: WhatsApp conversation state, identity matching, file handling, retry queue, and admin review.

### Legal and billing

Still required for paid self-serve:

- final Terms
- final Privacy Policy
- DPA/subprocessor language
- Stripe products/prices
- Stripe webhook setup
- billing plan UI and enforcement policy
