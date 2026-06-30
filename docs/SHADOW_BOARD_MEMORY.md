# Board Governance OS Project Memory

Last updated: 2026-06-29

This file is the canonical working memory for Board Governance OS development. Before meaningful planning or implementation, read this file first. At the end of each sprint or workday, update it through the `/endday` routine.

## North Star

Board Governance OS helps founder-led companies turn messy business problems into board-level decisions, follow-ups, and institutional memory before they have a real board.

Board Governance OS is not an AI board member, not a virtual CEO, and not a board replacement. It is a governance operating system for better founder decisions.

The product should preserve three things:
- better company memory
- better decision quality
- better follow-through

If a feature does not serve one of those three, it belongs outside the first architecture.

## Naming

Approved direction:
- Board Governance OS is the public product name.
- Shadow Board Review is the internal product module for the agent-review workflow.
- Board OS may remain an internal shorthand only when useful in architecture notes.

Reason:
- BoardOS.ai already exists and is positioned around AI executive advisory for startup founders.
- Board Governance OS is clearer as a product category while still preserving Shadow Board Review as a distinctive module name.

## Positioning

Primary positioning:

Board Governance OS helps founder-led companies turn messy business problems into board-level decisions, follow-ups, and institutional memory before they have a real board.

Resenha-specific framing:

Not a replacement for Dreamboard. The governance operating layer Dreamboard is missing.

## Product Ownership And Distribution

Board Governance OS is owned independently by Sergio.

Resenha may become:
- a distribution partner
- a client source
- a white-label channel later
- a strategic testing ground

Resenha should not define the product architecture. Build partner awareness into the system without hardcoding Resenha-specific assumptions.

## Resenha Context

Resenha connects business owners through networking events, company visits, and Dreamboard advisory sessions.

Dreamboard:
- brings market experts to discuss a client business problem
- is advisory and lightweight
- has limited governance structure
- has limited tech/workflow support
- outputs tips and questions with limited ongoing support

Resenha business pains:
- churn and retention
- clients receive networking value upfront, then lose reason to continue
- need higher-ticket upsell products

Why Board Governance OS fits:
- creates recurring governance cadence
- makes advisory moments compound
- records decisions and follow-ups
- gives Resenha a higher-value recurring product without making Shadow Board dependent on Resenha

## Target Users

Primary users:
- founders and CEOs of small and medium companies
- founder-managed companies with limited professional governance
- businesses that need help deciding what to do, how to do it, and why it matters
- teams that forget decisions, owners, risks, and prior plans

Common user problems:
- "I need to sell more" without understanding the real constraint
- unclear business diagnosis
- no decision memory
- weak follow-up discipline
- decisions are disconnected from previous plans
- everyday tasks bury strategic commitments
- lack of board-level structure before the company can afford a board

## Approved Product Architecture

The durable product object is the governance cycle.

Board Governance OS has six core product systems:

1. Company Brain
   Persistent memory for company facts, goals, financials, risks, team context, uploaded files, past plans, past decisions, and unresolved questions.

2. Governance Run
   Planning engine that turns Company Brain context plus new inputs into a business plan with diagnosis, priorities, KPIs, workstreams, risks, owners, timeline, and assumptions.

3. Board Pack
   Structured artifact for human and agent review. It includes executive summary, strategic questions, risk map, priority ranking, meeting agenda, and decision candidates.

4. Shadow Board Review
   Agent layer. Six advisors plus Board Brain review the same Board Pack, create independent analysis, challenge each other, and contribute to a final synthesis.

5. Board Meeting And Decision Memory
   Decision layer. User approves, rejects, challenges, or deep-dives into recommendations. Closed decisions become durable records.

6. Founder Dashboard And Follow-ups
   Operating cadence layer. It keeps the founder honest after the meeting with open decisions, reminders, overdue follow-ups, risk meters, next meeting, and supplier/referral requests.

## Agent Architecture

Board Brain:
- orchestrator
- distributes Board Packs to advisors
- collects independent analysis
- runs advisor-to-advisor challenge rounds
- identifies conflict, consensus, and blind spots
- produces final recommendation
- writes minutes
- updates memory
- owns canonical synthesis

Each advisor should have its own memory. The Board Brain owns the canonical memory and synthesis.

Advisors:

Finance Advisor:
- focus: cash, ROI, capital efficiency, pricing, margins, investment
- needs: revenue model, financial data, cost structure, unit economics, runway, sensitivity assumptions

Operator Advisor:
- focus: execution, process, accountability, cadence
- needs: org structure, workflows, current priorities, capacity, dependencies, accountability model

Growth Advisor:
- focus: sales, market, expansion, revenue quality
- needs: customer segments, pipeline, conversion data, offer, pricing, CAC/payback if available

Risk Advisor:
- focus: governance, concentration, downside, compliance
- needs: legal/regulatory context, customer concentration, supplier dependencies, cash exposure, founder dependencies

Customer Advisor:
- focus: brand, retention, demand, customer behavior
- needs: customer feedback, churn reasons, NPS/comments, sales objections, positioning

Talent Advisor:
- focus: leadership, hiring, incentives, team capacity
- needs: team structure, key people risks, hiring plans, compensation constraints, founder bottlenecks

Future governance training:
- digest IBGC materials into governance rubrics
- prioritize Board Brain and Risk Advisor first

## Core Data Model

Planned backbone entities:
- organizations
- companies
- company_brain_entries
- uploaded_documents
- document_extractions
- governance_cycles
- governance_inputs
- business_plans
- board_packs
- agent_reviews
- agent_conversations
- board_meetings
- meeting_minutes
- decisions
- decision_dependencies
- follow_ups
- reminders
- referral_requests
- subscriptions
- usage_packages
- partner_channels

## Technical Architecture

Base stack:
- Next.js app router
- Supabase auth, database, storage, and RLS
- Stripe billing
- i18n from day one: pt-BR production first, English and Spanish scaffolded continuously
- AI provider abstraction with OpenAI as approved production provider; Anthropic may remain optional/reference
- file ingestion for PDF, PPT, XLS, CSV, and DOCX
- Resend / Google for email and notification delivery
- Vercel deployment
- Supabase storage for uploaded files and generated exports

Important boundary:
- Use Creative OS as base/reference where useful.
- Do not let Board Governance OS changes affect Creative OS.
- Keep Board Governance OS prompts, memory, schemas, billing, and agent configuration separate.
- Run Board Governance OS on a separate local port, currently `3001`, when Creative OS is also running.

## Billing Architecture

The billable unit should be a Board Governance Session, not generic credits.

Subscription should cover:
- memory
- dashboard
- file storage
- reminders
- operating cadence
- baseline access

Usage packages should cover:
- number of virtual board sessions
- extra board reviews
- single-agent deep dives if needed

Future pricing model:
- free diagnostic
- monthly board cycle
- fortnightly board cycle
- quarterly board cycle
- extra session packs
- live facilitated board add-ons
- partner/white-label plans

Live add-ons:
- semiannual facilitated live meeting
- annual facilitated live meeting
- not self-serve
- facilitated by Board Governance OS with real C-level executives from the market

## UI And UX Direction

Approved design exploration brief lives at:
- `docs/CLAUDE_DESIGN_PROMPT.md`

Claude Design source received:
- `/Users/Sergio/Downloads/Shadow Board (standalone).html`

Working visual hypotheses:
- Shadow Room: premium, confidential, strategic
- Decision Cockpit: operational, dense, useful for repeated use
- Governance Dossier: document-first, export-ready, institutional memory

Likely product direction:
- use Shadow Room for brand presence and strategic moments
- use Decision Cockpit for day-to-day product surfaces
- use Governance Dossier for Board Packs, minutes, and exports

Implemented visual system:
- persistent dark left rail for desktop navigation
- mobile bottom tab bar
- topbar with company switcher, global search, and Board Brain status
- document-first Board Pack and Decision Memory surfaces
- dark chamber treatment for Shadow Board Review
- mobile principle: mobile is for decisions, not heavy authoring

## Current Repo State

Current root app:
- Next.js app named `board-governance-os` in `package.json`
- Claude Design wireframe converted into native Next.js routes and reusable components
- public `/dashboard`
- `/company`
- `/governance-run`
- `/board-pack`
- `/shadow-board`
- `/decisions`
- `/follow-ups`
- `/design-system`
- `/mobile`
- protected `/admin`
- protected `/admin/users`
- protected `/admin/sessions`
- protected `/admin/documents`
- protected `/admin/agents`
- auth/login remains in repo
- Supabase schema
- mock AI provider available

Important implementation files:
- `components/Navigation.tsx`
- `components/shadow-board/ui.tsx`
- `components/shadow-board/Screens.tsx`
- `lib/shadow-board/demo-data.ts`
- `lib/shadow-board/bootstrap.ts`
- `lib/shadow-board/domain.ts`
- `lib/shadow-board/product.ts`
- `components/shadow-board/AdminScreens.tsx`
- `app/globals.css`
- `tailwind.config.ts`
- `middleware.ts`
- `lib/board/advisor-rubrics.ts`
- `lib/email/send.ts`
- `lib/rate-limit.ts`

Technical notes:
- `tsconfig.json` excludes `Casa OS` so Board Governance OS checks do not fail on the nested reference app.
- Stripe enforcement is intentionally parked until Sergio finishes Stripe account/product setup.
- `CRON_SECRET` is configured and deployed for the daily reminder route.

## Approved Production Decisions

- Public product name: Board Governance OS.
- Agent-review module name: Shadow Board Review.
- First production language: pt-BR.
- i18n discipline: consider English and Spanish scaffolding at all times; avoid hardcoded production copy after the i18n sprint.
- MVP scope: Company Brain, Governance Run, Board Pack, Shadow Board Review, Decision Memory, Follow-ups, auth, billing, intake, admin session, user tables, and exports.
- Intake must include chat and voice-ready surfaces.
- Exports must include PDF, PPTX, DOCX/HTML where useful, and XLSX/CSV for tables.
- Billing direction: free diagnostic, subscriptions, and paid Board Governance Sessions / usage packages.
- Agents should suggest closure, not just analysis. Closure options: commit, commit with conditions, defer, reject, request more data, or escalate to human/live review.
- Supabase project must be separate from Creative OS.
- Stripe products, prices, and webhooks must be separate from Creative OS.
- Approved AI provider: OpenAI.
- Approved deployment: Vercel.
- Approved URL posture: subdomain-based deployment.
- Approved email providers: Resend and/or Google.
- Approved file storage: Supabase storage.
- Current auth stance: password-required login only; magic links are disabled in the product UI.
- Cloudflare Turnstile is prepared behind env vars and should be enabled before production.
- Current Stripe stance: hold billing enforcement and keep pricing/pages ready while Sergio sets up Stripe.
- Email stance: Google Workspace for human mailboxes/calendar identity; Resend for product notifications, reminders, and newsletters.
- Production domain decision: use `board-os.ai` for the app and `mail@board-os.ai` as the product email identity.

