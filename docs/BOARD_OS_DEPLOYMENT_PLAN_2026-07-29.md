# Board OS — Deployment Plan

Last updated: 2026-07-29

## Shipping decision

Ship one cumulative product, not a sequence of disconnected features.

The invariant across every sprint is:

> founder input → durable company context → named decision → selected plan version → released pack → visible deliberation → Chair synthesis → decision → commitments

No sprint may create a second source of truth, reintroduce a manual agent console, or make Board OS responsible for Creative OS campaign production.

## Release model

- Work on a dedicated `codex/` branch.
- Deploy every completed sprint to Board OS preview first.
- Keep Board OS production in Creative OS fallback mode with automatic company sync disabled until Sprint 5.
- Promote a sprint only when its acceptance tests and every prior sprint's regression suite pass.
- Apply database migrations before application code only when the new application remains backward compatible with the previous schema.
- Keep a rollback point at the last promoted sprint.
- Production promotion and outbound email require explicit approval.

## Sprint 1 — Trustworthy persistence and entry gates

**Outcome:** Board OS tells the truth about what is durable.

**Status:** released cumulatively with Sprint 2 to production on 2026-07-29.

### Build

- Replace the misleading intake actions with:
  - local text-draft save;
  - review action;
  - one primary `Create company context` action that persists.
- Set the newly created company as the active-company cookie in the same successful response.
- Require durable IDs before displaying context, session, or decision success.
- Return non-2xx responses when a session or decision cannot persist.
- Preserve the room transcript in client state when persistence fails and show a retryable error.
- Block `/rooms` until an authenticated user has an active company.
- Add a reusable client-side persistence-envelope validator.

### Sprint 1 tests

- Unit:
  - accept a persisted session only with `persisted: true` and `boardSessionId`;
  - accept a decision only with `persisted: true`, `boardSessionId`, and `decisionId`;
  - reject missing IDs, `persisted: false`, malformed payloads, and server reasons.
- Static/type:
  - TypeScript;
  - production build;
  - lint where supported by the installed Next.js version.
- API:
  - unauthenticated intake/session/decision return 401;
  - no-active-company session/decision return 409;
  - successful intake returns company and governance-cycle IDs and sets the current-company cookie.
- Browser:
  - local draft survives refresh without claiming server persistence;
  - primary action first opens Review, then creates context;
  - successful create lands in Company Brain with the new company active;
  - a user without a company is redirected from Rooms to Intake;
  - failed room persistence does not show `Session saved` or approved state.

### Integration with the existing product

- Existing Company Brain persistence remains the storage path.
- Existing board-session, decision, business-plan, and follow-up records remain unchanged.
- No migration, outbound email, or Creative OS call is introduced.
- The Sprint 1 regression suite becomes a mandatory gate for every later sprint.

### Deployment gate

- Preview smoke test with a new QA founder and one existing founder.
- Confirm no production Creative OS traffic.
- Promote only after explicit production approval.

### Execution evidence — 2026-07-29

- Added a local-only intake draft with explicit copy that it has not reached Board OS.
- Changed the primary intake path to `Review context` → `Create company context`.
- The intake response now requires company and governance-cycle IDs and sets the current-company cookie.
- Session and decision APIs now return 409 without an active company and 500 when durable persistence cannot be confirmed.
- Session success requires a board-session ID.
- Decision success requires board-session and decision IDs.
- Room state remains on screen and displays a retryable error after failure.
- `/rooms` and `/rooms/[id]` now redirect users without an active company to intake.
- Added four persistence-contract tests.
- Verification passed:
  - `npm run test:sprint1`;
  - `npm run typecheck`;
  - `npm run build`;
  - `git diff --check`;
  - browser check for local-draft truthfulness, reload recovery, and Review → Create transition.
- The existing `npm run lint` command did not run a lint pass because the repository has no ESLint configuration and Next.js opened its interactive setup prompt. This is a tooling gap, not a reported lint pass.
- No database migration, production deployment, outbound email, Creative OS request, or production data write was made.

