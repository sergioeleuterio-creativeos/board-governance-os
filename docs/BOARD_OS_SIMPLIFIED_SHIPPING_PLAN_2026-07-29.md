# Board OS — Simplified Product and Shipping Plan

Last updated: 2026-07-29

## Production QA validation — 2026-07-29

An authenticated production test was completed with the QA founder account and synthetic company data.

The main conclusion is sharper than the code review alone:

> The storage layer can persist the objects. The product does not preserve the decision across the handoffs.

### What worked

- CAPTCHA, authentication, and first-user workspace bootstrap completed.
- Company intake chat accepted and displayed the founder's synthetic context.
- The real persistence action created:
  - a company;
  - governance inputs;
  - Company Brain memory;
  - an active company membership.
- The active company then appeared correctly in Company Brain and the company selector.
- A consultative room could be recorded.
- An advisory-plan record appeared in **Planos e decisões**.
- Three follow-ups were generated with owners, dates, and statuses.
- Synthetic personas were visible by name and role, and every contribution was readable.

### What failed or misled the founder

1. **The primary intake CTA does not save.**

   `Salvar contexto` only changes the active tab to Review. The control keeps the same label on the Review screen and still does not persist. The action that actually calls the persistence endpoint is labeled `Salvar rascunho`.

   A founder can reasonably believe context was saved, enter a room, finish a session, and approve a plan while no company exists.

2. **Non-persistence is reported as success.**

   With no active company, the room session and decision endpoints can return HTTP 200 with:

   - `persisted: false`;
   - `reason: no_active_company`.

   The client checks only `response.ok`. It therefore displayed `Sessão salva` and `APPROVED`, even though Company Brain, plans, decisions, and sessions remained empty.

3. **Saved intake reaches Company Brain but not the decision.**

   After using the real save action, Company Brain correctly showed the synthetic intake note. The marketing room changed its evidence status from `FALTANDO` to `PARCIAL`, but it still said:

   - the central decision had not been named;
   - only Company Brain/chat was available.

   The founder had explicitly named the choice between enterprise ABM in Brazil and product-led expansion in Latin America. The room did not recover that choice as its active question.

4. **Visible personas are generic, not deliberative.**

   The full six-turn marketing test showed Board Brain, CMO, GTM, CRO, Category, and CRM contributions. They were readable, which validates the visible-board direction.

   But the turns were role templates. They did not evaluate the founder's alternatives, budget, growth target, capacity, or review triggers. There was no:

   - independent analysis of the actual plan;
   - advisor-to-advisor challenge;
   - revised final position after exposure to other arguments;
   - Chair synthesis tied to the founder's decision.

5. **The saved consultative plan is structurally generic.**

   Persistence worked once a company was active, but the plan record was a generic recommendation to validate a priority, collect evidence, assign an owner, and review in 30 days. It did not contain the marketing choice, an actual recommendation, plan version, rejected option, or KPI logic from the founder's context.

6. **The board-pack path does not consume the saved plan.**

   A board-pack session started after the consultative plan existed. It generated a generic question about what decision the company should make now and showed only `Company Brain / chat` as partial evidence. It did not identify or cite the saved plan.

### Follow-up verification

A second signed-in pass confirmed four additional implementation details:

1. **The apparent Chair chat is deterministic and local-first.**

   The intake endpoint returns templated questions based on keyword matching. The UI appends founder messages to a local draft, but does not extract the answer into company, strategy, finance, or team fields and does not persist the conversation until a separate save action. In the test, a message that explicitly named a R$ 300 thousand allocation, a 40% CAC increase, B2B subscription revenue, CRM, onboarding, retention, and KPIs left Strategy and Finance at zero.

   The Chair should incrementally persist every accepted answer and write proposed structured facts for founder confirmation. A conversational intake cannot require the founder to repeat the same information in seven forms.

2. **The current room is a manual agent console.**

   Before the room, the founder sees nine selectable advisor buttons and six session-type buttons. Inside the marketing room, the founder sees evidence drawers, five evidence actions, five room controls, an output queue, agreement/disagreement/risk counters, export controls, and a manual `Pedir conselho` action for each advisor turn.

   The active-room roster is not continuously visible. Personas appear only after their manually requested contribution arrives. This confirms the target rule: the board remains visible, while selection and turn orchestration move to the Chair.