Approved advisor names in code:
- Finance Advisor
- Operator Advisor
- Growth Advisor
- Risk Advisor
- Customer Advisor
- Talent Advisor

## Open Decisions

- Decide detailed Stripe package names, prices, quotas, and annual/monthly discount.
- Decide how long a paid Shadow Board Session remains open.
- Decide limits for single-agent deep dives within one session.
- Decide whether Resenha gets a partner dashboard in v1 or later.
- Decide the first document ingestion depth for PDF/PPT/XLS/DOCX.
- Decide exact production subdomain once domain ownership is confirmed.
- Decide whether first voice intake uses browser speech-to-text, uploaded audio transcription, or both.
- Decide whether Google email is only SMTP/calendar support or a full Google Workspace integration.

## Pending Items

- Rename remaining code, metadata, and UI labels from Shadow Board/Board OS to Board Governance OS where appropriate.
- Continue migrating older demo screens into the i18n catalog.
- Define Stripe products and usage package model.
- Add real browser speech-to-text or audio transcription for voice intake once voice approach is selected.
- Finish replacing remaining static seed/demo readouts with Supabase-backed LANCE/client state.
- Add route-level empty, loading, and error states.
- Add responsive QA pass for all product routes, not only core wireframe screens.
- Add export artifacts for PPTX, DOCX, XLSX, and richer PDF beyond the current HTML/CSV/PDF-ready surface.
- Add production Vercel/Supabase/Stripe/OpenAI/Resend environment verification.

## Backlog

- Partner channel architecture.
- White-label settings.
- Resenha-specific test case templates.
- Supplier marketplace or vetted referral hub v2.
- PPT export.
- DOCX export.
- XLSX export.
- Admin partner/operator support view.
- External dependency: create the separate Board Governance OS Supabase project.
- External dependency: add the Board Governance OS Supabase URL, anon key, and service role key to `.env.local` and Vercel.
- External dependency: provide/set the first `BOARD_GOVERNANCE_ADMIN_EMAILS` value.
- External dependency: apply and live-test migrations `0001` and `0002` in the dedicated Supabase project.
- External dependency: confirm first real admin login, workspace bootstrap, `/admin` access, and `/api/admin/invites`.
- External dependency: configure Stripe products, prices, webhooks, and billing enforcement.
- External dependency: choose first voice/transcription implementation path.

## Bugs

- No active production-blocking bugs logged after the password reset callback fix.

## Production Sprint Plan

Sprint 0 - Production Groundwork:
- isolate Board Governance OS from Creative OS
- document environment boundaries, ports, deployment path, and approvals
- protect secrets from commits
- prepare Vercel, Supabase, Stripe, OpenAI, email, and storage env contract

Sprint 1 - Core Domain Model:
- define typed product entities
- create Supabase migration for organizations, user profiles, companies, governance cycles, sessions, plans, board packs, reviews, decisions, follow-ups, billing, exports, referrals, and partner channels
- draft RLS around organization and company membership

Sprint 2 - Auth, Users, Admin:
- make it a real multi-user product with roles, invitations, organization membership, company membership, and admin session panel

Sprint 3 - i18n Foundation:
- set pt-BR as production language and scaffold English/Spanish with message catalogs and route/content discipline

Sprint 4 - Company Brain Intake:
- build onboarding, chat intake, voice-ready intake, file upload, profile, facts, goals, risks, financials, team context, and completeness scoring

Sprint 5 - Document Intelligence:
- process PDF, PPTX, XLSX, CSV, DOCX and extract facts, summaries, source references, and structured memory entries

Sprint 6 - Governance Run:
- generate diagnosis, business plan, KPIs, priorities, workstreams, owners, timeline, risks, assumptions, and founder approval flow

Sprint 7 - Board Pack And Exports:
- create Board Pack artifact and export to HTML presentation, PDF, PPTX, DOCX, XLSX, and CSV where appropriate

Sprint 8 - Agent Architecture:
- create Board Brain, six advisor prompts, provider abstraction, independent reviews, and memory boundaries

Sprint 9 - Agent Challenge And Closure:
- run advisor challenge rounds, conflict maps, consensus maps, unresolved questions, and closure recommendation

Sprint 10 - Board Meeting Session:
- create paid session workflow, session start/end, Board Brain chat, single-agent deep dives, pushback flow, minutes, and usage tracking

Sprint 11 - Decision Memory:
- persist decisions with rationale, tradeoffs, confidence, risk level, dependencies, owners, review actions, and future impact checks

Sprint 12 - Follow-ups And Reminders:
- add dashboard follow-ups, overdue tracking, email notifications, cadence, and referral/request flow

Sprint 13 - Billing:
- implement Stripe products, subscriptions, session packages, webhooks, customer portal, usage enforcement, and free diagnostic path

Sprint 14 - Admin Operations:
- build admin dashboard for sessions, users, orgs, documents, billing state, agent logs, and recovery tools

Sprint 15 - Partner/Channel Layer:
- add partner attribution, partner admin view, client status, white-label-ready fields, and referral/source tracking

Sprint 16 - Production Hardening:
- add audit logs, rate limits, file limits, error/loading states, privacy review, backup/export strategy, and access checks

Sprint 17 - QA And Deployment:
- deploy preview and production on Vercel, run responsive QA, smoke tests, env verification, and launch checklist

## Sprint Log

### 2026-06-26

- Approved first durable product architecture.
- Confirmed Shadow Board as likely customer-facing name.
- Reframed the product around the governance cycle.
- Defined six core systems.
- Defined Board Brain and six advisor roles.
- Clarified Resenha as distribution partner, not product owner.
- Created project memory and daily routine files.
- Received Claude Design standalone HTML wireframe and design system.
- Converted the design into native Next.js product routes instead of embedding the standalone HTML.
- Added reusable Shadow Board UI primitives and demo data.
- Rebuilt the app shell with desktop left rail, topbar, and mobile bottom tabs.
- Implemented the first coded versions of Dashboard, Company Brain, Governance Run, Board Pack, Shadow Board Review, Decision Memory, Follow-ups, Design System, and Mobile Behavior routes.
- Updated Tailwind tokens and global CSS to match the Claude Design system.
- Made MVP wireframe routes public in middleware for immediate preview.
- Added `Casa OS` to `tsconfig.json` exclusions to keep Shadow Board checks scoped.
- Verified `npm run build` and `npm run typecheck` pass after the design-system implementation.

Files changed or added in this sprint:
- `app/page.tsx`
- `app/layout.tsx`
- `app/dashboard/page.tsx`
- `app/company/page.tsx`
- `app/governance-run/page.tsx`
- `app/board-pack/page.tsx`
- `app/shadow-board/page.tsx`
- `app/decisions/page.tsx`
- `app/follow-ups/page.tsx`
- `app/design-system/page.tsx`
- `app/mobile/page.tsx`
- `app/look-feel/page.tsx`
- `components/Navigation.tsx`
- `components/shadow-board/ui.tsx`
- `components/shadow-board/Screens.tsx`
- `lib/shadow-board/demo-data.ts`
- `app/globals.css`
- `tailwind.config.ts`
- `middleware.ts`
- `tsconfig.json`

Suggested next-day plan:
- Convert static demo objects into a typed governance cycle domain model.
- Add i18n keys for the new surfaces.
- Start the Company Brain intake and document upload flow.
- Define the first Supabase migrations for governance cycles, board packs, agent reviews, decisions, and follow-ups.

Sprint 0/1 implementation completed:
- Updated public product naming to Board Governance OS while preserving Shadow Board Review as the agent-review module.
- Added production approvals and the full 18-sprint production plan to memory.
- Added `docs/PRODUCTION_FOUNDATION.md`, `docs/SPRINT_PLAN.md`, and `docs/DOMAIN_MODEL.md`.
- Renamed package identity from `board-os` to `board-governance-os`.
- Added `npm run dev:shadow` and `npm run dev:prod-port` for local port `3001` isolation from Creative OS.
- Hardened `.gitignore` so `.env.*` files, including `.env.local.txt`, are not committed.
- Expanded `.env.local.example` into the production env contract for Supabase, Stripe, OpenAI, Vercel, Resend/Google, storage, admin, and usage limits.
- Added central product constants in `lib/shadow-board/product.ts`.
- Updated app metadata, navigation, login branding, and AI prompt language to Board Governance OS.
- Added typed domain model in `lib/shadow-board/domain.ts`.
- Updated `lib/board/types.ts` to use approved advisor names and keys from the domain model.
- Updated mock AI output to use the approved `risk` advisor key.
- Added Supabase migration `supabase/migrations/0001_board_governance_os_foundation.sql`.
- Migration includes users, organizations, memberships, companies, company memberships, partner channels, documents, extractions, company brain entries, governance cycles, inputs, business plans, board packs, board sessions, agent reviews, agent conversations, board meetings, meeting minutes, decisions, dependencies, follow-ups, reminders, referrals, exports, subscriptions, usage packages, audit events, and temporary compatibility tables.
- Migration includes RLS helper functions and draft policies based on organization/company membership.
- Migration includes private Supabase storage buckets for `company-documents` and `board-exports`.
- Legacy `supabase-board-os-schema.sql` now points to the new migration.
- Verified `npm run typecheck` passes.

Updated next-day plan:
- Apply/review the foundation migration in a separate Board Governance OS Supabase project.
- Build the auth/profile/org bootstrap flow on top of the new user and membership tables.
- Start Sprint 2: auth, users, admin, invites, organization membership, company membership, and admin session surface.
- Keep Sprint 3 i18n discipline in view while building Sprint 2.