## Sprint 2 — Canonical context, decision, and plan versions

**Outcome:** the same decision and evidence survive every handoff.

**Status:** released to production on 2026-07-29.

### Build

- Persist accepted Chair turns and retain raw messages as evidence.
- Extract proposed company, strategy, financial, team, plan, and decision facts for founder confirmation.
- Extend `business_plans` for type, period, front, version, parent, source, normalized content, and consolidation lineage.
- Add one source resolver that freezes:
  - company;
  - selected plan/version;
  - Company Brain entries and documents;
  - prior decisions and follow-ups;
  - pack version;
  - founder question.
- Require a founder-confirmed active question before analysis.
- Pass the same source-snapshot ID and hash to readout, advisor turns, outputs, and persistence.
- Reject an artifact that drops the named decision, alternatives, material numbers, plan version, or source IDs.

### Sprint 2 tests

- Unit:
  - fact extraction normalization;
  - plan-version lineage;
  - deterministic source-snapshot hashing;
  - artifact invariant validation.
- Migration:
  - forward migration on an empty database;
  - forward migration with existing plans;
  - existing plan reads remain valid;
  - RLS still isolates companies.
- Integration:
  - intake message → confirmed fact → source snapshot;
  - two plan years stay separate unless the founder consolidates them;
  - plan → board pack retains decision, alternatives, numbers, and sources.
- Regression:
  - rerun all Sprint 1 tests;
  - verify every durable-success state still requires IDs.

### Integration with Sprint 1

Sprint 2 uses the active company established by Sprint 1 and never creates context from page rendering. Every new artifact inherits Sprint 1 persistence envelopes.

### Deployment gate

- Apply reviewed migration to preview.
- Run an end-to-end QA journey with synthetic numbers and two plan versions.
- Compare source IDs at each handoff.

### Execution evidence — 2026-07-29

- Added a deterministic source resolver covering:
  - active company;
  - selected plan and version;
  - Company Brain entries;
  - uploaded documents;
  - prior decisions;
  - follow-ups;
  - latest related board pack;
  - proposed founder question.
- Added a source-snapshot ID, SHA-256 hash, compact summary, and source references.
- Added legacy read compatibility so current Board OS data remains readable before migration.
- Added founder confirmation as a durable gate before advisor turns, interventions, plan closure, or decision capture.
- Added continuity validation that rejects an output when it drops the named decision or source lineage.
- Added a versioned plan API that keeps plans separate by type, business front, and period and records consolidation lineage.
- Intake now preserves `currentPlan` and `strategicQuestions` as explicit Company Brain plan/question entries.
- Added the additive `0003_plan_versions_and_source_snapshots.sql` migration.
- Current-database browser QA confirmed:
  - the resolver recovered a real named decision from the existing LANCE! plan;
  - the selected plan, version, snapshot suffix, and source count were visible;
  - advisor controls stayed disabled before confirmation;
  - missing migration columns produced no false confirmation and no advisor turn.
- Cumulative unit tests: 13 passing.
- TypeScript passed.
- Hardened the migration so legacy plans receive stable versions before the unique scope index is created, and wrapped it in a transaction.
- Verified the Board Governance OS Supabase project is distinct from the Creative OS project.
- Repaired migration history for the already-present foundation migrations, dry-ran the release, and applied only migration `0003`.
- Verified all plan-version and source-snapshot columns through the live Supabase API schema.
- Locked the production Creative OS connector to `mock` mode with synchronization disabled.
- Deployed and verified preview `dpl_H4Xa9oRYC7rQ36MqxssGMinxNrB2`.
- Promoted Sprint 2 to production and retained the prior production deployment as a rollback point.
- Production QA with `QA Test — Atlas Growth Software` confirmed:
  - founder question and source confirmation;
  - durable source-snapshot ID and SHA-256 hash;
  - one visible and persisted Chair turn;
  - one versioned strategic plan with source provenance.
