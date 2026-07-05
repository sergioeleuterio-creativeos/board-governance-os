# Self-Serve Advisory Bridge

Date: 2026-07-05

## Product Direction

Board OS should not assume every client arrives with a clean decision.

The owner-facing loop becomes:

1. Tell us what's happening.
2. Shape the problem.
3. Choose the help type.
4. Run the right advisors.
5. Leave with a plan, decisions, and actions.

The system keeps Company Brain, sessions, decisions, follow-ups, exports, and admin operations as durable machinery. The owner experience exposes fewer modules and clearer choices.

## Two Session Contracts

### Advisory Sessions

Use when the client has fog, a broad question, or consulting-style need.

Examples:

- Diagnose what is really happening.
- Build a business, brand, marketing, or GTM plan.
- Pressure a growth, positioning, sales, product, or operational problem.
- Ask one advisor, a selected group, or an advisor plus partner to reason through the case.

Expected output:

- Diagnostic.
- Executive summary.
- Advisor perspectives and disagreements.
- Recommended plan.
- Workstreams.
- KPIs.
- Risks and assumptions.
- Open questions.
- Suggested decisions to make next.
- Follow-ups and owners.

Guardrail: advisory can explore, but it must close into an operational artifact.

### Board Sessions

Use when the client has a concrete decision, board pack, or formal governance question.

Examples:

- Approve, reject, defer, or condition a decision.
- Prepare a board, partner, investor, or leadership meeting.
- Review execution after a decision.

Expected output:

- Board-ready evidence.
- Trade-offs.
- Recommendation.
- Decision memory.
- Conditions and review date.
- Follow-ups and owners.
- Exportable readout.

Guardrail: board sessions should not become open-ended chat. They exist to decide or define why a decision cannot yet be made.

## Current Bridge Implemented

- Owner navigation is reduced to Home, Context, Sessions, Decisions, and Follow-ups.
- Home now uses live dashboard data again instead of the old decision-room demo shell.
- Context, Decisions, and Follow-ups now use their live Supabase-backed screens.
- Sessions are split into "Preciso entender o problema" and "Preciso decidir."
- Session types now distinguish advisory sessions from board sessions while reusing the current room persistence/export path.
- Advisor selection is visible in the session picker and is passed into deterministic/live advisor turn generation.
- Selected advisors, session kind, requested data, accepted gaps, output queue, and transcript are persisted on `board_sessions.metadata`.
- Advisory sessions close into a consultive plan/candidate decision and follow-ups without marking the item as an approved board decision.
- Advisory sessions also persist a `business_plans` record with diagnosis, priorities, workstreams, KPIs, risks, assumptions, timeline, and session metadata.
- Session exports now label advisory vs board sessions and include selected advisors, plan/workstream sections, suggested decisions, requested data, accepted gaps, and queued outputs.
- Each session type has a turn limit so advisory cannot become an unbounded general chatbot.
- Company intake now has a WhatsApp transcript field that saves into Company Brain as chat-sourced memory with WhatsApp labels.
- The explicit LANCE demo route and global LANCE decision-room seed adapter were removed.
- `scripts/seed-lance.mjs` stays in the repo for later production-review seeding; it is not part of the owner-facing app path.
- Old static UX/design mock files and unused mock decision-room data were removed.
- Diagnosis, Briefings, and Outputs routes now redirect to Sessions instead of remaining owner-facing modules.

## Next Implementation Steps

1. Add partner invitation as a distinct action from advisor selection, with referral/commercial tracking.
2. Build the WhatsApp webhook: identity match, transcript/audio extraction, file handling, retry queue, and admin review.
3. Decide whether legacy Governance Run, Board Pack, and Shadow Board Review pages should become admin-only recovery surfaces or be deleted after the new session/export path covers them.
4. Replace remaining legacy route copy in docs and admin-only screens after the owner flow stabilizes.

## Doubts To Resolve

- Should advisory outputs create decision candidates automatically every time? Current implementation creates a candidate plan/decision on close, not an approved decision.
- Should partners appear as normal advisors in the same picker, or as a separate "invite partner" action with commercial/referral tracking?
- Should Creative OS live inside Board OS as advisor capability calls, or remain a separate service boundary for brand, campaign, and GTM outputs?
