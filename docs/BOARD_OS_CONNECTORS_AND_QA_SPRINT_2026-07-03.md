# Board OS Connectors and Production QA Sprint - 2026-07-03

## Sprint Window

Target: Friday morning, 2026-07-03, Sao Paulo time.

Suggested block: 08:30-12:30 BRT.

## Objective

Move Board OS from deterministic production-ready Decision Room to a more realistic client test setup by configuring the missing connectors, reviewing the production QA findings, and deciding what is safe to enable for live client-facing tests.

## Current State Registered

- Production is live at `https://www.board-os.ai`.
- Latest production commit before this plan: `3cc247f` - hide admin navigation for client users.
- Decision Room is deployed and protected.
- Production verifier passes for public pages, protected redirects, legacy route bridges, Decision Room APIs, brand assets, manifest, robots, and sitemap.
- Production QA client exists:
  - User email: `qa.client.202607030110@board-os.ai`
  - Organization: `Board OS QA Client 202607030110`
  - Company: `Norte Foods QA 202607030110`
  - Temporary password and magic-link token are intentionally not recorded in git.
- QA company has seeded Company Brain context and can simulate a new client without touching LANCE or other private client data.
- Production QA created:
  - 7 Company Brain entries
  - 2 board sessions
  - 1 approved decision
  - 3 follow-ups
- All room types opened in production with QA company context:
  - Problem Build
  - Hot Seat
  - Board Prep
  - Strategy Reset
  - Teste de campanha
  - Revisao de decisao
- Hot Seat end-to-end path worked:
  - advisor turns and interventions
  - evidence request
  - synthesis counters
  - session autosave
  - decision approval
  - deliverable queue
  - Decision Memory, Follow-ups, and Outputs pages
- Production still runs `DECISION_ROOM_ADAPTER=mock` or equivalent default, so room turns are deterministic.

## Morning Sprint Sequence

### 08:30-08:50 - Production Baseline

Goal: confirm nothing regressed overnight.

Checklist:

- Pull latest `main`.
- Confirm clean working tree except known local private materials.
- Run `npm run typecheck`.
- Run `npm run qa:decision-room`.
- Run `npm run build`.
- Run `node scripts/verify-production.mjs https://www.board-os.ai`.
- Confirm production QA account still opens `/rooms`.
- Confirm non-admin QA user does not see the Operations/Admin navigation in visible UI.

Exit criteria:

- Production baseline is green.
- Any failed check is classified as code, deploy timing, environment, or account/session issue.

### 08:50-09:30 - Connector Inventory and Environment Audit

Goal: know which connectors are live, missing, or intentionally parked.

Review:

- Vercel production env vars:
  - `AI_PROVIDER`
  - `OPENAI_API_KEY`
  - `AI_MODEL`
  - `DECISION_ROOM_ADAPTER`
  - `DECISION_ROOM_SEED`
  - `ANTHROPIC_API_KEY`
  - future `CREATIVE_OS_URL`
  - future `CREATIVE_OS_API_KEY`
- Supabase production project:
  - Auth users
  - QA organization/company/memberships
  - Company Brain rows
  - board sessions, decisions, follow-ups
- Production auth:
  - Turnstile
  - bootstrap flow
  - non-admin boundaries
- Production AI health:
  - OpenAI health route/script
  - model-purpose routing
  - fallback behavior

Exit criteria:

- Environment gap list is explicit.
- Decide whether production should remain deterministic during business-hours QA or move to live OpenAI.

### 09:30-10:15 - OpenAI Live Decision Room Connector

Goal: test `DECISION_ROOM_ADAPTER=live` safely before production flip.

Steps:

- Confirm local `DECISION_ROOM_ADAPTER=live` readiness with `.env.local` loaded.
- Run AI health check against OpenAI.
- Run local authenticated room test in live mode if practical.
- Inspect language quality:
  - pt-BR accentuation
  - tone fluidity
  - advisor specificity
  - evidence discipline
  - no invented facts
- Decide Vercel production env:
  - keep `mock`
  - switch preview only to `live`
  - switch production to `live`

Exit criteria:

- Clear go/no-go on live adapter.
- If live stays parked, document why.
- If live is enabled, run production QA path again and compare deterministic vs live output.

### 10:15-11:00 - Creative OS Connector Design

Goal: define the real service boundary before building the connector.

Required contract:

- `runStrategyDiagnosis(input)`
- `createBoardBrief(input)`
- `createRoleBriefs(input)`
- `createCampaignPlan(input)`
- `compressRoomOutcome(input)`

Connector options:

- `mock`: current local Board OS capability layer.
- `openai`: Board OS live adapter using OpenAI for advisor turns and decisions.
- `creative_os_http`: future HTTP connector to a Creative OS service.
- `creative_os_claude_workflow`: future Claude-powered handoff when Creative OS output must be generated outside Board OS.

Review decisions:

- Does Creative OS expose an API, a Claude workflow, or a manual intake/export process first?
- Which artifacts should Board OS request:
  - diagnosis
  - board brief
  - role briefings
  - campaign plan
  - sales narrative
  - strategy memo