3. **Concrete facts disappear downstream.**

   The saved consultative plan and its follow-ups did not preserve the R$ 300 thousand allocation, the acquisition-versus-retention alternatives, the CAC increase, or the requested KPI choice. The saved record became a generic plan to assign an owner, collect evidence, and review in 30 days.

   Every generated artifact needs a validation rule: the named decision, alternatives, material numbers, chosen plan version, and source IDs must survive into the plan, pack, synthesis, decision, and follow-ups.

4. **The current invitation surface cannot support a human board.**

   The existing user invitation screen is a platform-admin surface and returned `Forbidden` for the QA founder. Its roles are company-wide—founder, admin, member, viewer, and advisory operator. There is no founder-facing, meeting-scoped human-board invitation.

   Human board participation therefore needs its own action inside the Board view. It should reuse the existing email/auth mechanism, but not the platform-admin interface or broad company viewer role.

### Product implication

The first shipping objective is not a new interface. It is a truthful, canonical artifact chain:

> founder message → active company → structured context → named decision → plan version → locked board pack → grounded contributions → Chair synthesis → decision and commitments

Every object in that chain must expose its source and successor. If any link is missing, the Chair should stop and explain what is required. It must never display a saved or approved state when persistence failed.

## Executive conclusion

Board OS should become one continuous relationship with a visible Chair and a visible board.

The product is not two separate products and it is not a workflow of dashboards. The user should experience one conversation that:

1. learns the company;
2. understands and consolidates its plans;
3. brings the relevant board members into a hot seat;
4. creates a handoff document for execution in Creative OS;
5. continues as a recurring board cadence;
6. remembers decisions and follows up between meetings.

The simplification is therefore:

> Remove the control room, not the board members.

Personas stay visible and readable. The Chair handles orchestration, state changes, agent selection, sequencing, synthesis, and artifact generation in the background.

## 1. Original brief vs. current product vs. target

| Dimension | Original brief | Current code/UI | Simplified target |
|---|---|---|---|
| Core promise | Turn messy issues into board-grade decisions, memory, and follow-through | Governance OS plus a Creative OS-style advisory and marketing-plan layer | One Chair-led journey from context to advice, decision, and follow-through |
| Primary experience | Company Brain → Governance Run → Board Pack → Shadow Board Review → meeting → decisions → follow-ups | Navigation-heavy application with diagnosis, briefings, room types, agent selection, turn controls, interventions, outputs, decisions, and follow-ups | A persistent conversation with three simple views: Advisor, Board, Commitments |
| Board members | Distinct advisors review independently, challenge each other, and contribute to synthesis | Personas are visible, but the founder operates them through selectors and turn controls | Personas sit visibly at the board table; their names, lenses, contributions, disagreements, and replies are directly readable |
| Creative OS boundary | Creative OS capabilities should be consumed as engines, not merged into Board OS | Advisory sessions can generate marketing/brand plans and output artifacts, but these are not a canonical input to later board packs | Intake produces a versioned Strategic Source Document. Board OS governs it; Creative OS can import it to create campaigns and briefs |
| Founder role | Bring the problem, challenge the room, decide | Configure the room and drive many state changes | Converse, answer, ask, invite, approve, and decide |
| Chair role | Orchestrate reviews, conflicts, synthesis, minutes, and memory | Board Brain exists, but much orchestration is exposed as UI controls | Chair is always present and owns all sequencing before, during, and after the meeting |
| Human board | Product does not replace a human board | Company users can be invited, but there is no first-class mixed human/synthetic session model | Humans and synthetic advisors receive the same released pack and contribute asynchronously in scheduled meeting windows |
| Artifacts | Board packs, minutes, decision records, follow-ups | Many separate output surfaces and export actions | Artifacts are generated from the conversation and appear inline when ready |

## 2. Product model

### One persistent Chair

The Board OS Advisor is the Chair. It is always available and is the only system-level persona the founder must understand.

The Chair:

- runs intake diagnostics;
- identifies missing evidence and asks follow-up questions;
- consolidates uploaded or entered plans;
- keeps multiple plan versions without silently merging contradictions;
- calls the appropriate synthetic advisors;
- invites and briefs human board members;
- controls meeting phases and deadlines;
- summarizes agreements, disagreements, and unresolved questions;
- proposes decisions and actions;
- writes and closes the minutes;
- follows up between meetings.

### Three founder-facing views

#### 1. Advisor

The default home screen. A continuous conversation with the Chair, with a compact context drawer for sources and artifacts.

The Chair can insert structured objects into the conversation:

- diagnostic question;
- evidence request;
- plan version;
- comparison;
- recommendation;
- Strategic Source Document;
- proposed board agenda;
- decision;
- action;
- reminder.

#### 2. Board

A visible board table and chronological meeting transcript.

