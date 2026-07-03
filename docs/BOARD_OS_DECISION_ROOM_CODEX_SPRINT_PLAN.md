# Board OS Decision Room - Codex Sprint Plan

Last updated: 2026-07-02

This plan updates the existing Board Governance OS production path with the Dreamboard and Creative OS learnings.

The current product backbone remains valid:

Company Brain -> Governance Run -> Board Pack -> Shadow Board Review -> Board Meeting Session -> Decision Memory -> Follow-ups -> Founder Dashboard.

The change is the experience model:

Board OS should now feel like a briefed decision room with synthetic hot-seat sessions, not only a governance pipeline.

## Operating Principle

Do not merge Creative OS into Board OS.

Board OS should consume Creative OS-style capabilities through stable contracts:

- Strategy Core output
- Brief Engine output
- Campaign Planner output

During early sprints these can be mocked locally. Later they can call a separate Creative OS service, Claude workflow, or API.

## Sprint A - Product Contract And Route Map

Objective:

Define the new Board OS decision-room contract before implementing UI.

Deliverables:

- Update product language from "Board Governance OS" toward "Board OS Decision Room" while preserving governance guardrails.
- Define route map for:
  - `/dashboard`
  - `/company-brain`
  - `/diagnosis`
  - `/briefings`
  - `/rooms`
  - `/rooms/[id]`
  - `/outputs`
  - `/decisions`
  - `/follow-ups`
- Define session types:
  - Problem Build
  - Hot Seat
  - Board Prep
  - Strategy Reset
  - Campaign Pressure-Test
  - Decision Review
- Define empty states for a first-time founder.

Acceptance criteria:

- Existing app still loads.
- Navigation model is documented.
- No production dependency on Creative OS repo.

## Sprint B - Shared Types And Mock Service Contracts

Objective:

Create stable schemas for Strategy Core, Brief Engine, Campaign Planner, board agents, sessions, and outputs.

Deliverables:

- `lib/decision-room/types.ts`
- `lib/decision-room/mock-data.ts`
- `lib/decision-room/contracts.ts`
- Types for:
  - `StrategyDiagnosis`
  - `BoardBrief`
  - `RoleBrief`
  - `DecisionRoomSession`
  - `BoardAgent`
  - `BoardContribution`
  - `RoomSynthesis`
  - `DecisionRecord`
  - `ExecutionOutput`
- Mock LANCE-style example data based on existing seeded case.

Acceptance criteria:

- TypeScript compiles.
- Mock service returns deterministic example data.
- Later API integration can replace mocks without changing UI components.

## Sprint C - App Shell And Navigation Refresh

Objective:

Implement the revised product navigation without rebuilding every screen.

Deliverables:

- Authenticated app shell if not already present.
- Sidebar/top navigation using the new IA.
- Product naming and copy cleanup.
- Locale-ready route labels.
- Placeholder screens for new areas.

Acceptance criteria:

- Desktop navigation works.
- Mobile navigation has a clear collapsed state.
- Existing public home remains accessible.
- i18n pattern is respected.

## Sprint D - Founder Dashboard V1

Objective:

Create the home base for recurring use.

Deliverables:

- Active decision rooms panel.
- Open decisions panel.
- Follow-ups panel.
- Unresolved assumptions panel.
- Recommended next session module.
- Company context completeness indicator.

Acceptance criteria:

- Dashboard communicates the operating cadence.
- Founder can start a new session from the dashboard.
- Empty states guide first use without marketing copy overload.

## Sprint E - Diagnosis Screen

Objective:

Expose Strategy Core output as a decision-prep screen.

Deliverables:

- Stated problem.
- Inferred problem.
- Strategic tension.
- Problem-frame options.
- Evidence map.
- Recommended board question.
- Missing context.
- Confidence / risk indicator.

Acceptance criteria:

- User can understand the real problem before entering the room.
- Evidence is visually connected to diagnosis claims.
- User can approve, challenge, or edit the board question.

## Sprint F - Briefings Screen

Objective:

Make agent preparation visible and credible.

Deliverables:

- Board brief view.
- Role brief cards for Strategic Board agents.
- Each role shows:
  - role
  - angle
  - evidence used
  - questions to pressure-test
  - likely objection
- Ability to regenerate or edit a briefing.

Acceptance criteria:

- It is clear agents are not speaking from blank personas.
- Founder can inspect what the room will use before starting.
- Briefings can be exported or included in outputs.

## Sprint G - Decision Room V1

Objective:

Build the synthetic hot-seat room experience.

Deliverables:

- Session header with question, type, status.
- Structured discussion thread.
- Agent contribution cards.
- Live synthesis side panel:
  - agreements
  - disagreements
  - risks
  - open questions
  - decision candidates