- What should Board OS store as evidence versus generated output?
- What happens when Creative OS is unavailable?

Exit criteria:

- Adapter interface is frozen enough to implement.
- Env names are confirmed.
- Fallback and timeout behavior are specified.

### 11:00-11:35 - Client UX and Security Review

Goal: review the real-client production path, not only system correctness.

Review items:

- Client-visible sidebar:
  - no admin/ops links for non-admin users
  - no internal tenancy language
- Company switcher:
  - disabled state for one-company users feels intentional
  - visible company name is correct
- First-run path:
  - empty/new company
  - seeded company
  - missing data state
- Decision Room:
  - multiple questions
  - request data
  - bypass missing data
  - advisor support
  - decision capture
  - autosave
- Memory pages:
  - Decision Memory clarity
  - Follow-ups ownership and due dates
  - Outputs artifact names
- Admin route:
  - non-admin gets no useful operational data
  - consider redirecting non-admin users away from `/admin` instead of rendering the shell with `Forbidden`

Exit criteria:

- UX defects are ranked P0/P1/P2.
- Any security-boundary issue becomes same-day fix.

### 11:35-12:05 - Language and Advisor Quality Review

Goal: make the experience feel more natural and senior in Brazilian Portuguese.

Review:

- Accentuation in generated and seeded text.
- "Muito duro / stark" phrasing.
- Repetitive advisor construction.
- English terms that should remain product terms versus translated terms.
- Advisor roster:
  - keep core board roles
  - add CMO and category experts with different backgrounds
  - avoid making red team a default client-facing character unless useful
- Evidence language:
  - make missing data requests feel helpful, not punitive
  - allow bypass while clearly marking risk

Exit criteria:

- Create a short pt-BR style rubric for Decision Room text.
- Decide which seeded content needs normalization.
- Decide whether to add CMO/category expert variants to the agent roster.

### 12:05-12:30 - Register, Ship, and Handoff

Goal: leave the system ready for the next execution block.

Checklist:

- Update sprint doc with actual outcomes.
- Update `docs/SHADOW_BOARD_MEMORY.md`.
- Commit code/doc changes.
- Push to `main` only if production-safe.
- Re-run production verifier after push.
- Record:
  - what is live
  - what remains mocked
  - what requires user/business input
  - what should be cleaned from production QA data later

Exit criteria:

- There is no ambiguous connector state.
- The next Codex session can continue without reconstructing context.

## Production QA Items To Recheck

P1:

- Confirm client users no longer see Operations/Admin nav after Vercel deployment fully settles.
- Decide whether `/admin` should redirect non-admin users instead of rendering a forbidden admin shell.
- Confirm production `DECISION_ROOM_ADAPTER` intentionally remains mock or move it to live.
- Confirm live OpenAI adapter quality before any paid/live client session.

P2:

- Add a repeatable production QA script for creating, logging in, and cleaning up QA client workspaces.
- Add a connector health panel for Decision Room mode, Creative OS status, and AI model status.
- Add a visible "deterministic/live" status that is understandable to admins but not distracting to clients.
- Add QA cleanup policy for production test organizations.

P3:

- Improve mobile QA for the new Decision Room surfaces.
- Add screenshot-based QA for the room, memory, and outputs pages.
- Add export/download QA for newly generated Decision Room artifacts.

## Connector Backlog

### OpenAI

Status: configured locally and AI health passed; production mode still deterministic unless Vercel env is changed.

Next:

- Verify Vercel production `AI_PROVIDER=openai`.
- Verify `OPENAI_API_KEY` is present in Vercel.
- Set `DECISION_ROOM_ADAPTER=live` only after live room QA passes.

### Creative OS

Status: not connected as a real external service. Board OS currently uses an internal capability contract and mockable outputs.

Next:

- Decide first connector shape:
  - HTTP API
  - Claude workflow
  - manual artifact intake
- Add env vars:
  - `CREATIVE_OS_URL`
  - `CREATIVE_OS_API_KEY`
  - optional `CREATIVE_OS_MODE`
- Implement adapter with timeout, fallback, and provenance capture.

### Supabase

Status: production records created and verified for QA user.

Next:

- Add QA data cleanup script.
- Decide whether production QA data should remain for regression tests or be archived after each run.

### Vercel

Status: GitHub push deploys production. Vercel CLI is not installed locally.

Next:

- Confirm access to Vercel env management before connector changes.
- Record production env values without exposing secrets.

## Known Constraints

- Do not commit `lance_review_work/`; it contains private source/transcript material.
- Do not record temporary QA passwords or magic-link tokens in git.
- Do not connect Creative OS by copying Creative OS project secrets into Board OS unless the service boundary is deliberately approved.
- Do not use LANCE as the only proof path; keep QA client path generic.

## Morning Definition Of Done

The morning sprint is done when:

- Connector status is explicit.
- Production QA user path has been rechecked.
- OpenAI live adapter has a go/no-go decision.
- Creative OS connector contract has a concrete implementation path.
- Client UX/security review items are ranked.
- Language/advisor quality review has a written rubric or backlog.
- Docs and memory are updated.