Sprint 2 implementation completed:
- Added auth bootstrap route `app/api/auth/bootstrap/route.ts`.
- Updated `app/auth/callback/route.ts` so successful login runs workspace bootstrap before entering the product.
- Added `lib/shadow-board/bootstrap.ts` to ensure `user_profiles`, default `organizations`, and `organization_memberships`.
- Added `BOARD_GOVERNANCE_ADMIN_EMAILS` support for `is_super_admin`.
- Updated `lib/auth-server.ts` with `getSessionUser`, `requireSuperAdmin`, `requireOrganizationAdmin`, and `requireCompanyAdmin`.
- Kept `requireAdmin` as a compatibility alias for super-admin-only routes.
- Updated `hooks/useAuth.ts` to use `is_super_admin`.
- Added migration `supabase/migrations/0002_auth_bootstrap.sql`.
- Migration adds `check_user_email_exists(check_email text)` for the login-method API.
- Migration adds an auth trigger that creates or updates `user_profiles` when Supabase Auth users are created.
- Added admin operations screens for `/admin`, `/admin/users`, and `/admin/sessions`.
- Added admin API endpoints `/api/admin/readout` and `/api/admin/invites`.
- Added Operations navigation links for admin control, users, and sessions.
- Updated auth copy in pt/en/es from Board OS to Board Governance OS.
- Updated `docs/DOMAIN_MODEL.md` with auth bootstrap and admin surface notes.
- Verified `npm run typecheck` passes.

Updated next recommended plan:
- Proceed with Sprint 3 i18n foundation locally.
- Proceed with Sprint 4 Company Brain intake screens, schemas, validation, and mock/local adapters.
- Leave Sprint 2 live Supabase verification in backlog until credentials/project access are available.

Sprint 3 local implementation completed:
- Switched canonical app locale to `pt-BR` with `en` and `es` scaffolds.
- Added `i18n/settings.ts` for shared locale metadata and legacy `pt` normalization.
- Added `messages/pt-BR.json` and expanded `messages/en.json` and `messages/es.json`.
- Converted navigation groups/items, mobile tabs, shell search, Board Brain status, and login copy to message keys.
- Added Company Brain intake message keys across pt-BR/en/es.
- Added `docs/I18N_FOUNDATION.md` with copy rules and current coverage.
- Verified `npm run typecheck` passes.

Sprint 4 local implementation completed:
- Added Company Brain intake domain and scoring in `lib/shadow-board/intake.ts`.
- Added local mock API contract at `app/api/company-brain/intake/route.ts`.
- Added `/company/intake` route and `components/shadow-board/CompanyBrainIntake.tsx`.
- Added intake UI for company profile, strategy, finance, team, chat notes, voice-ready transcript notes, file queue, review payload, and quality score.
- Added local file queue state without Supabase storage dependency.
- Added memory candidate generation for later `company_brain_entries` persistence.
- Added `docs/COMPANY_BRAIN_INTAKE.md`.
- Linked Company Brain page and navigation to `/company/intake`.
- Made `/api/company-brain/intake` public while it is local mock-only.
- Verified `npm run typecheck` passes.
- Verified `HEAD /company/intake` returns `200 OK` on local dev server.
- Verified `HEAD /api/company-brain/intake` returns `200 OK` on local dev server.

Updated next recommended plan:
- Continue Sprint 4 by polishing intake empty/error states and mobile QA.
- Start Sprint 5 local document-intelligence contracts without Supabase storage, or continue Sprint 3 by migrating the older demo screens into message catalogs.
- Keep live Supabase, real uploads, auth invite verification, and production env verification in backlog until external setup is ready.

Supabase live adapter implementation completed:
- User confirmed the dedicated Supabase project is ready: `jzmwrwzrmpjftuirqljc`.
- Verified `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `BOARD_GOVERNANCE_ADMIN_EMAILS` present without exposing values.
- Verified live Supabase table reachability for `organizations`, `user_profiles`, `companies`, `company_brain_entries`, `governance_cycles`, `governance_inputs`, and `uploaded_documents`.
- Verified private storage buckets exist: `company-documents` and `board-exports`.
- Added `lib/shadow-board/intake-persistence.ts`.
- Switched `/api/company-brain/intake` from local mock to authenticated live Supabase persistence.
- Intake saves now ensure the user's workspace, create/update `companies`, create/update a diagnostic `governance_cycles` row, replace same-draft `governance_inputs`, replace same-draft `company_brain_entries`, and record an `audit_events` row.
- The intake UI now shows `Supabase live` and displays saved input/memory counts.
- Removed `/api/company-brain/intake` from public middleware paths so live writes require an authenticated session.
- Updated `docs/COMPANY_BRAIN_INTAKE.md`.
- Verified `npm run typecheck` passes.
- Verified `/company/intake` returns `200` on the local dev server.
- Verified unauthenticated POST to `/api/company-brain/intake` returns `401`.

Updated backlog after Supabase adapter:
- Auth invite/user verification in the live project.
- Login hardening/design backlog: replace magic-link-first behavior with password-required login, prepare the auth surface for Cloudflare checks, and restyle the login page to match the Board Governance OS product shell look and feel.

Live Supabase save verification completed:
- Sergio signed in locally and saved the Company Brain intake.
- Verified live Supabase counts after save: `organizations: 1`, `user_profiles: 1`, `companies: 1`, `governance_cycles: 1`, `governance_inputs: 5`, `company_brain_entries: 5`, `audit_events: 1`.
- Verified the saved company is `Nuveo Logistica`.
- `uploaded_documents` remained `0` before the file-upload adapter, as expected.

Company Brain file-upload adapter implementation completed:
- Added `/api/company-brain/intake/files`.
- Upload route requires `requireCompanyAdmin(company_id)`.
- Upload route accepts PDF, PPTX, XLSX, DOCX, CSV, and TXT using the same MIME contract as the `company-documents` bucket.
- Upload route stores files in `company-documents/{organization_id}/{company_id}/{intake_draft_id}/...`.
- Upload route creates `uploaded_documents` rows, file-mode `governance_inputs`, and `company_brain.document_uploaded` audit events.
- Updated `components/shadow-board/CompanyBrainIntake.tsx` to retain browser `File` objects, upload queued files after structured intake persistence, and mark each file as uploaded or failed.
- Added localized upload status and save-summary messages in pt-BR/en/es.
- Updated `docs/COMPANY_BRAIN_INTAKE.md`.
- Verified `npm run typecheck` passes.
- Verified `/company/intake` returns `200` on the local dev server.
- Verified unauthenticated POST to `/api/company-brain/intake/files` returns `401`.

Updated backlog after file-upload adapter:
- Build upload retry/remove UX.

Autonomous sprint continuation completed on 2026-06-27:
- Verified Sergio's browser upload landed in live Supabase.
- Live upload verification: `uploaded_documents: 1`, latest file `Creative OS campaign planner.pdf`, private storage object exists in `company-documents`, file size `175206` bytes.
- Upgraded Next from `14.2.3` to `15.5.18` to remove high/critical audit findings.
- Removed vulnerable `xlsx` dependency and avoided `exceljs` after audit showed vulnerable transitive dependencies.
- Added document extraction dependencies `pdf-parse`, `mammoth`, and `jszip`.
- Updated `next.config.mjs` to use Next 15 `serverExternalPackages`.
- Updated auth cookie handling for Next 15 async `cookies()`.
- Added `lib/shadow-board/document-intelligence.ts`.
- Added authenticated extraction route `/api/company-brain/documents/extract`.
- Document intelligence supports PDF, DOCX, PPTX, XLSX, CSV, and TXT.
- Processed the live uploaded PDF through the extraction path.
- Live extraction verification: `document_extractions: 3`, `company_brain_entries: 11`, latest document status `processed`, extracted character count `5768`, one document summary promoted into Company Brain memory.
- Rewrote `/api/governance/run` to persist to canonical tables instead of the older compatibility-only shape.
- Governance run route now creates `business_plans`, `board_packs`, `agent_reviews`, `board_sessions`, `decisions`, `follow_ups`, `governance_runs`, and audit events.
- Added Board Pack export route `/api/board-pack/export`.
- Export route supports HTML and CSV into the private `board-exports` bucket and records `export_artifacts`.
- Seeded the first live production-shaped diagnostic governance chain for `Nuveo Logistica`.
- Live governance verification: `business_plans: 1`, `board_packs: 1`, `agent_reviews: 6`, `board_sessions: 1`, `decisions: 1`, `follow_ups: 3`, `governance_runs: 1`, `export_artifacts: 1`.
- Verified the seeded HTML board pack export exists in `board-exports`.
- Verified `npm run typecheck` passes after Next 15 upgrade and new routes.
- Verified `/company/intake` returns `200`.
- Verified unauthenticated calls to `/api/company-brain/documents/extract` and `/api/board-pack/export` return `401`.
- Added `docs/DOCUMENT_INTELLIGENCE.md`.
- Added `docs/GOVERNANCE_PIPELINE.md`.
- Added `docs/PRODUCTION_SETUP_GUIDE.md`.
- Added `docs/IBGC_AGENT_TRAINING.md`.

Updated backlog after autonomous continuation:
- Completed later: UI controls now trigger document extraction from Company Brain and show extraction status.
- Add source relevance controls to exclude unrelated uploaded files from company context.
- Add deeper financial/table extraction for PDFs and spreadsheets.
- Add browser-triggered Governance Run creation from the UI.
- Add founder review/approval flow for business plans, board packs, decision candidates, and follow-ups.
- Add agent challenge rounds in `agent_conversations`.
- Generate meeting minutes from board sessions.
- Completed later: Board Pack exports now support PDF, PPTX, DOCX, XLSX, HTML, and CSV.
- Build upload retry/remove UX.
- Resolve residual moderate npm audit advisory from Next's bundled PostCSS when a patched Next release is available.

### 2026-06-28

Product decisions recorded:
- Domain/app decision: `board-os.ai`.
- Email identity decision: `mail@board-os.ai`.
- GitHub repository provided: `https://github.com/sergioeleuterio-creativeos/board-governance-os.git`.
- Vercel project-name issue: if `board-governance-os` already exists, use project slug `board-os`; the custom domain remains `board-os.ai`.
- Vercel production deployment is live; Sergio confirmed `https://www.board-os.ai/dashboard` works.
- Current domain direction: Sergio will continue with the redirect to `www.board-os.ai`, so production canonical URL is `https://www.board-os.ai`.
- Brand metadata is now wired for deployment: favicon/apple icon use `/brand/mark.png`; Open Graph/Twitter preview use `/brand/site-thumbnail.png`.
- Public URL generation normalizes `https://board-os.ai` to canonical `https://www.board-os.ai` through `lib/shadow-board/site-url.ts`.
- AI model routing decision: keep `AI_PROVIDER`, `AI_MODEL`, and `OPENAI_API_KEY` for now; future `OPENAI_MODEL_*` values should be real model IDs only and are not active until the router is implemented.
- The uploaded Creative OS campaign planner can remain attached for now because this is still a mock/live prototype context.
- Board Pack needs a first-class financial review area: DRE / Profit and Loss, OCF, working capital, cash conversion, debt/liquidity, budget vs actual, and board notes.
- Board Pack also needs a structured report area for each advisor.
- Login must be password-required, prepared for Cloudflare Turnstile, and visually aligned with the product shell.
- Stripe remains on hold for enforcement; keep pages and future Stripe Checkout readiness only.
- Google Workspace should be treated as business email/calendar identity; Resend should be used for product notifications/newsletters.
- IBGC course materials are the most important initial governance-training source for the agents.

