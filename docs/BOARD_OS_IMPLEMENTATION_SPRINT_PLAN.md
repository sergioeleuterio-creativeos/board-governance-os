# Board OS Decision Room - Implementation Sprint Plan

Last updated: 2026-07-02

Source of truth:

- `/Users/Sergio/Downloads/Board OS Decision Room (standalone).html`
- `docs/CLAUDE_DESIGN_BOARD_OS_DECISION_ROOM_BRIEF.md`
- `docs/BOARD_OS_DECISION_ROOM_CODEX_SPRINT_PLAN.md`

## Sprint 0 - Source Alignment

Status: complete in this pass.

- Read the Claude Design standalone prototype.
- Preserve the product boundary: Board OS owns rooms, decisions, memory, and follow-up; Creative OS-style capabilities stay behind mockable contracts.
- Keep pt-BR as the first shipped app language while preserving English product names.

## Sprint 1 - Product Contract And IA

Status: complete in this pass.

- Rename the app shell from Board Governance OS to Board OS / Decision Room.
- Move primary navigation to:
  - Painel
  - Company Brain
  - Diagnostico
  - Briefings
  - Salas de Decisao
  - Entregaveis
  - Decision Memory
  - Follow-ups
- Leave legacy routes in place for continuity while new routes take over the founder-facing path.

## Sprint 2 - Stable Schemas And Mock Contracts

Status: complete in this pass.

- Add `lib/decision-room/types.ts`.
- Add `lib/decision-room/mock-data.ts`.
- Add `lib/decision-room/contracts.ts`.
- Mock Strategy Core, Brief Engine, board turns, interventions, outputs, decisions, and follow-ups behind stable data shapes.

## Sprint 3 - Founder-Facing Screen Migration

Status: complete in this pass as V1.

- Replace the dashboard with the Decision Room dashboard.
- Add `/company-brain` with completeness and evidence timeline.
- Add `/diagnosis` with stated vs inferred problem, strategic tension, frames, evidence map, confidence, and board question.
- Add `/briefings` with board brief and 8 role briefs.
- Add `/rooms` and `/rooms/[id]` with session picker, Hot Seat room, three-column layout, turn reveal, synthesis, interventions, output queue, and decision modal.
- Add `/outputs` with Execution Studio and artifacts.
- Refresh `/decisions` and `/follow-ups` around Decision Memory and cadence.

## Sprint 4 - Verification

Status: complete for compile/build checks; authenticated visual QA still requires a logged-in browser session.

- Run `npm run typecheck`.
- Run `npm run build`.
- Start local dev server.
- Browser-check `/dashboard`, `/diagnosis`, `/briefings`, `/rooms`, `/outputs`, `/decisions`, and `/follow-ups` on desktop and mobile widths.

## Sprint 5 - Real Intelligence Adapter

Status: scaffolded in this pass; live service implementation remains next.

- Added protected API routes:
  - `/api/decision-room/readout`
  - `/api/decision-room/turn`
  - `/api/decision-room/intervention`
  - `/api/decision-room/decision`
  - `/api/decision-room/outputs`
- Added adapter selector via `DECISION_ROOM_ADAPTER`.
- The next pass can replace deterministic mocks with live implementations:
  - `runStrategyDiagnosis(input)`
  - `createBoardBrief(input)`
  - `createRoleBriefs(input)`
  - `nextBoardTurn(input)`
  - `requestRoomIntervention(input)`
  - `createExecutionOutputs(input)`
- Added error states for failed turns without losing synthesis.
- Still pending: persist room state, decision records, output queue, and follow-ups to Supabase.

## Sprint 6 - Production Hardening

Status: next.

- Add admin session monitor for rooms and agent runs.
- Add export actions for memo, strategy brief, campaign brief, and decision record.
- Add i18n keys for all new Decision Room screens.
- Add mobile mode rules: mobile can decide/review, desktop creates and edits.