- Controls:
  - challenge harder
  - ask for evidence
  - isolate disagreement
  - invite another role
  - move to decision
  - defer

Acceptance criteria:

- The room feels like structured executive pressure, not generic chat.
- Agent contributions remain role-specific.
- Founder can move from discussion to decision.

## Sprint H - Decision Capture And Memory

Objective:

Turn room output into durable governance memory.

Deliverables:

- Decision capture form.
- Fields:
  - decision
  - rationale
  - trade-offs
  - rejected options
  - confidence
  - risk level
  - owner
  - review date
  - dependencies
  - conditions
  - linked evidence
- Decision detail page.
- Decision list page.

Acceptance criteria:

- Every session can produce zero, one, or multiple decisions.
- Deferred decisions are tracked separately.
- Decisions link back to session, evidence, and briefings.

## Sprint I - Outputs Studio V1

Objective:

Render Execution Studio artifacts after a session.

Deliverables:

- Output queue from the Decision Room.
- Artifact cards:
  - board memo
  - strategic brief
  - sales brief
  - campaign brief
  - operating plan
  - minutes
- HTML preview for each artifact.
- Basic markdown export.

Acceptance criteria:

- Founder can see what was produced and why.
- Outputs connect back to decisions and source evidence.
- Artifacts are editable before export.

## Sprint J - Follow-Ups And Cadence Refresh

Objective:

Make the system useful after the session.

Deliverables:

- Follow-up creation from decisions.
- Owner, due date, status, dependency, review trigger.
- Dashboard integration.
- Decision review session trigger.

Acceptance criteria:

- Decisions create work.
- Overdue and upcoming follow-ups are visible.
- Founder can launch a Decision Review session from a prior decision.

## Sprint K - Creative OS Capability Adapter

Objective:

Prepare for real Strategy Core / Brief Engine / Campaign Planner integration.

Deliverables:

- Adapter interface:
  - `runStrategyDiagnosis(input)`
  - `createBoardBrief(input)`
  - `createRoleBriefs(input)`
  - `createCampaignPlan(input)`
  - `compressRoomOutcome(input)`
- Mock adapter implementation.
- Optional HTTP adapter scaffold.
- Error/fallback handling.

Acceptance criteria:

- UI calls adapter layer, not direct mock files.
- Creative OS can be integrated later without rewriting screens.
- Adapter failures produce useful recovery states.

## Sprint L - Agent Orchestration V2

Objective:

Move from static mock contributions to generated/chained agent flow.

Deliverables:

- Session stage model:
  - diagnosis review
  - opening positions
  - challenge round
  - conflict map
  - synthesis
  - decision prompt
  - output generation
- Agent turn rules.
- Board Brain orchestration prompt.
- Role-specific contribution prompts.
- Red Team mode.

Acceptance criteria:

- Agents challenge each other, not only the founder.
- Consensus and dissent are explicit.
- Closure recommendation is produced.

## Sprint M - Export And Share Artifacts

Objective:

Make outputs client-ready.

Deliverables:

- PDF export for:
  - board memo
  - decision record
  - strategic brief
  - campaign brief
- HTML share view.
- Export QA checklist update.

Acceptance criteria:

- Export artifacts look board-grade.
- Source and decision links are preserved where appropriate.
- Portuguese, English, and Spanish text does not break layout.

## Sprint N - Admin And QA

Objective:

Make the decision-room system operable.

Deliverables:

- Admin session monitor updates.
- Agent run logs.
- Mock / live adapter status.
- Usage tracking.
- Failure recovery panel.
- QA scripts for core routes.

Acceptance criteria:

- Admin can inspect a session.
- Failed agent/adaptor runs are visible.
- Smoke test covers dashboard, diagnosis, briefings, room, decision, outputs.

## Suggested Delivery Order

Phase 1 - Designable prototype:

- Sprint A
- Sprint B
- Sprint C
- Sprint D
- Sprint E
- Sprint F
- Sprint G

Phase 2 - Decision system:

- Sprint H
- Sprint I
- Sprint J

Phase 3 - Real intelligence integration:

- Sprint K
- Sprint L

Phase 4 - Client-ready operations:

- Sprint M
- Sprint N

## Claude Design Dependency

Before Sprint C visual implementation, use:

`docs/CLAUDE_DESIGN_BOARD_OS_DECISION_ROOM_BRIEF.md`

Claude Design should return:

- revised information architecture
- desktop and mobile screen concepts
- component inventory
- visual tokens
- interaction model for synthetic hot-seat sessions
- export artifact style

Codex can start Sprints A and B before Claude Design returns. Sprints C onward should use Claude Design output as the visual source of truth.