Implementation completed:
- Added board financial metrics, DRE/P&L, OCF, working capital, liquidity, variance, and board note layouts to the Board Pack UI.
- Added structured advisor report cards to the Board Pack UI.
- Expanded `/api/governance/run` board pack payloads with `financial_report` and `advisor_reports`.
- Expanded `/api/board-pack/export` HTML/CSV exports to include financial and advisor-report sections.
- Refreshed the seeded live board pack export in Supabase storage with the new financial/advisor layout.
- Replaced the login UI with password-only access.
- Added optional Cloudflare Turnstile widget rendering on login.
- Added `/api/auth/turnstile` for server-side Turnstile verification.
- Updated CSP for Cloudflare Turnstile script, connect, and frame sources.
- Converted the legacy `/api/auth/login-method` compatibility route to always return password.
- Added Turnstile env vars to `.env.local.example`.
- Added `docs/PRODUCTION_SETUP_GUIDE.md`.
- Added `docs/IBGC_AGENT_TRAINING.md`.
- Updated `docs/GOVERNANCE_PIPELINE.md`.
- Added production brand assets under `public/brand/`.
- Added favicon/apple icon, Open Graph, Twitter card, manifest, robots, and sitemap routes.
- Updated local canonical `NEXT_PUBLIC_APP_URL` to `https://www.board-os.ai`.
- Confirmed production now serves canonical `https://www.board-os.ai` metadata, Open Graph/Twitter thumbnail, manifest, robots, sitemap, and public brand thumbnail.
- Replaced the CSS-only sidebar mark with the real `/brand/mark.png` asset.
- Added the real brand mark to the password-only login surface.
- Added `npm run verify:production` for repeatable deployment checks against metadata, manifest, robots, sitemap, login, dashboard, and brand assets.
- Sergio completed Resend domain/API setup, Cloudflare Turnstile widget setup, and Supabase Auth URL/redirect setup.
- Made the navigation user card auth-aware so it uses the signed-in Supabase user/profile instead of the demo `Lucas Mares` placeholder.
- Made the dashboard greeting auth-aware so it uses the signed-in user's first name when available and falls back to neutral copy.
- Sergio moved the old Casa OS files out of this project context; no deletion action is needed from Codex.
- Locked production route access so unauthenticated visitors can only see `/`, `/login`, `/reset-password`, auth callback, metadata, and auth utility endpoints.
- Replaced the root redirect to `/dashboard` with a public product home page.
- Added first-party password reset request flow at `/api/auth/password-reset`.
- Added `/reset-password` so Supabase recovery links land on a password update screen instead of entering the app directly.
- Updated auth callback recovery handling to route recovery sessions to `/reset-password`.
- Improved login network-error handling so low-level auth/Turnstile failures do not surface as raw `Failed to fetch`.
- Updated robots and sitemap so protected app routes are not advertised as public pages.
- Updated production verification script to assert protected-route redirects.

IBGC material inventory:
- Source root: `/Users/Sergio/Documents/Pessoal/Cursos/IBGC`.
- Files inventoried: 109.
- Extracted text-bearing files: 98.
- Extracted text volume: about 3.2M characters.
- Main themes: governance foundations, board role, legal responsibility, advisory council transition, meeting discipline, strategic maturity, audit/risk/capital markets, financial governance, people/succession, decision bias, AI, future board, diversity/culture/sustainability.
- Low/no-text files requiring OCR are recorded in `docs/IBGC_AGENT_TRAINING.md`.

Verification:
- `npm run typecheck` passes.
- `npm run build` passes.
- `node --check scripts/verify-production.mjs` passes.
- Live production checks passed for dashboard metadata, `robots.txt`, `manifest.webmanifest`, and `/brand/site-thumbnail.png`.
- A temporary local production server was started on port `3003` and then stopped after smoke tests.
- Verified `HEAD /login` returns `200`.
- Verified `HEAD /board-pack` returns `200`.
- Verified empty POST to `/api/auth/turnstile` returns `400`.
- Verified locally that `/` returns `200`, `/dashboard` redirects to `/login?next=%2Fdashboard`, `/company/intake` redirects to login, protected APIs return `401`, robots disallows app routes, and sitemap only lists the public home page.
- Verified production after deploy: `npm run verify:production` passes, `/dashboard` returns `307` to `/login?next=%2Fdashboard`, password reset endpoint validates missing email, and Turnstile rejects invalid tokens with `403` instead of missing configuration.
- Password reset still failed in production because the deployed client bundle contains `https://board-os.ai` where the Supabase project URL should be. Fix Vercel env var `NEXT_PUBLIC_SUPABASE_URL` to the dedicated Supabase project URL (`https://jzmwrwzrmpjftuirqljc.supabase.co`) and redeploy before debugging Supabase SMTP/Resend further.
- After Vercel env correction/redeploy, production bundle contains `https://jzmwrwzrmpjftuirqljc.supabase.co`. Password reset endpoint now reaches Supabase Auth. First live reset request hit Supabase's short recovery rate limit; retry after 30 seconds returned `{"success": true}` for Sergio's email.
- User received the reset email, but the recovery link routed to `/login?error=auth_failed`; likely Supabase delivered recovery credentials in the URL fragment, which the server callback cannot read. Updated recovery redirect to land directly on `/reset-password`, and the reset page now handles both `?code=...` and `#access_token=...&refresh_token=...` recovery link formats client-side.
- Deployed recovery-link fix and verified the production reset page bundle includes `exchangeCodeForSession`, `setSession`, and `access_token` handling. Sent a fresh recovery email successfully with `{"success": true}` after deploy.
- User saw `/reset-password` but no recovery session; updated reset page to also handle Supabase `?token_hash=...&type=recovery` links, subscribe to `PASSWORD_RECOVERY`, and wait briefly for Supabase browser session creation before showing the expired/used link state. Production guide now explicitly requires Supabase redirect allowlist entries for `/reset-password`.
- Follow-up: user still saw expired/used after validation. Changed `/reset-password` so `?code=...` and `?token_hash=...` links are immediately handed to `/auth/callback` for server-side cookie setup; the page keeps direct browser handling only for fragment token links. Recovery callback failures now return to `/reset-password?error=auth_failed`.
- Used Supabase Admin API with the local service-role key to set a temporary password for `sergio.eleuterio@gmail.com`; direct Supabase `signInWithPassword` verification succeeded. Do not store the temporary password in repo memory.
- User hit `Current password required when setting new password` on `/reset-password`; added a required `Senha atual ou temporaria` field and send it as Supabase `current_password` when updating the password.

New backlog after 2026-06-28:
- Create OpenAI project/key and add `OPENAI_API_KEY`.
- Configure Google Workspace/Google OAuth only if calendar or Gmail integration becomes necessary.
- Create Stripe account/products/prices later; then implement Checkout, portal, webhook, and usage enforcement.
- Add OCR for scanned/image-heavy IBGC PDFs.
- Build IBGC source retrieval and evaluation rubrics for each advisor.
- Deepen financial statement extraction and normalized board financial tables.
- Build UI triggers for document extraction, governance run creation, founder approval, meeting minutes, and paid session lifecycle.

Known issues:
- Additional local/prod network smoke probes may need to wait if the Codex approval gate reports usage-limit exhaustion.

### 2026-06-29

Autonomous production sprint continuation completed:
- Stabilized and pushed live operations work in small deployable commits:
  - `91a4c4a` - live governance operations
  - `61bfc1a` - live Shadow Board Review and referral request trigger
  - `beb28ce` - pt-BR polish for live screens
  - `fb5aa1c` - admin referral triage
  - `1b320f7` - live Company Brain readout