The fixed screen elements are:

- the Chair;
- participant roster;
- current phase and deadline;
- meeting question;
- readable contributions;
- one composer;
- one primary action controlled by the Chair.

Every contribution shows:

- participant name;
- human or synthetic label;
- role/lens;
- phase;
- contribution type;
- message;
- evidence or plan references;
- timestamp;
- response target, when applicable.

#### 3. Commitments

A compact record of:

- open decisions;
- action owners and dates;
- assumptions to verify;
- upcoming board windows;
- completed minutes;
- items the Chair will follow up.

Company Brain, plans, packs, outputs, and minutes remain first-class domain objects, but they are accessed from the conversation or record drawer instead of becoming primary navigation destinations.

## 3. End-to-end flow

### Stage A — Intake and plan consolidation

1. The founder starts with chat, web intake, WhatsApp, or document upload.
2. The Chair runs the diagnostic and builds the Board OS company context.
3. The founder enters or uploads one or more marketing/business plans.
4. Each plan is stored as a version with period, business front, source, status, and lineage.
5. The Chair produces either:
   - one consolidated plan;
   - separate plans by year/front;
   - a comparison with conflicts that need founder resolution.
6. Strategy Core and Brand Foundation are capability calls inside this flow, not separate products or destinations.

### Stage B — Hot seat and handoff

1. The Chair proposes the hot-seat question and board composition.
2. Advisors produce independent analyses.
3. The Chair exposes each advisor contribution in the board transcript.
4. Relevant advisor pairs challenge each other; the product does not run every possible pair.
5. The founder can answer, ask a follow-up, or direct a question to any visible advisor.
6. The Chair synthesizes the room and creates the Strategic Source Document.
7. The document contains:
   - company and diagnostic context;
   - plan version or consolidation used;
   - strategic tension;
   - key advisor contributions;
   - agreements and material disagreements;
   - recommended direction;
   - rejected or deferred options;
   - workstreams, owners, KPIs, risks, and open questions.
8. The founder may explicitly send/import this document to Creative OS for briefs and campaigns.

### Stage C — Recurring mixed board routine

1. The Chair asks for progress against the plan and proposed actions.
2. The founder adds questions and approves the agenda.
3. The pack is locked and released to the selected participants.
4. Synthetic and human participants proceed through asynchronous meeting phases.
5. The Chair consolidates, proposes decisions, records founder approval or deferral, and closes the minutes.
6. The Chair follows up during normal founder conversations until the next board window.

## 4. Mixed human and synthetic board

Human participation should be first-class, but explicitly different from a synthetic persona. A real participant always appears with their real name, title, and a **Human board member** label.

### Meeting phases

| Phase | Participants | Output | Default timing |
|---|---|---|---|
| Pack released | Chair | Locked pack, agenda, questions, deadlines | T0 |
| Independent analysis | Synthetic advisors | Private first-read contributions | Immediately after release |
| Human readout | Invited humans | Readout, questions, objections, evidence requests | T0 to T+24h |
| Board exchanges | Selected humans and advisors | Bounded asynchronous replies and challenges | T+24h to T+36h |
| Chair synthesis | Chair | Agreements, disagreements, recommendation, decision candidates | T+36h |
| Founder decision | Founder | Approve, modify, reject, or defer | T+36h to T+48h |
| Minutes closed | Chair | Final minutes and action register | At decision or deadline |

The timings are defaults. Each board meeting stores its own schedule.

### Interaction rules

- Every participant receives the same released version of the pack.
- Independent analyses remain sealed until the first-read phase closes.
- A human can ask the whole board, the Chair, or one named advisor.
- The Chair decides which synthetic replies are material and prevents endless agent chatter.
- An advisor can answer a human asynchronously without pretending both are present at once.
- Material edits to a locked pack create a new pack version and an explicit release event.
- All contributions, pack views, decisions, and changes are auditable.
- Human board members only see companies and meetings to which they are explicitly invited.

## 5. Zero-hour blockers before feature work

These are release blockers. Fix them before adding the mixed-board model or simplifying the visual shell.

### P0.1 — Make the intake action truthful

- Replace `Salvar rascunho` and `Salvar contexto` with:
  - one secondary `Salvar rascunho` action that saves locally or as an explicit draft;
  - one primary `Criar contexto da empresa` action on Review that calls persistence.
- After success:
  - set the returned `companyId` as the current-company cookie;
  - refresh the workspace provider;
  - navigate to the Chair conversation for that company.
- Display the actual created counts and company name.
- Block room entry until an active company exists.