- Production QA exposed a post-write autosave mismatch: saving the plan correctly evolved live company context, then the same room was incorrectly compared with that new context.
- Fixed the mismatch by validating existing rooms against their immutable stored snapshot while retaining current-context validation for new rooms.
- Added the frozen-snapshot regression test, bringing the cumulative suite to 14 passing tests.
- Deployed the verified hotfix to preview `dpl_H4QyVb71jEc6Ze9s6jkLF2Xv7d8u` and production `dpl_CBfFveHbkaW69oxkKeGvADtqkBcM`.
- Final production QA confirmed the session is `awaiting_founder`, the snapshot is stable, the plan is `ready_for_review`, the adapter provenance is `mock`, and retry persistence succeeds without duplication.

## Sprint 3 — Chair-led Advisor, Board, and Commitments UI

**Outcome:** the founder experiences a meeting, not a control room.

**Status:** released to production on 2026-07-29.

### Build

- Reduce founder navigation to Advisor, Board, and Commitments.
- Make the Chair conversation persistent and available from every founder view.
- Replace agent selection and manual turn controls with Chair orchestration.
- Keep the board roster continuously visible.
- Render human and synthetic contributions in one chronological transcript.
- Keep one composer and one phase-aware primary action.
- Show plan, source snapshot, pack, synthesis, decision, and minutes inline.
- Automate independent analysis, targeted challenges, revised positions, and Chair synthesis.

### Sprint 3 tests

- Component:
  - roster visibility;
  - human/synthetic labels;
  - transcript ordering and reply targets;
  - one primary action per phase;
  - keyboard and screen-reader behavior.
- Integration:
  - Chair selects advisors from the confirmed question and plan;
  - every contribution cites the Sprint 2 snapshot;
  - disagreement triggers bounded challenge and final position;
  - commitments link back to transcript and sources.
- Visual:
  - desktop and mobile screenshots;
  - long contribution, empty state, loading, error, and retry states.
- Regression:
  - all Sprint 1 and Sprint 2 suites;
  - legacy records remain readable through the new views.

### Integration with previous sprints

The UI is a projection of Sprint 1 durable state and Sprint 2 canonical artifacts. It does not add parallel storage or silently regenerate source snapshots.

### Deployment gate

- Founder usability pass: complete a hot seat without opening a selector, queue, evidence console, or manual turn control.
- Verify the visible board never disappears during the session.

### Execution evidence — 2026-07-29

- Reduced founder navigation to Advisor, Board, and Commitments while preserving the complete operations navigation for admins.
- Added an always-available Board OS Advisor dock outside the Advisor route.
- Replaced the session-type grid and agent picker with two Chair-led choices:
  - continue the Advisor conversation;
  - take a named decision to the Board.
- Made the selected synthetic board continuously visible before and during the meeting.
- Reworked the active room around:
  - one chronological transcript;
  - one founder composer;
  - one phase-aware primary action;
  - one compact Chair synthesis.
- Removed the manual intervention toolbar and artifact-add buttons from the founder flow.
- Kept Sprint 1 durable-success validation and Sprint 2 source-snapshot ID/hash in every session and decision write.
- Added five Sprint 3 interaction-contract tests; cumulative suite is 19 passing tests.
- TypeScript, production build, and diff validation pass.
- Desktop browser QA confirmed the new entry and active-meeting layouts. Responsive CSS collapses the Chair entry and meeting transcript to one column below 900px.
- Deployed preview `dpl_2AuUAbsfHZfHZtWeBzocLLRWRUCQ` and promoted production deployment `dpl_B129J5kpNL9qAgxbxTtypnjKKy3n` to `https://www.board-os.ai`.
- Production founder QA confirmed:
  - the founder navigation contains only Advisor, Board, and Commitments;
  - the Advisor remains accessible from the Board view;
  - the board roster stays visible before and during the meeting;
  - the meeting uses one transcript, one founder composer, and one phase-aware primary action;
  - a founder contribution and a synthetic Board Brain contribution appear visibly in the same chronological transcript.