- Replaced static admin user table with live Supabase admin users page.
- Added `/api/admin/users`, `/api/admin/users/[userId]`, and `/api/admin/users/[userId]/password`.
- Admin users page now supports live user listing, organization/company membership display, status changes, super-admin toggling, invites through the existing invite route, and temporary password generation for recovery.
- Replaced static admin overview with live `/api/admin/readout` data.
- Replaced static admin sessions page with live session monitor and `/api/admin/sessions` routes.
- Admin sessions page can update session status and closure recommendation.
- Added live workspace context API `/api/workspace/current` and shared `useWorkspace()` hook.
- Navigation topbar now uses live company/organization context instead of the `Nuveo Logistica` placeholder.
- Dashboard header now uses the signed-in user/company context in pt-BR.
- Added live dashboard readout route `/api/dashboard/readout`.
- `/dashboard` now shows live risk/confidence metrics, open decisions, overdue follow-ups, cadence, and advisor status from Supabase.
- Added live Decision Memory routes `/api/decisions` and `/api/decisions/[decisionId]`.
- `/decisions` now shows a real decision ledger and lets company admins update decision status.
- Added live Follow-ups routes `/api/follow-ups` and `/api/follow-ups/[followUpId]`.
- `/follow-ups` now shows real follow-ups, overdue/due-this-week/on-track metrics, status updates, and a `Get connected` action.
- Added `/api/referrals` so follow-up supplier/partner connection requests are stored in `referral_requests`.
- Added admin referral triage via `/admin/referrals`, `/api/admin/referrals`, and `/api/admin/referrals/[referralId]`.
- Admin referral queue supports requested, triaging, introduced, closed, and cancelled statuses.
- Added live Governance Run page wired to `/api/governance/run`.
- Governance Run page can trigger Board Brain for the current company and show latest run/business plan/board pack/session readout.
- Added GET support to `/api/governance/run` for latest live run state.
- Added `/api/board-pack/latest` and live `/board-pack` page.
- Board Pack page now renders latest executive summary, strategic questions, financial report payload, risk map, decision candidates, advisor reports, and live HTML/CSV exports.
- Board Pack export route now returns a signed URL when Supabase storage creates the artifact.
- Added live Shadow Board Review page backed by saved `agent_reviews` from the latest board pack.
- Shadow Board Review now shows advisor stances, questions, recommendations, confidence, Board Brain synthesis, and links to decisions/board pack/rerun.
- Added live Company Brain readout route `/api/company-brain/readout`.
- `/company` now shows real Company Brain memory entries, category counts, open questions, and recently uploaded documents.
- Updated pt-BR-first labels across the live production journey while keeping product terms such as Board Brain, Board Pack, and Governance Run.
- Updated pt-BR/en/es navigation messages for the new admin referrals page.
- Added admin referral count to the admin readout table list.
- AI model routing now actively uses `OPENAI_MODEL_BOARD_BRAIN_SYNTHESIS` for governance synthesis when set, falling back to `AI_MODEL`.

Verification:
- `npm run typecheck` passed after each implementation slice.
- `npm run build` passed after live governance operations, live Shadow Board/referrals, pt-BR polish, admin referral triage, and live Company Brain readout.
- `npm run verify:production` passed against `https://www.board-os.ai` after the first production push: public home, login, reset password, protected redirects, brand images, manifest, robots, and sitemap are OK.
- Git pushes to `main` succeeded after each checkpoint, so Vercel should deploy each slice automatically.

Updated sprint status:
- Sprint 2/Auth/Admin: substantially advanced. Live admin users, temporary password recovery, sessions, readout, and referral triage are now implemented.
- Sprint 4/Company Brain: live intake already existed; `/company` now reads live memory and documents.
- Sprint 6/Governance Run: UI trigger and latest run readout are now implemented.
- Sprint 7/Board Pack: live board pack readout and HTML/CSV export UI are now implemented.
- Sprint 8/Shadow Board Review: live saved advisor review room is implemented; true 1:1 challenge rounds remain pending.
- Sprint 11/Decision Memory: live ledger and status updates are implemented.
- Sprint 12/Follow-ups: live tracker and referral request trigger are implemented; reminder notifications remain pending.
- Sprint 14/Admin Operations: live users, sessions, readout, and referrals are implemented; billing/document/agent-log admin depth remains pending.

Backlog after live operations sprint:
- Implement true agent challenge rounds and persist `agent_conversations`.
- Generate board meeting minutes from board sessions and agent conflicts/agreements.
- Add founder approval workflow that converts board-pack decision candidates into approved/rejected/deferred decisions with audit trail.
- Add reminder scheduling and email notifications for follow-ups and review dates.
- Add document relevance controls so unrelated uploads can be excluded from governance context.
- Add Stripe Checkout, customer portal, webhooks, usage packages, and enforcement after Stripe products/prices exist.
- Add admin billing state, document queue visibility, and agent run logs.
- Add Resend operational email notifications for referral requests, reminders, and session status once sender policy is finalized.
- Add deeper OpenAI model routing for intake, document extraction, advisor review, challenge, and final decision once those calls are split.

Known risks:
- Production database must have the full foundation migration, including `referral_requests`, `board-exports`, and canonical governance tables.
- New live pages depend on authenticated Supabase cookies and service-role server routes; if Vercel env variables drift, pages will show API errors.
- Board Pack exports are generated in-app across HTML, PDF, PPTX, DOCX, XLSX, and CSV; visual polish of generated Office/PDF layouts can continue later.
- Governance Run can consume OpenAI credits when the user clicks `Rodar Board Brain`.
- Admin temporary password generation returns the password once in the browser and must be handled as sensitive operational data.

### 2026-06-29 - LANCE research seed and product cleanup

User direction:
- Remove `Design System` and `Mobile` from the left menu.
- User identity should display name/surname instead of email.
- Replace first-seed/Nuveo demo context with LANCE! from lance.com.br and the available marketing/media material.
- Keep i18n/pt-BR polish moving while preserving product terms such as Board Pack, Board Brain, Governance Run, Company Brain, and Shadow Board Review.

Implemented:
- Added `lib/display-name.ts` and wired navigation, dashboard header, and workspace bootstrap to derive a human display name from profile metadata or email local-part.
- Navigation no longer includes Design System or Mobile reference items.
- `/design-system` and `/mobile` now redirect to `/dashboard` so old static mock screens do not leak first-seed content through direct URLs.
- Current-company resolution now prefers the newest active company membership/company, allowing the LANCE seed to become the active workspace company.
- Localized visible English remnants across the live Dashboard, Company Brain, Governance Run, Board Pack, Shadow Board Review, Decision Memory, Follow-ups, and Board Pack HTML export.
- Updated the intake default draft from Nuveo Logistica to LANCE! context.

LANCE source work:
- Used the official LANCE! 2026 media kit PDF:
  `https://lncimg.lance.com.br/uploads/2026/02/Lance-Midia-Kit-2026-.pdf`
- Extracted PDF text locally and used it as the primary source for seeded facts.
- Marketing plan attachment was not found in the local workspace/Downloads search, so the seed is based on official LANCE source material plus Board OS analysis.

LANCE seed:
- Added repeatable script `scripts/seed-lance.mjs`.
- Seeded `LANCE!` as the active company for `sergio.eleuterio@gmail.com`.
- Uploaded the official media kit to Supabase storage and created a processed `uploaded_documents` record.
- Created:
  - 14 Company Brain entries
  - 1 document extraction
  - 1 governance cycle
  - 1 business plan
  - 1 Board Pack
  - 1 board session
  - 7 agent reviews including Board Brain
  - 3 agent conversation summaries
  - 1 board meeting
  - 1 meeting minutes record
  - 3 decision candidates
  - 4 follow-ups
  - 1 compatibility governance run

LANCE governance thesis:
- LANCE! has significant reach and ecosystem breadth; the board-level question is not only audience growth, but converting reach into identifiable, retained, consented first-party audience and higher-quality revenue.
- Key gaps for the next Board Pack: DRE/P&L, OCF, cash/runway, margin by product/format, revenue concentration by advertiser/category, and clear governance for betting, branded content, creators, and data use.
- Recommended closure: `commit_with_conditions` on the LANCE! App/CRM first-party strategy, gated by financial visibility, retention/data KPIs, reputation/data guardrails, and weekly operating cadence.

Verification:
- `node --check scripts/seed-lance.mjs` passed.
- `node scripts/seed-lance.mjs` succeeded against the dedicated Board OS Supabase project.
- Remote Supabase count check confirmed LANCE! data in all expected tables.
- `npm run build` passed.
- `npm run typecheck` passed after build regenerated Next types.
- `npm run verify:production` passed against `https://www.board-os.ai`.

Backlog carried forward:
- Deploy/push this cleanup so Vercel picks up the UI/localization changes.
- Add browser-visible controls for choosing/switching active company instead of relying on newest membership ordering.
- Add true 1:1 agent challenge execution, beyond the seeded conversation summaries.
- Add founder approval workflow that converts candidates to approved/rejected/deferred decisions with audit trail.
- Add reminder scheduling/email notifications.
- Add document relevance controls.
- Add Stripe Checkout, portal, webhooks, usage enforcement, and admin billing views.

### 2026-06-29 - LANCE Creative OS marketing plan ingested

User supplied the missing LANCE marketing plan PDF:
- `/Users/Sergio/Documents/Business/Z&E/Creative OS/Leads/Resenha/Dreamboard/LANCE/LANCE Proposed Marketing Plan_ Creative OS — Brand Strategy & Campaign Operating System.pdf`

Extracted PDF:
- Title: `Creative OS — Brand Strategy & Campaign Operating System`
- Created: 2026-06-25
- Pages: 5
- Extracted text: about 9.2k characters
- Temporary extraction path: `/tmp/lance-creative-os-marketing-plan.txt`

Key strategic additions from the plan:
- LANCE! has real audience reach, but not enough brand attribution among young fans and younger media buyers.
- Core brand problem: the brand is larger in reality than in perception, especially where advertising budgets are allocated.
- Primary audience: Brazilian sports fans aged 18-32 who consume football constantly but do not have a brand relationship with the source.
- Commercial pain: media buyers/coordinators 25-35 often do not carry memory of LANCE! as a category-defining sports brand.
- Strategic direction: penetration.
- Marketing objective: make 18-32 Brazilian sports fans choose LANCE! by name, not stumble into it by algorithm.
- Workstreams: Break-News Habit Loop, Creator and Athlete Voice Layer, Brand Moment Campaign, Physical Availability Audit, Advertising Proposition Rebuild.
- Marketing KPIs:
  - direct/branded search traffic 18-32: +25% in 12 months
  - owned social following, saves, and shares: +40% YoY in 12 months
  - unaided awareness 18-32: 35%+ in 18 months
  - media buyer perception score 25-35: measurable positive shift in 12 months
  - digital ad revenue from brands targeting 18-32: +20% in 12 months
  - match-day impressions attributed to LANCE!-owned channels: top-3 sports publisher on TikTok/Reels by volume in 12 months
  - aggregator/news-feed brand consistency: 95% correct brand name, logo, preview in 6 months

Implemented:
- Updated `scripts/seed-lance.mjs` to ingest two source documents:
  - Official LANCE! Midia Kit 2026
  - LANCE Proposed Marketing Plan - Creative OS
