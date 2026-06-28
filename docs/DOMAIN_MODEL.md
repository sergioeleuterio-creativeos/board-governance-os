# Board Governance OS Domain Model

Last updated: 2026-06-26

The durable product object is the governance cycle. Everything else either feeds the cycle, reviews the cycle, decides from the cycle, or follows up after the cycle.

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

## Governance Cycle

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