- Production persistence QA in Supabase project `jzmwrwzrmpjftuirqljc` confirmed two durable transcript turns, founder and advisor attribution, a confirmed question, an unchanged source-snapshot ID/hash, and `mock` connector provenance.
- Vercel reported the production deployment `Ready` with no recent 5xx logs.
- Final public smoke tests returned 200 for the home page and 401 for the unauthenticated business-plans endpoint.

## Sprint 4 — Mixed human and synthetic asynchronous board

**Outcome:** invited humans and synthetic advisors deliberate against the same locked pack on a schedule.

**Status:** released to production on 2026-07-29.

### Build

- Add `board_participants` as participant record and session-scoped access grant.
- Add `board_contributions` as the canonical mixed transcript.
- Extend board sessions with timezone, phase, and phase deadlines.
- Add founder-facing meeting invite, accept, and join flow.
- Lock and release one immutable pack version to all participants.
- Seal synthetic independent analyses until the first-read phase closes.
- Schedule human readout, bounded exchanges, Chair synthesis, founder decision, and minutes closure.
- Add reminders, expiry, revocation, and audit events.

### Sprint 4 tests

- RLS/security:
  - invited human sees only the invited session and released pack;
  - no draft pack or unrelated Company Brain access;
  - sealed contributions remain sealed;
  - revoked and expired access is denied;
  - attribution cannot be rewritten.
- Schedule:
  - timezone and daylight-boundary cases;
  - idempotent cron replay;
  - late human contribution behavior;
  - no endless advisor loop.
- Email:
  - invite, pack release, reminder, and deadline templates;
  - link expiry and resend;
  - delivery/audit status.
- Integration:
  - same pack version for humans and synthetic advisors;
  - human question → selected advisor reply → Chair synthesis;
  - mixed-attendee minutes and actions.
- Regression:
  - full Sprint 1–3 journey with a synthetic-only board;
  - full journey with one human participant.

### Integration with previous sprints

Participants receive Sprint 2 immutable snapshots through the Sprint 3 Board transcript. Sprint 4 extends the transcript; it does not fork it.

### Deployment gate

- Preview migration and RLS review.
- Authorized email QA recipients only.
- One compressed scheduled meeting in preview, followed by one normal-duration dry run.

### Execution evidence — 2026-07-29

- Added additive migration `0004_mixed_async_board.sql` with:
  - immutable board-pack release fields and trigger;
  - scheduled session phases and timezone;
  - session-scoped human and synthetic participants;
  - one immutable mixed contribution stream;
  - RLS for released packs, released contributions, and an author’s own sealed contribution;
  - expiring hashed invitation tokens and audit fields.
- Applied migration `0004` to Supabase project `jzmwrwzrmpjftuirqljc`; remote history is aligned through `0004`.
- Added the founder Board route with:
  - one direct action to prepare a pack from existing Company Brain context;
  - one named board question;
  - one locked pack and source hash;
  - a continuously visible human/synthetic roster;
  - one chronological transcript and one phase-aware composer;
  - human invitation, resend, expiry, and revocation controls.
- Added an authenticated ten-minute phase cron covering:
  - pack review;
  - sealed independent analysis;
  - released peer challenges;
  - sealed revised positions;
  - Chair synthesis;
  - founder decision;
  - minutes closure;
  - phase/deadline email notifications and audit events.
- Made the Board OS Advisor a mandatory Chair seat and normalized structured advisor recommendations before immutable persistence.
- Fixed the existing governance-run handoff so a founder can generate a valid titled and versioned plan after the Sprint 2 schema.
- Added 11 Sprint 4 tests; the cumulative suite is 30 passing tests.
- TypeScript, production build with 89 routes, and diff validation pass.
- Full compressed QA meeting confirmed:
  - one immutable pack and stable Sprint 2 source snapshot;
  - two humans and seven synthetic members, including the Chair;
  - wrong-email invitation acceptance denied;
  - invited human acceptance and session-only access;
  - founder and invited-human contributions in the same transcript;
  - sealed human analysis hidden from the founder until phase release;
  - seven generated peer challenges and seven final positions;
  - one Chair synthesis, one founder decision, one completed meeting, and one durable minutes record;
  - all 26 released contributions retain immutable hashes.