- Reseeded the LANCE! workspace in Supabase with the combined source view.
- Updated Company Brain entries to include brand invisibility, 18-32 source-agnostic consumption, media-buyer salience, marketing workstreams, marketing KPIs, and the risk of becoming a generic news distributor.
- Updated Board Pack diagnosis to frame the board-level challenge as `audience without attribution` plus owned-audience monetization.
- Updated priorities, KPIs, risk map, financial/commercial scorecard, Board Brain synthesis, advisor reviews, decision candidates, meeting minutes, and follow-ups with the Creative OS marketing plan.

Remote Supabase after reseed:
- LANCE! company remains active.
- Uploaded documents: 2
- Document extractions: 2
- Company Brain entries: 22
- Governance cycles: 1
- Business plans: 1
- Board Packs: 1
- Board sessions: 1
- Agent reviews: 7
- Agent conversations: 3
- Board meetings: 1
- Meeting minutes: 1
- Decisions: 4
- Follow-ups: 5
- Compatibility governance runs: 1

Verification:
- `node --check scripts/seed-lance.mjs` passed.
- `node scripts/seed-lance.mjs` succeeded against remote Supabase.
- Remote Supabase count check confirmed the two documents and marketing-plan brain entries.
- `npm run typecheck` passed.
- `npm run build` passed.

### 2026-06-29 - LANCE Creative OS source pack ingested and verified

User supplied four additional LANCE PDFs:
- `LANCE Brand Territories_ Creative OS — Brand Strategy & Campaign Operating System.pdf.pdf`
- `LANCE Intelligence Report_ Creative OS — Brand Strategy & Campaign Operating System.pdf.pdf`
- `LANCE Proposed Brand Foundation_ Creative OS — Brand Strategy & Campaign Operating System.pdf`
- `Pré-Work Lance.pdf`

Credit-light ingestion plan:
- Extract all PDFs locally with deterministic PDF parsing, not OpenAI.
- Store each source as its own `uploaded_documents` row.
- Store one conservative `document_extractions` summary/text row per source.
- Promote only durable governance facts into Company Brain.
- Rebuild Board Pack, business plan, decisions, follow-ups, and compatibility run from the full source pack.

Local extraction completed:
- Brand Territories: 15 pages, about 9k characters.
- Intelligence Report: 8 pages, about 25k characters.
- Brand Foundation: 4 pages, about 5.7k characters.
- Marketing Plan: 5 pages, about 9.2k characters.
- Pre-work: 5 pages, about 6k characters.

Seed script updated:
- `scripts/seed-lance.mjs` now maps the full Creative OS source pack:
  - Marketing Plan
  - Intelligence Report
  - Brand Foundation
  - Brand Territories
  - Pre-work Dreamboard
- The seed now adds source-specific Company Brain entries for:
  - 30-year newsroom memory as moat
  - journalist authority as product
  - AI commoditization of generic sports coverage
  - membership/premium depth test
  - brand promise, JTBD, discriminators, and tone of voice
  - visual brand territory
  - commercial rebuild, Sales Ops, app/newsletter/YouTube goals
- Board Pack now includes journalist-authority, membership, Sales Ops, CMO proposition, and DRE/P&L/OCF questions.
- Decision candidates increased to 5, adding `Ativar jornalistas LANCE! como produtos de autoridade e audiencia`.
- Follow-ups increased to 7, adding journalist activation and membership/premium-depth POC.
- Compatibility governance run now references the full source pack instead of marketing-plan-only language.

Local product updates:
- Company Brain recent documents now have a `Reprocessar` action that calls `/api/company-brain/documents/extract`, refreshes the readout, and reports extracted characters/memory entries.
- Board Pack exports now support HTML, PDF, PPTX, DOCX, XLSX, and CSV from the live export route, with generated artifacts stored in `board-exports` and signed URLs returned to the UI.
- Public homepage and product metadata were localized to pt-BR for the production-first launch language.

Verification:
- `node --check scripts/seed-lance.mjs` passed.
- `node scripts/seed-lance.mjs` succeeded against remote Supabase.
- Remote Supabase count check after reseed:
  - Uploaded documents: 6
  - Document extractions: 6
  - Company Brain entries: 36
  - Governance cycles: 1
  - Governance inputs: 1
  - Business plans: 1
  - Board Packs: 1
  - Board sessions: 1
  - Agent reviews: 7
  - Agent conversations: 3
  - Board meetings: 1
  - Meeting minutes: 1
  - Decisions: 5
  - Follow-ups: 7
  - Compatibility governance runs: 1
- `npm run typecheck` passed.
- `npm run build` passed.

Deployment checkpoint:
- Code commit pushed to `main`: `41ced64` (`Ingest LANCE source pack and expand exports`).
- `npm run verify:production` passed against `https://www.board-os.ai`.
- Production homepage confirmed the new pt-BR copy: `Pensamento de conselho antes de poder bancar um conselho.`

### 2026-06-29 - Access, account creation, guided intake, and founder decision workflow

User asked whether invite members, new-account creation, and chat intake were ready.

Status after implementation:
- Invite route exists and now supports organization membership plus optional company membership.
- Admin users API now supports password-ready account creation through `POST /api/admin/users`.
- Account creation creates the Supabase Auth user, confirms email, writes `user_profiles`, assigns organization membership, optionally assigns company membership, and returns a one-time temporary password in the admin UI.
- Admin users screen now has two separate flows:
  - `Criar conta com senha`
  - `Convidar usuario`
- Admin users readout now includes companies so access can be scoped at company level.
- Company Brain intake now has a guided deterministic Board Brain chat endpoint at `/api/company-brain/intake/chat`.
- Chat intake UI sends founder messages to Board Brain, adds founder messages to the intake draft, and shows Board Brain follow-up questions inline.
- Founder decision workflow now has explicit actions:
  - approve
  - approve with conditions
  - request more data
  - defer
  - reject
- Decision actions update status/closure recommendation, store the latest founder action/note in decision metadata, and write audit events.
- Company Brain document relevance controls now let admins include/exclude uploaded documents from governance context without deleting the source file.
- Excluding a document marks related Company Brain entries inactive; including it reactivates those entries.

Verification:
- `npm run build` passed with 48 app routes, including `/api/company-brain/intake/chat` and `/api/company-brain/documents/[documentId]`.
- `npm run typecheck` passed after Next regenerated `.next/types`.

### 2026-06-29 - Shadow Board challenges, session closure, decision impact, and reminders

User asked to continue sprints autonomously.

Implemented Sprint 9:
- Added `/api/shadow-board/challenges`.
- The route loads the latest Board Pack and advisor reviews for the current company, creates or reuses a board session, generates deterministic advisor-to-advisor challenge rounds, persists them to `agent_conversations`, updates session closure fields, and records an audit event.
- Existing Board Brain deep dives are preserved when challenge rounds regenerate.
- `/api/board-pack/latest` now returns the latest `board_session` and saved `agent_conversations`.
- Shadow Board Review now has a `Gerar desafios` action and a visible `Rodadas de desafio` section with agreement/opposition/neutrality, conflicts, and agreements.

Implemented Sprint 10:
- Added `/api/shadow-board/deep-dive`.
- The route records a Board Brain to advisor deep dive as an `agent_conversations` row, using the advisor's saved review, questions, and recommendations.
- Shadow Board Review advisor cards now include `Aprofundar`.
- Added `/api/shadow-board/session/close`.
- Closing a session creates or updates `board_meetings`, creates or updates `meeting_minutes`, writes decisions/conflicts into minutes, closes the board session, and records an audit event.
- Shadow Board Review now includes `Encerrar sessao`.

Implemented Sprint 11:
- Decision actions now perform a lightweight future-impact/dependency check against the existing decision book.
- Related decisions are persisted into `decision_dependencies` and stored in decision metadata under `future_impact_check`.
- Decision Memory now displays `Dependencias e impacto futuro` in the decision dossier.
- `/api/decisions` now returns decision metadata.

Implemented Sprint 12 foundation:
- Added `/api/follow-ups/[followUpId]/reminder`.
- Follow-up reminders are scheduled into the existing `reminders` table, with audit events.
- `/api/follow-ups` now returns next scheduled reminder metadata.
- Follow-ups screen now shows the next reminder and supports `Agendar lembrete` / `Novo lembrete`.
- Reminder delivery is not active yet; this is scheduling infrastructure only. Email/calendar sending remains backlog until notification policy and provider wiring are finalized.

Verification:
- `npm run typecheck` passed.
- `npm run build` passed with 51 app routes, including:
  - `/api/shadow-board/challenges`
  - `/api/shadow-board/deep-dive`
  - `/api/shadow-board/session/close`
  - `/api/follow-ups/[followUpId]/reminder`

Backlog carried forward:
- Replace deterministic challenge/deep-dive generation with provider-routed OpenAI analysis when ready to spend credits.
- Add paid-session limits for challenge/deep-dive depth once Stripe usage enforcement is active.
- Add email/calendar delivery worker for scheduled reminders.
- Add browser-level QA for the new Shadow Board Review controls after deployment.
- Add richer decision dependency scoring once more real decision history exists.

### 2026-06-29 - AI routing, reminders delivery, billing scaffolding, document financial signals

User asked to continue all implementation that does not need additional input.

Implemented Sprint 8:
- Added shared server-only model router in `lib/board/model-router.ts`.
- Model purposes now exist for:
  - default
  - intake
  - document extraction
  - advisor review
  - governance synthesis
  - agent challenge
  - final decision
- Existing Governance Run AI now uses the shared router while preserving provider/model output.
- Shadow Board challenge rounds now call the routed AI layer with purpose `agent_challenge` when AI is configured.
- Shadow Board challenge route still falls back to deterministic challenge rounds if provider is mock or the model call fails.
- Advisor deep dives now call the routed AI layer with purpose `advisor_review` and deterministic fallback.
- Challenge/deep-dive provider, model, fallback, and error metadata are stored on the board session / audit events.

Implemented Sprint 12:
- Added `/api/cron/reminders`.
- Cron route is protected by `CRON_SECRET` and opened through middleware only for `/api/cron`.
- Due scheduled reminders are delivered through Resend when `RESEND_API_KEY` is configured.
- Sent reminders become `sent`; failed reminders become `failed` with `last_error`.
- Reminder send audit events are recorded.
- `.env.local.example` now includes `CRON_SECRET`.