### P0.2 — Treat `persisted: false` as failure

- Session and decision endpoints should return a non-2xx status when a requested durable action cannot persist.
- The client must inspect `persistence.persisted`, not only `response.ok`.
- `Sessão salva`, `APPROVED`, exports, and next-step links must appear only after durable IDs are returned.
- Add a recovery message that preserves the local transcript and lets the founder retry.

### P0.3 — Make conversation create context

- Persist each founder turn immediately when an active company exists.
- Extract proposed company, strategy, financial, team, plan, and decision facts from the turn.
- Show the extracted facts inline for confirmation or correction.
- Update completeness from accepted conversational facts; do not require duplicate form entry.
- Preserve the raw turn as evidence and link every extracted fact back to it.
- Replace the deterministic keyword reply with the configured Chair intelligence adapter.

### P0.4 — Create one source resolver

For every hot seat and board session, resolve and freeze:

- active company;
- selected plan and version;
- relevant Company Brain entries;
- source documents;
- prior decisions and follow-ups;
- board-pack version, when present;
- founder's current question.

The resolver should return source IDs and a human-readable summary. All advisor prompts, transcripts, plans, exports, and decisions must use the same resolved snapshot.

### P0.5 — Ground the room in a named decision

- Extract the founder's decision or strategic tension from intake.
- Ask one clarifying question when the alternatives, criteria, or decision owner are unclear.
- Require the founder to confirm the room question before advisor analysis.
- Pass the confirmed question, plan content, constraints, and evidence to every advisor turn.
- Reject completion when the generated plan cannot name the choice it evaluated.

### P0.6 — Separate session progress from deliberation quality

`6/6 turnos` is not completion. Completion requires:

- an independent contribution from each selected advisor;
- at least one material disagreement or explicit confirmation that none exists;
- targeted replies on consequential disagreements;
- a final position from each relevant advisor;
- a Chair synthesis that cites the plan, evidence, and unresolved assumptions.

## 6. Minimal data changes

Do not build a second board system. Extend the existing sessions, reviews, conversations, meetings, minutes, decisions, and reminders.

### New or revised records

#### Extend existing `business_plans`

Do not create a parallel plan table for the first release. Add:

- title and plan type;
- period and business front;
- version and parent plan;
- source type and source document/input IDs;
- raw source and normalized content;
- consolidation lineage;
- metadata for conflicts and founder resolutions.

#### `board_participants`

- board session link;
- actor type: founder, human, synthetic, chair;
- user ID or advisor key;
- display name, title, lens;
- permission scope and released-pack version;
- invitation, acceptance, and participation state.

This record is also the session access grant. Do not create a second grants table.

#### `board_contributions`

A canonical transcript for both human and synthetic participants:

- session and participant;
- phase;
- contribution type: analysis, question, reply, challenge, synthesis, decision, action;
- body and structured payload;
- evidence and plan references;
- parent contribution;
- visibility state: sealed, released, private-to-chair;
- generation/job provenance where applicable.

#### Extend existing `board_sessions`

- add pack-release, independent-analysis-close, human-readout-close, exchange-close, and decision-deadline timestamps;
- add timezone and current phase;
- keep the transition history in session metadata and audit events;
- retain `expires_at` for the final participation boundary.

This reduces the first release to two new tables—participants and contributions—plus extensions to plans and sessions.

### Existing records to reuse

- company memberships and invitation infrastructure;
- board packs and sessions;
- agent reviews and conversations;
- board meetings and attendees;
- meeting minutes;
- decisions and follow-ups;
- reminders, email service, and audit events.

## 7. Access and safety model

The current company-level viewer is too broad for an external board member. The release should add a session-scoped board-member role and Row Level Security policies that enforce:

- no Company Brain access unless separately granted;
- no draft pack access;
- access only to explicitly released pack versions;
- access only during and after invited sessions;
- no access to sealed independent analyses before phase release;
- read/write access only to their own permitted contributions;
- immutable attribution and audit events;
- Chair/founder controls for removal and future-access revocation.

## 8. Fast implementation sequence

This is a 16–22 focused-hour implementation because the repository already has most of the product spine, but production QA identified a truthful-state and source-resolution block that must be fixed first.

### Block 0 — Truthful state and source chain (3 hours)

- fix the intake CTA and set the returned company as current;
- make persistence failures fail visibly;
- persist Chair conversation turns and extract proposed structured facts;
- add the canonical room-source resolver;
- require a confirmed active question and selected plan version;
- add an end-to-end regression test for context → plan → board pack → decision.

### Block 1 — Domain and persistence (3–4 hours)