- Invitation delivery used preview mode during QA, so no test invitation email was sent externally.
- Production revocation was exercised against the QA seat, denied further access, and the QA fixture was restored afterward.
- Deployed final preview `dpl_uiLoXr2nuFW327qvrCKxyCxR5q1j`.
- Promoted production deployment `dpl_5tNzUkY9rg1woRHXqo78YcmxJi2c` to `https://www.board-os.ai`.
- Final production checks confirmed authenticated mixed-board rendering, public home 200, protected Board redirect, unauthenticated Board API 401, deployment `Ready`, and no recent 5xx logs.

## Sprint 5 — Strategic Source Document, Creative OS handoff, and production release

**Outcome:** Board OS governs decisions; Creative OS executes from an explicit, versioned handoff.

### Build

- Generate the Strategic Source Document from the selected plan, frozen context, hot-seat transcript, Chair synthesis, direction, risks, KPIs, and open questions.
- Add a versioned, runtime-validated connector envelope.
- Align language-neutral evidence enums, role briefs, and output types.
- Make Creative OS analysis read-only and one-call-per-snapshot.
- Add authenticated health, analyze, explicit company-link, and immutable handoff endpoints.
- Add request ID, idempotency key, input hash, cache, timeout, circuit breaker, provenance, and visible degraded status.
- Keep company link and handoff behind explicit founder actions.
- Rotate the exposed connector credential and separate preview/production keys.

### Sprint 5 tests

- Contract:
  - valid and invalid envelope;
  - enum and schema compatibility;
  - response provenance;
  - backward-compatibility window.
- Security:
  - missing/invalid/stale signature;
  - replay and duplicate idempotency key;
  - secret never appears in logs or payloads.
- Integration:
  - analysis creates no Creative OS company;
  - repeated analysis hash returns cached artifact;
  - explicit company link is idempotent;
  - one handoff version imports once;
  - Creative OS derivative references return to Board OS without overwriting governance memory.
- Resilience:
  - timeout, 4xx, 5xx, schema mismatch, circuit breaker, fallback provenance, and kill switch.
- End-to-end:
  - intake → plan versions → hot seat → Strategic Source Document → Creative OS handoff → recurring mixed board → minutes and commitments.
- Regression:
  - complete Sprint 1–4 suites with the connector off;
  - repeat with preview connector on.

### Integration with previous sprints

The handoff is generated only from Sprint 2 canonical sources and Sprint 3/4 deliberation. Sprint 1 durability rules apply to connector artifacts: no success without an artifact ID and provenance.

### Deployment gate

- Creative OS deploys the backward-compatible contract first.
- Board OS preview enables authenticated analysis with linking off.
- After preview QA, enable explicit linking and handoff.
- Production stays on fallback until keys, logs, health, and rollback are verified.
- Production promotion requires explicit approval.

## Final release acceptance

The product is ready when a founder can:

1. create durable context through one truthful action;
2. consolidate or separate plan versions;
3. confirm the exact question and sources;
4. watch a visible synthetic and human board deliberate;
5. read every released contribution and ask follow-ups;
6. receive a sourced Chair recommendation;
7. record the decision, minutes, owners, and review date;
8. explicitly hand one immutable Strategic Source Document to Creative OS;
9. continue the Chair relationship between meetings;
10. recover cleanly from connector, scheduling, or persistence failure without false success.

## Approval map

Sprint 1 can be completed and tested locally without new authority.

Before later deployment steps:

- Sprint 2: Board OS preview/staging migration authority.
- Sprint 4: approved email recipients and permission to send invitation/reminder tests.
- Sprint 5: restored Vercel project access, connector-key rotation, isolated Creative OS QA company, and preview environment authorization.
- Production: explicit merge/deploy approval after the preview evidence is reviewed.