Implemented Sprint 13:
- Added Stripe server helper `lib/stripe-server.ts`.
- Added `/api/billing/checkout` for Stripe Checkout sessions.
- Added `/api/billing/portal` for Stripe customer portal sessions.
- Added `/api/billing/webhook` with Stripe signature verification.
- Webhook upserts `subscriptions` from subscription events.
- Webhook creates `usage_packages` for `extra_session_pack` checkout completions.
- Middleware allows only `/api/billing/webhook` as the public billing path; signature verification is still required.
- Added dormant usage enforcement helper `lib/billing-usage.ts`.
- `BILLING_ENFORCEMENT_ENABLED=false` by default.
- If enabled, deep dives consume `deep_dive` usage and session closure consumes `session` usage from active usage packages.
- `.env.local.example` now includes usage-package defaults for extra session packs.

Implemented Sprint 5:
- Document intelligence now creates a `financials` extraction row when uploaded documents contain board-relevant financial signals.
- Detection is conservative and line-based for DRE/P&L, OCF, cash, revenue, margin, EBITDA, burn, CAC/LTV, churn, retention, ROI/ROAS, budget, cost, and related board metrics.
- Financial signals are promoted into Company Brain as a separate financial memory entry when present.
- Uploaded document metadata and audit events now record `financial_signals` counts.

Implemented Sprint 14/16:
- Admin readout now includes counts for reminders, subscriptions, and usage packages.
- Admin control room now shows operational queues:
  - open sessions
  - due reminders
  - failed reminders
  - pending documents
  - failed documents
  - active subscriptions / usage packages
- Production readiness panel now reflects AI router, billing scaffolding, reminder cron, exports, auth, domain, and admin operations.

Verification:
- `npm run typecheck` passed.
- `npm run build` passed with 55 app routes, including:
  - `/api/billing/checkout`
  - `/api/billing/portal`
  - `/api/billing/webhook`
  - `/api/cron/reminders`

Backlog carried forward:
- Add actual Stripe price IDs and set webhook endpoint in Stripe Dashboard.
- Add `CRON_SECRET` in Vercel and configure Vercel Cron for `/api/cron/reminders`.
- Decide when to enable `BILLING_ENFORCEMENT_ENABLED=true`.
- Add email templates for session status, board pack ready, and referral triage.
- Add stronger document table extraction for XLSX/DRE layouts beyond line-based signal detection.
- Add richer UI for billing plan selection and customer portal access.

### 2026-06-29 - Cron config and non-billing production operations

User clarified:
- Stripe and billing enforcement are for later.
- `CRON_SECRET` will be configured tonight.
- Continue the rest of production builds that do not require user action.

Implemented Sprint 12/17:
- Added `vercel.json` with daily Vercel Cron:
  - path: `/api/cron/reminders`
  - schedule: `0 12 * * *`
- This is 12:00 UTC, about 09:00 in Sao Paulo.
- The route still requires `Authorization: Bearer <CRON_SECRET>`.

Implemented Sprint 14:
- Added Admin Documents API: `/api/admin/documents`.
- Added Admin Documents page: `/admin/documents`.
- Admin Documents shows:
  - upload/extraction status
  - company and organization
  - uploader label
  - extraction count/types
  - summary preview
  - reprocess action using `/api/company-brain/documents/extract`
- Added Admin Audit API: `/api/admin/audit`.
- Added Admin Audit page: `/admin/audit`.
- Audit page supports filtering by event type and entity type.
- Added Admin Partner Channels API:
  - `GET/POST /api/admin/partners`
  - `PATCH /api/admin/partners/[partnerId]`
- Added Partner Channels page: `/admin/partners`.
- Partner Channels page supports:
  - creating partner/distribution/white-label/referral/internal channels
  - updating status
  - seeing organization/company/referral counts

Implemented Sprint 15:
- Partner/channel layer is now operational at admin level.
- This supports Resenha or future partners without making the product partner-owned.
- Existing schema fields for `partner_channel_id` can now be managed through UI.

Implemented Sprint 16:
- Audit events now have a browser-visible admin surface.
- Document extraction/reprocessing queue is visible to super admins.
- Admin navigation now includes Documents, Partners, and Audit.
- Locale catalogs updated for pt-BR, en, es, and fallback pt.

Verification:
- `npm run typecheck` passed.
- `npm run build` passed with 61 app routes, including:
  - `/admin/audit`
  - `/admin/documents`
  - `/admin/partners`
  - `/api/admin/audit`
  - `/api/admin/documents`
  - `/api/admin/partners`
  - `/api/admin/partners/[partnerId]`

CRON_SECRET setup steps for Sergio:
1. Generate a long random secret.
2. In Vercel, open the Board Governance OS project.
3. Go to Settings -> Environment Variables.
4. Add `CRON_SECRET` with the generated value for Production, Preview, and Development if desired.
5. Redeploy production after adding the variable.
6. The `vercel.json` cron should be detected from the repo on deploy.
7. Test manually only after deploy with:
   `curl -H "Authorization: Bearer YOUR_SECRET" https://www.board-os.ai/api/cron/reminders`

Backlog carried forward:
- Add actual Stripe price IDs and webhook endpoint later.
- Keep `BILLING_ENFORCEMENT_ENABLED=false` until billing launch.
- Add richer email templates for session status, board pack ready, and referral triage.
- Add admin controls to associate companies/organizations with partner channels from the browser.
- Add stronger XLSX financial table parsing beyond line-based signal detection.
- Add backup/export strategy and data retention policy docs.

### 2026-06-29 - Cron verified and production hardening follow-on

User confirmed:
- `CRON_SECRET` was created and deployed in Vercel.
- Stripe and billing enforcement remain parked for later.
- Continue all possible production builds without waiting for user input.

Verified production:
- `GET https://www.board-os.ai/api/cron/reminders` without authorization returned `401`.
- Same route with `Authorization: Bearer <CRON_SECRET>` returned `200`.
- Cron response showed `processed: 0`, `sent: 0`, `failed: 0`.

Implemented Sprint 15:
- Admin partner channels can now associate and remove associations for organizations and companies.
- Added `POST /api/admin/partners/[partnerId]/associations`.
- Association changes update existing `partner_channel_id` fields on `organizations` or `companies`.
- Association changes write audit events:
  - `partner.organization_attached`
  - `partner.organization_detached`
  - `partner.company_attached`
  - `partner.company_detached`
- `/admin/partners` now shows attach/detach controls and the first associated organization/company names for each channel.

Implemented Sprint 12/16:
- Added reusable product email templates in `lib/email/templates.ts`.
- Cron reminders now use the shared reminder email template.
- Template module also includes ready-to-wire variants for:
  - board pack ready
  - session closed
  - referral request triage

Implemented Sprint 5:
- Document intelligence now extracts structured financial tables from spreadsheet-like XLSX/CSV text.
- Financial table rows are classified as:
  - `dre_pnl`
  - `cash_flow`
  - `unit_economics`
  - `financial`
- Structured data is stored under `financial_tables` in `document_extractions`.
- Uploaded document metadata and audit events now include `financial_tables` counts.

Implemented Sprint 17:
- Added `docs/BACKUP_EXPORT_POLICY.md`.
- Production setup guide now points to the backup/export policy.

Backlog carried forward:
- Stripe price IDs, webhook endpoint, and billing enforcement.
- Custom notification sending for board pack ready, session closed, and referral triage using the new templates.
- Retention cleanup job for expired generated exports.
- Storage signed URL policy review before paid launch.
- Staging restore rehearsal once a paid-production Supabase backup exists.

### 2026-06-29 - Advisor QA, LANCE enrichment, notifications, and hardening

User requested:
- Build advisor adherence evaluation and source/case-library reinforcement.
- Research governance sources adjacent to IBGC and open company cases for agent training.
- Re-enrich LANCE as the first showcase company.
- Continue export polish, notification events, admin observability, and hardening items that do not require Stripe.

Implemented Sprint 8/9/16:
- Added `lib/board/advisor-rubrics.ts`.
- Advisor prompts now receive explicit role rubrics, evidence standards, closure expectations, and case-library patterns.
- Rubrics cover Board Brain, Finance, Operator, Growth, Risk, Customer, and Talent advisors.
- Rubric sources include IBGC, OECD/G20, COSO, UK FRC, NACD, INSEAD, and Fundacao Dom Cabral.
- Added a curated open case library for advisor calibration:
  - LANCE digital sports media repositioning
  - New York Times subscription transformation
  - Boeing 737 MAX governance/risk failure
  - WeWork governance and capital discipline failure
  - Uber culture/governance reset
  - Meta/Facebook data trust and stakeholder risk
  - Natura growth, brand, and channel complexity
  - Petrobras Pasadena capital allocation/governance failure
- Added `scripts/evaluate-advisors.mjs` to score latest `agent_reviews` by advisor role adherence.
- Added `docs/ADVISOR_ADHERENCE_FRAMEWORK.md`.

Implemented Sprint 14:
- Added Admin Agents API: `/api/admin/agents`.
- Added Admin Agents page: `/admin/agents`.
- Admin Agents shows:
  - latest advisor reviews
  - adherence scores by advisor
  - rubric dimensions
  - closure recommendation presence
  - case-library and source-reference coverage
- Admin Overview now reports `agent_reviews` and `agent_conversations` counts.

Implemented Sprint 5/6/7 showcase enrichment:
- LANCE seed now includes Socio LANCE! subscription signals from the public landing page.
- LANCE financial/board pack material now includes DRE/P&L, operating cash flow, recurring revenue, margin, cash, and subscription benefit-cost questions.
- Board Pack export now includes a usage note and considered source references.
- Export HTML includes AI-synthesis disclaimers and source-reference sections.
- CSV export includes usage-note and source-reference rows.