- add plan versioning and consolidation lineage;
- add participants and contributions;
- extend board sessions with phase deadlines and timezone;
- tighten RLS for external human board members;
- adapt current session close/minutes code to mixed attendees;
- add migration tests.

### Block 2 — Simplified founder UI (4–6 hours)

- reduce founder navigation to Advisor, Board, and Commitments;
- build persistent Chair conversation;
- replace agent picker and manual turn console with a visible participant roster;
- render all advisor and human contributions in one readable transcript;
- keep one contextual composer and one primary action;
- surface plan, pack, minutes, and decision artifacts inline.

### Block 3 — Human board and asynchronous cadence (3–5 hours)

- invite a human to a specific board/session;
- release the locked pack by email;
- provide secure accept/join flow;
- create human readout and question composer;
- trigger advisor replies and scheduled phase transitions;
- add deadline reminders and audit events.

### Block 4 — Closure, QA, and release (3–4 hours)

- Chair synthesis and decision capture;
- mixed-attendee minutes;
- action/follow-up creation;
- desktop and mobile QA;
- auth, RLS, invite, expiry, timezone, and notification QA;
- deploy and smoke-test production.

### Shipping target

- Core simplified founder experience: one focused day.
- Mixed human/synthetic board: another half to one day.
- Hardening and production QA: half day.
- Realistic total: 1.5–2.5 focused days, with three days retained as the safe external commitment.

## 9. Connector and approval map

The detailed cross-product contract and production findings are registered in `docs/BOARD_OS_CREATIVE_OS_INTEGRATION_REVIEW_2026-07-29.md`.

Production rule: keep Board OS on local/fallback Creative OS mode and keep automatic company sync off until the exposed integration key is rotated, the response schemas are aligned, and analysis calls are made read-only.

### Already configured in the repository

- Supabase Auth, Database, and Storage;
- OpenAI;
- Creative OS service configuration;
- Resend email;
- Vercel cron secret and daily reminder job;
- Cloudflare Turnstile.

### Required before implementation can run solo

1. ~~Production CAPTCHA approval for the QA founder login.~~ Completed in the authenticated QA pass.
2. Database migration authority:
   - a scoped production/staging database connection string; or
   - the user applies reviewed SQL migrations in Supabase.
3. Deployment authority:
   - permission to push a dedicated `codex/` branch and deploy a preview; and
   - explicit approval before production merge/deploy.
4. Email QA:
   - one or two approved real recipient addresses; and
   - explicit permission to send them test invitations and board-pack emails.
5. Creative OS test boundary:
   - approval to make test writes to the configured Creative OS environment; or
   - keep the first release export-only/read-only.

No additional approval is required to continue local implementation and test the existing QA company. The approvals above are needed only for database changes, outbound email, Creative OS writes, and preview/production deployment.

### Optional after MVP

- Google or Outlook Calendar OAuth for true calendar sync and RSVP state;
- WhatsApp Business credentials and webhook configuration;
- Slack or Teams board notifications;
- scheduled email features or a higher-frequency job runner if phase windows must advance more frequently than the hosting plan permits.

Calendar files attached to email are sufficient for MVP; OAuth is not required unless Board OS must read calendars or synchronize RSVP changes.

## 10. Acceptance criteria

The release is ready when a founder can:

1. sign in and continue the same Chair conversation;
2. create company context with one unambiguous primary save action;
3. see a durable success state only when source IDs have been returned;
4. enter or upload multiple plans and see how they were versioned or consolidated;
5. confirm the exact question and plan version a hot seat will evaluate;
6. run a hot seat without selecting agents or manually advancing every turn;
7. see every participating persona and read every released contribution;
8. see advisors address the founder's real alternatives, constraints, evidence, and KPIs;
9. ask one advisor or the whole board a follow-up;
10. generate one Strategic Source Document linked to the plan, source snapshot, and transcript;
11. open a board-pack session that automatically identifies the plan it is governing;
12. invite a human to one board meeting without exposing the whole Company Brain;
13. release one locked pack to human and synthetic participants;
14. complete the asynchronous phases on schedule;
15. close minutes, record a decision, assign actions, and receive follow-up from the Chair.

## 11. Explicit non-goals for this release

- real-time video or simultaneous human/agent chat;
- an agent marketplace or custom persona builder;
- all-to-all advisor conversations;
- a separate campaign-building UI inside Board OS;
- full Google/Outlook calendar synchronization;
- WhatsApp production onboarding;
- a generalized workflow builder;
- redesigning every legacy admin screen.
