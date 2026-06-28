# Board Governance OS Sprint Plan

Last updated: 2026-06-26

This is the current production build plan. Sergio may split these into smaller execution slices later, but the architecture should keep this full path in view.

## Sprint 0 - Production Groundwork

Objective: isolate Board Governance OS from Creative OS and prepare the production operating contract.

Deliverables:
- product approvals captured
- local port and project separation rules
- env variable contract
- Vercel, Supabase, Stripe, OpenAI, email, and storage deployment checklist
- secret-safety gitignore rules

## Sprint 1 - Core Domain Model

Objective: define the durable product backbone before wiring screens to real data.

Deliverables:
- TypeScript domain model
- Supabase migration for core entities
- role/membership model
- governance cycle/session/agent/decision/follow-up data model
- billing/export/referral foundations
- RLS helper functions and draft policies

## Sprint 2 - Auth, Users, Admin

Objective: support real organizations and users.

Deliverables:
- auth boundary
- invite flow
- user profiles
- organization membership
- company membership
- admin session panel
- partner/operator role surfaces

## Sprint 3 - i18n Foundation

Objective: ship pt-BR first without trapping the product in one language.

Deliverables:
- pt-BR default
- en/es scaffold
- shared copy keys
- route/content discipline
- no hardcoded production copy in new features

## Sprint 4 - Company Brain Intake

Objective: replace static context with structured company memory.

Deliverables:
- onboarding
- chat intake
- voice-ready intake
- file upload
- company profile
- goals, risks, financials, operating history, team context
- data completeness score

## Sprint 5 - Document Intelligence

Objective: turn uploaded files into usable company memory.

Deliverables:
- PDF, PPTX, XLSX, CSV, DOCX ingestion
- extraction records
- summaries
- source references
- structured memory entries

## Sprint 6 - Governance Run

Objective: produce the first real business plan artifact.

Deliverables:
- diagnosis
- priorities
- KPIs
- workstreams
- owners
- timeline
- assumptions
- risks
- founder review and approval flow

## Sprint 7 - Board Pack And Exports

Objective: package the plan for human and agent review.

Deliverables:
- executive summary
- strategic questions
- risk map
- priority ranking
- meeting agenda
- decision candidates
- HTML, PDF, PPTX, DOCX, XLSX, and CSV export artifacts

## Sprint 8 - Agent Architecture

Objective: make Board Brain and the six advisors real.

Deliverables:
- prompt files
- provider abstraction
- independent advisor reviews
- Board Brain synthesis
- agent memory boundaries

## Sprint 9 - Agent Challenge And Closure

Objective: move agents from opinions to closure.

Deliverables:
- advisor challenge rounds
- conflict map
- consensus map
- unresolved questions
- closure recommendation: commit, commit with conditions, defer, reject, request more data, or escalate

## Sprint 10 - Board Meeting Session

Objective: make a paid session a contained workflow.

Deliverables:
- session start/end
- Board Brain chat
- single-agent deep dives
- founder pushback flow
- minutes
- usage tracking

## Sprint 11 - Decision Memory

Objective: make every meaningful decision reusable.

Deliverables:
- rationale
- tradeoffs
- risk level
- confidence score
- conditions
- owners
- review dates
- dependencies and future impact checks

## Sprint 12 - Follow-ups And Reminders

Objective: ensure decisions turn into action.

Deliverables:
- open follow-ups
- overdue tracking
- reminders
- email notifications
- cadence
- referral/request flow

## Sprint 13 - Billing

Objective: make the product billable.

Deliverables:
- Stripe products
- subscriptions
- session packages
- webhooks
- customer portal
- free diagnostic path
- usage enforcement

## Sprint 14 - Admin Operations

Objective: make the system operable by Sergio/admins.

Deliverables:
- admin dashboard
- session monitor
- user/org tables
- document visibility
- billing state
- agent run logs
- failure recovery tools

## Sprint 15 - Partner/Channel Layer

Objective: support Resenha and future channels without making the product partner-owned.

Deliverables:
- partner attribution
- partner admin view
- client status
- white-label-ready fields
- referral/source tracking

## Sprint 16 - Production Hardening

Objective: make the app safe to ship.

Deliverables:
- audit logs
- rate limits
- file limits
- loading/error/empty states
- access checks
- privacy review
- backup/export strategy

## Sprint 17 - QA And Deployment

Objective: deploy a working production version.

Deliverables:
- Vercel preview
- production deployment
- env verification
- smoke tests
- responsive QA
- launch checklist
