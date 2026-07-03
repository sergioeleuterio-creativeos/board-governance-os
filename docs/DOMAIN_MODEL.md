# Board OS Domain Model

Last updated: 2026-07-02

The durable product object is moving from a governance cycle to a decision room session. The legacy governance-cycle objects still back the current production APIs, but the founder-facing product now stages this flow:

Company Brain -> Diagnosis -> Briefings -> Decision Rooms -> Outputs -> Decision Memory -> Follow-ups.

## Identity And Access

- `user_profiles`: app-level user profile tied to Supabase Auth.
- `organizations`: tenant boundary for billing, users, companies, and partner channels.
- `organization_memberships`: organization roles.
- `companies`: client company being governed.
- `company_memberships`: company-level access.
- `partner_channels`: Resenha or future distribution/white-label/referral channels.

Sprint 2 auth bootstrap:
- Supabase Auth creates the login session.
- `/auth/callback` exchanges the auth code and routes through `/api/auth/bootstrap`.
- `/api/auth/bootstrap` ensures a `user_profiles` row and at least one `organizations` / `organization_memberships` record.
- `BOARD_GOVERNANCE_ADMIN_EMAILS` marks configured users as `is_super_admin`.
- `supabase/migrations/0002_auth_bootstrap.sql` adds the email lookup RPC and profile creation trigger.

Admin surfaces:
- `/admin`: operator control room.
- `/admin/users`: user and membership table.
- `/admin/sessions`: board session monitor.
- `/api/admin/readout`: super-admin operational readout.
- `/api/admin/invites`: invite users through Supabase Auth admin.

## Company Brain

- `uploaded_documents`: original files in Supabase storage.
- `document_extractions`: extracted text, tables, summaries, financials, and memory candidates.
- `company_brain_entries`: persistent facts, goals, risks, financials, decisions, plans, team context, and unresolved questions.
- `governance_inputs`: chat, voice, form, file, and admin-note inputs attached to a governance cycle.

## Diagnosis And Briefings

- `business_plans` remains the nearest durable store for Strategy Core diagnosis during the transition.
- `board_packs` remains the nearest durable store for board briefings and exportable source context.
- The new app contract exposes:
  - `StrategyDiagnosis`
  - `BoardBrief`
  - `RoleBrief`
  - `EvidenceItem`

## Decision Rooms

- `board_sessions` becomes the durable room/session object.
- `agent_reviews` and `agent_conversations` remain available for agent turns, challenge rounds, dissent, and evidence requests.
- Strategic Board agents: Board Brain, CEO, CFO, CMO, CRO, Product/Customer, Category Expert, Red Team.
- Execution Studio agents: Strategy Core, Brief Engine, Campaign Planner, Sales Narrative Builder, Research/Evidence, Memo Writer, Project Manager.
- The new app contract exposes:
  - `SessionType`
  - `BoardTurn`
  - `TurnSynthesis`
  - `DecisionCaptureRequest`

## Legacy Governance Cycle

- `governance_cycles`: the main product object.
- `business_plans`: diagnosis, KPIs, priorities, workstreams, assumptions, and plan quality.
- `board_packs`: executive summary, strategic questions, risk map, priority ranking, agenda, and decision candidates.

## Shadow Board Review

- `board_sessions`: billable/operational review session, including admin and live-facilitated sessions.
- `agent_reviews`: Board Brain and advisor outputs.
- `agent_conversations`: one-to-one advisor challenge rounds and conflict/consensus notes.
- Closure recommendations: commit, commit with conditions, defer, reject, request more data, escalate to human review.

## Meeting And Memory

- `board_meetings`: scheduled or live meeting record.
- `meeting_minutes`: final notes, conflicts, recommendations, and decisions presented.
- `decisions`: approved/rejected/deferred decisions with rationale, risk, confidence, tradeoffs, owners, and review dates.
- `decision_dependencies`: links between decisions.

## Follow-through

- `follow_ups`: actions created from decisions, agents, or Board Brain.
- `reminders`: in-app, email, and calendar reminders.
- `referral_requests`: requests to connect clients to suppliers, partners, or live advisors.

## Billing And Operations

- `subscriptions`: Stripe subscription state.
- `usage_packages`: included and consumed board sessions/deep dives.
- `export_artifacts`: HTML, PDF, PPTX, DOCX, XLSX, and CSV outputs stored in Supabase.
- `audit_events`: operational audit trail.

## Compatibility

The migration still includes `governance_runs` and `persona_reviews` so the current MVP API route can keep working while the app is gradually rewired to the full `governance_cycles` model.

Decision Room API routes added during the migration:
- `/api/decision-room/readout`
- `/api/decision-room/turn`
- `/api/decision-room/intervention`
- `/api/decision-room/decision`
- `/api/decision-room/outputs`
- `/api/decision-room/session`

These routes use `DECISION_ROOM_ADAPTER="mock"` by default for deterministic QA. Set `DECISION_ROOM_ADAPTER="live"` to generate advisor turns, interventions, and decision capture through the AI model router while keeping the same UI contract. Lance remains an explicit non-production seed via `DECISION_ROOM_SEED="lance"`.

The `/api/decision-room/session` route persists in-progress room state to `board_sessions.metadata`, including the client room id, selected question, transcript, requested data, bypassed gaps, output queue, turn index, and decision state. Final decision capture also stores the same room trace on the decision metadata.