Implemented Sprint 12/16:
- Added shared email sender in `lib/email/send.ts`.
- Governance Run now sends a non-blocking board-pack-ready email when a run completes.
- Session close now sends a non-blocking session-closed email with decision/follow-up counts.
- Referral requests now send a non-blocking admin triage email to configured admin recipients.
- Added in-memory rate limiting for password reset, governance run, and referral creation.
- File uploads now enforce request count and per-file byte limits through `MAX_FILES_PER_REQUEST`, `MAX_FILE_BYTES`, or `MAX_UPLOAD_MB`.
- Admin Documents now exposes document inclusion/exclusion controls for governance memory using the existing document relevance endpoint.

Verification completed:
- `node --check scripts/seed-lance.mjs` passed.
- `node --check scripts/evaluate-advisors.mjs` passed.
- `npm run typecheck` passed after the seeded-review enrichment.
- `npm run build` passed after the seeded-review enrichment with 63 app routes.
- Re-ran LANCE seed against live Supabase.
- Re-ran advisor adherence evaluation against live Supabase after bilingual scoring and seeded-review enrichment.
- Live LANCE advisor adherence average: 93 across Board Brain plus six advisors.

Release step completed:
- Pushed commit `4e798e3` to GitHub so Vercel can deploy the latest build.
- Production smoke verification passed for public routes and metadata assets.
- `/admin/agents` responds as a protected route and redirects unauthenticated visitors to `/login?next=%2Fadmin%2Fagents`.

### 2026-06-30 - OpenAI quota fallback hardening

User reported:
- Clicking `Rodar Board Brain` returned raw OpenAI JSON with `insufficient_quota`.

Diagnosis:
- This is an OpenAI project/account quota or billing issue, not a Supabase/Vercel/app logic failure.
- Governance Run was configured with `fallbackOnError: false`, so provider errors surfaced directly to the UI.

Implemented:
- Model router now classifies provider errors such as `insufficient_quota`, `rate_limit_exceeded`, and `invalid_api_key` instead of exposing raw provider payloads.
- Governance Run now uses deterministic fallback output when the external AI provider fails.
- Governance Run response records fallback diagnostics:
  - `ai.used_fallback`
  - `ai.fallback_reason`
  - attempted provider/model
- Governance Run UI now shows a friendly contingency message when fallback is used.
- Production setup guide now documents the `insufficient_quota` remediation path.

External action still needed:
- Add/confirm OpenAI billing and API credits for the Board Governance OS OpenAI project.

### 2026-06-30 - Export, notification, admin observability, and hardening follow-on

User reminded the production backlog:
- Export polish and QA.
- Notification depth.
- Admin observability for AI runs/failures.
- Production hardening: rate limits, source inclusion/exclusion, signed URL review, restore rehearsal, privacy/legal pages, mobile QA.

Confirmed already wired before this batch:
- Board pack ready email is sent after Governance Run.
- Session closed email is sent after closing Shadow Board Review.
- Referral/admin triage email is sent after referral request creation.
- Reminder cron is live.
- Rate limits exist for password reset, Governance Run, referrals, and middleware API buckets.
- Document source inclusion/exclusion exists in Company Brain/Admin Documents.

Implemented in this batch:
- Added notification audit events for board pack ready, session closed, and referral triage emails.
- Governance Run now persists AI diagnostics into board pack/session/cycle/audit metadata.
- Added `/api/admin/ai` and `/admin/ai` to inspect AI fallbacks, model errors, and notification delivery events.
- Added Operations navigation item for AI Ops.
- Improved Board Pack export text formatting so object content becomes readable labels instead of raw JSON.
- Improved HTML export styling for dossier-style readability.
- Added bounded export signed URL TTL via `EXPORT_SIGNED_URL_TTL_SECONDS`, capped at 24 hours.
- Added `npm run qa:exports` for recent export artifact QA.
- Added `npm run qa:mobile` for public/protected mobile route smoke QA.
- Added `/privacy` and `/terms` public pages.
- Added `docs/EXPORT_QA_CHECKLIST.md`.
- Added `docs/RESTORE_REHEARSAL_RUNBOOK.md`.

Still not fully complete:
- Manual visual QA of generated PDF/PPTX/DOCX must be run by opening fresh generated artifacts before a polished demo.
- Restore rehearsal still requires a staging Supabase project and a backup snapshot.

Verification this batch:
- `npm run typecheck` passed.
- `npm run build` passed with 67 app routes.
- `npm run qa:exports` passed against live Supabase; latest checked artifacts include `pdf` and `html`. Warnings are limited to legacy artifacts created before signed URL TTL metadata existed.
- `npm run qa:mobile -- http://localhost:3011` passed for public mobile routes and protected app redirects.
- After first production verification, `/privacy` and `/terms` were live but the metadata sitemap still returned only the root URL, so sitemap was moved to an explicit uncached `/sitemap.xml` route handler.
- Final production verification passed:
  - `npm run verify:production -- https://www.board-os.ai`
  - `npm run qa:mobile -- https://www.board-os.ai`

### 2026-06-30 - Governance source map and company training packs

User asked whether company packs were organized to create new companies and train the system, and requested more sources similar to IBGC plus open case-study targets from business schools and universities.

Implemented:
- Added `lib/board/training-sources.ts`.
- Moved advisor source references and board case library out of `advisor-rubrics.ts` into a structured source/packs file.
- Added ten company training packs:
  - LANCE!
  - The New York Times Company
  - Netflix
  - Boeing
  - WeWork / The We Company
  - Uber
  - Meta / Facebook
  - Natura &Co
  - Magazine Luiza / Magalu
  - Petrobras
- Each pack now contains public source URLs, company archetype, business model, governance stage, strategic context, decision pressure, known unknowns, advisor stress map, board questions, and training use.
- Added mapped advisor source references: IBGC, OECD/G20, COSO, UK FRC, NACD, INSEAD, Institute of Directors, and Fundacao Dom Cabral.
- Added `docs/GOVERNANCE_SOURCE_AND_CASE_PACKS.md` to document the public-source boundary and the legal boundary around paid business-school cases.
- Updated `docs/ADVISOR_ADHERENCE_FRAMEWORK.md`.

Still pending:
- Build `/admin/training-packs`.
- Add "create demo company from pack".
- Add batch advisor evaluation runs across all packs.
- Add an evaluation-results table for pack/advisor/model comparisons.

### 2026-06-30 - Training packs, intake chat prominence, presentation mode, and hardening QA

User direction:
- Keep Stripe billing enforcement parked.
- Guide OpenAI API billing setup separately from the ChatGPT Pro account.
- Create the company training packs in the live product.
- Run export visual QA and UX/UI review.
- Make chat intake more visible and central; voice can wait for WhatsApp/auth decisions.
- Add LANCE polished demo narrative.
- Add admin/training packs.
- Add Board Pack preview presentation mode.
- Prepare privacy and terms pages with placeholder docs.

Implemented:
- Added shared training-pack seed helper in `lib/board/training-pack-seed.ts`.
- Added Admin Training Packs UI at `/admin/training-packs`.
- Added Admin Training Packs API at `/api/admin/training-packs`.
- Added repeatable CLI seed script `npm run seed:training-packs`.
- Seeded ten live training/demo companies into the Board Governance OS Supabase project:
  - LANCE!
  - The New York Times Company
  - Netflix
  - Boeing
  - WeWork / The We Company
  - Uber
  - Meta / Facebook
  - Natura &Co
  - Magazine Luiza / Magalu
  - Petrobras
- Each seeded company includes Company Brain entries, governance input, business plan, board pack, board session, advisor reviews, decisions, follow-ups, and audit events.
- Fixed current-company resolution so training-pack companies do not displace Sergio's normal active company by accident; non-training companies are preferred before training packs.
- Made Company Brain intake open on the chat tab by default.
- Added clearer Board Brain chat empty state, starter prompts, and a visible "open intake chat" action.
- Expanded chat intake i18n copy across pt-BR, en, and es.
- Added Board Pack presentation mode at `/board-pack/presentation`.
- Presentation mode is protected, hides the app chrome, provides print support, and shows executive summary, questions, financial tables, risk map, advisor reports, and decision candidates.
- Added LANCE polished demo route at `/demo/lance` with a guided narrative for showcasing the product around the LANCE source pack.
- Added placeholder legal docs:
  - `docs/LEGAL_PRIVACY_PLACEHOLDER.md`
  - `docs/LEGAL_TERMS_PLACEHOLDER.md`
- Added local security QA script `npm run qa:security`.
- Added export artifact downloader `npm run qa:exports:download`.
- Added `docs/SECURITY_OPERATIONS_REVIEW.md`.
- Updated mobile smoke QA route list to include the new presentation, demo, and training-pack routes.
- UX copy polish:
  - renamed internal-looking admin labels such as "fallback" to friendlier contingency language where user-facing.
  - renamed agent adherence admin copy to advisor-facing language.
  - removed more code-like language from intake review copy.

Export QA findings:
- Downloaded current live export artifacts from Supabase storage into `/tmp/board-os-export-qa`.
- Rendered the latest PDF pages locally for visual inspection.
- Existing live PDF/HTML artifacts render, but they are legacy artifacts from before the latest formatting pass and are too plain for a polished client demo.
- A legacy PDF page showed JSON-shaped financial rows; the current export route was patched so section object content now passes through readable `valueText()` formatting instead of `JSON.stringify`.
- Current live artifacts only include PDF/HTML from previous export runs; fresh PPTX/DOCX/XLSX artifacts still need to be generated and visually opened after deployment before a high-stakes demo.

Verification:
- `npm run typecheck` passed.
- `npm run build` passed with 70 app routes.
- `npm run qa:security` passed.
- `npm run qa:exports` passed with warnings only for older artifacts created before signed URL TTL metadata existed.
- `node --check` passed for:
  - `scripts/qa-mobile-public.mjs`
  - `scripts/seed-training-packs.mjs`
  - `scripts/qa-security-local.mjs`
  - `scripts/download-latest-exports.mjs`
- Local mobile route smoke QA passed against `http://localhost:3011`.

Open items after this batch:
- Push/deploy the batch and run production smoke after Vercel finishes.
- Generate fresh Board Pack exports from production after deployment and visually QA PDF/PPTX/DOCX/XLSX.
- Add evaluation-results persistence for advisor/model runs across the training packs.
- Complete OpenAI Platform billing so `Rodar Board Brain` can use live model calls instead of the deterministic fallback.
- Keep Stripe enforcement disabled until Stripe products, prices, and webhooks are ready.
