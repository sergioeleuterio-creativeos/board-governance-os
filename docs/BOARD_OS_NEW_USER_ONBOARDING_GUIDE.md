# Board OS New User Onboarding Guide

Use this guide as if you are a brand-new invited user entering Board OS for the first time. It walks through every page in the main product flow, what each page is for, what to click, what to enter, and how to know whether the system is ready for a real decision session.

Last updated: 2026-07-03

## 0. Before You Start

You need:

- A Board OS invited user account.
- A password or password-reset link for that account.
- A company you can safely use for onboarding. For a test, use a clearly labeled name such as `QA Onboarding Company - 2026-07-03`.
- Optional source materials: a company site, founder transcript, deck, financial snapshot, CSV, memo, customer notes, or notes from a CEO conversation.
- At least one real strategic question you want the board to pressure.

Recommended first onboarding scenario:

> "A founder needs to decide which growth path to prioritize over the next 90 days. The company has partial evidence, incomplete financial detail, and needs advisors to ask for missing data without blocking the room."

This is the best test because it exercises intake, missing evidence, Hot Seat, decision capture, follow-ups, and exports.

## 1. Create Or Receive The User

As the operator/admin:

1. Create the user or invite the user from the admin side.
2. Assign the user to the correct organization/company.
3. Confirm whether the user should be:
   - Regular client user: sees the client decision workspace.
   - Admin/operator: sees the admin operations pages too.
4. Send the password setup/reset link if needed.

As the new user:

1. Open `https://www.board-os.ai/login`.
2. Enter the invited email.
3. Enter the password, or use the reset-password flow if you do not have one.
4. If login fails with a network/auth message, wait a few seconds and retry. If it persists, ask the operator to confirm the user exists and has a valid auth profile.

Expected result:

- You land inside the app.
- The left navigation appears.
- The top bar shows the active company selector, search placeholder, and `Board Brain ativo`.
- Your user card appears at the bottom-left of the rail.

## 2. Understand The App Shell

Once logged in, the app has three main regions:

- Left rail: the main navigation.
- Top bar: company selector, workspace/session status, search, Board Brain status.
- Main canvas: the page content.

Main client navigation:

1. `01 Painel`
2. `02 Company Brain`
3. `03 Diagnóstico`
4. `04 Briefings`
5. `05 Salas de decisão`
6. `06 Entregáveis`
7. `07 Decision Memory`
8. `08 Follow-ups`

Admin-only navigation, visible only to admin users:

- `Admin`
- `Usuários`
- `Sessões`
- `Conexões`
- `Documentos`
- `Agentes`
- `Training Packs`
- `IA Ops`
- `Parceiros`
- `Auditoria`

Important behavior:

- The company selector is disabled when the user has access to only one company.
- If the user belongs to multiple companies, use the selector in the top bar to switch company context.
- Every page should be interpreted inside the currently selected company.

## 3. First Page: Painel

URL: `/dashboard`

Purpose:

The Painel is the command center. It tells the user whether the company has enough context, how risky the current decision state is, which rooms are active, and what the recommended next action is.

What to inspect:

1. Context score.
2. Risk score.
3. Open decisions.
4. Open follow-ups.
5. Active rooms.
6. Recommended next room.
7. Missing data.
8. Strategic advisor roster.

What to do on first visit:

1. Check whether the company name in the top bar is correct.
2. Read the context and risk metrics.
3. If context is low or missing data is visible, go to `Company Brain` or `Adicionar contexto`.
4. If the dashboard says Hot Seat is the next step, do not start yet unless you have at least a basic company context.

Good first-session signal:

- The dashboard can explain what is missing.
- It does not pretend full confidence when evidence is incomplete.
- The recommended room points naturally to the next decision step.

If the page is empty or generic:

- Go to Company Brain intake and add context.
- Then run Governance Run if available.
- Return to dashboard and check whether the readout becomes more specific.

## 4. Company Brain

URL: `/company-brain`

Purpose:

Company Brain is the institutional memory. It holds facts, uploaded documents, extracted evidence, risks, prior decisions, and founder context. Board OS should never behave like a blank chat; it should deliberate from this memory.

What to inspect:

1. Memory completeness by category.
2. Evidence timeline.
3. Active gaps.
4. Documents or extracted files.
5. The call to `Adicionar contexto` or `Iniciar intake`.

What to do:

1. Open Company Brain.
2. Check whether facts are already present.
3. If this is a new company, click `Adicionar contexto` or go directly to `/company/intake`.
4. If the company has documents, verify whether they appear as source evidence.
5. If the Company Brain says no active memory exists, do the intake before running a room.

Good Company Brain signal:

- It names concrete evidence, not vague claims.
- It marks missing context clearly.
- It separates confirmed facts from partial or missing evidence.

Bad signal:

- Company Brain feels generic.
- It does not know the company name, business model, strategic question, or current challenge.
- It cannot identify what evidence is missing.

If bad, add more intake.

## 5. Company Intake

URL: `/company/intake`

Purpose:

This is the first real onboarding action. Intake turns loose founder context, files, and structured company information into Company Brain memory.

The page has seven tabs:

1. Chat
2. Arquivos
3. Empresa
4. Estratégia
5. Financeiro
6. Time
7. Revisão

There is also a quality/completeness score. The goal is not perfection. The goal is enough context for the first board-quality session.

### 5.1 Chat Tab

Use this first.

What to enter:

- What decision needs to be made and why now.
- What the founder believes is blocking progress.
- What has already been tried.
- What the board should challenge.
- Any transcript summary from the CEO/founder.

Suggested first prompt:

> "We need to decide which strategic path to prioritize in the next 90 days. The company is considering [option A], [option B], and [option C]. The biggest uncertainty is [uncertainty]. The founder wants the board to pressure the trade-offs and ask for missing data."

Click:

1. Type or paste the context.
2. Click `Enviar ao Board Brain`.
3. Read the Board Brain response.
4. Add another note if the response reveals missing details.

Good result:

- Board Brain asks sharper follow-up questions.
- It identifies missing evidence.
- It starts translating loose context into board-level decision questions.

### 5.2 Arquivos Tab

Use this to upload source material.

Accepted examples:

- PDF
- PPTX
- XLSX
- DOCX
- CSV
- TXT

Recommended first files:

- Company deck.
- Founder/CEO transcript.
- Recent financial snapshot.
- Strategic memo.
- Customer or market notes.
- Website copy or positioning text exported as PDF/TXT.

Steps:

1. Click `Escolher arquivos`.
2. Select one or more files.
3. Confirm they appear in the file list.
4. Save the draft later to upload them to Supabase.

Good result:

- Files move from queued/local to uploaded after saving.
- If upload fails, retry with fewer files or smaller files.

### 5.3 Empresa Tab

Fill:

- Nome da empresa
- Setor
- Modelo de negócio
- Faixa de receita
- Número de funcionários
- Estágio da empresa
- Jurisdição

Example:

- Nome: `QA Onboarding Company - 2026-07-03`
- Setor: `B2B services / media / SaaS / consumer / etc.`
- Modelo de negócio: `Subscriptions, enterprise contracts, marketplace, agency services, commerce, etc.`
- Faixa de receita: `Pre-revenue, <$1M, $1M-$5M, $5M-$20M, etc.`
- Funcionários: `12`
- Estágio: `Early growth, turnaround, scale-up, etc.`
- Jurisdição: `Brazil / US / Europe / etc.`

Good result:

- The company appears as active in the top bar after saving.
- The Company Brain can use the company profile in rooms.

### 5.4 Estratégia Tab

Fill:

- Objetivos
- Principal desafio
- Plano atual
- Perguntas para o conselho

This is the most important structured tab for a decision session.

Write in plain language:

- "We need to choose..."
- "We are worried about..."
- "The current plan is..."
- "The board should decide..."

Good questions:

- "Should we prioritize enterprise sales or self-serve growth this quarter?"
- "Should we reposition the offer before increasing acquisition spend?"
- "Should we cut scope, raise price, or expand capacity?"
- "Which evidence would change the recommendation?"

Avoid:

- Very broad questions like "How do we grow?"
- Pure status updates with no decision.
- Questions with no trade-off.

### 5.5 Financeiro Tab

Fill what exists. It is acceptable to be incomplete.

Fields:

- Receita
- Margem
- Runway de caixa
- Concentração no maior cliente
- Riscos financeiros

If the client has no structured finance data:

1. Say that clearly.
2. Enter what is known.
3. Name what is missing.

Example:

> "No full DRE available. Revenue is approximately X. Margin by product is unknown. Biggest financial uncertainty is whether current growth path improves or worsens cash discipline."

Good result:

- The room can ask for missing financial evidence.
- Missing finance becomes a condition or follow-up, not a blocker.

### 5.6 Time Tab

Fill:

- Time de liderança
- Papéis-chave
- Cadência operacional
- Riscos de talento

Useful notes:

- Who owns revenue?
- Who owns product?
- Who owns finance?
- Is the founder a bottleneck?
- What cadence exists today?
- Who can execute the decision?

Good result:

- Follow-ups can be assigned to a plausible owner.
- The decision room can challenge execution capacity.

### 5.7 Revisão Tab

Use this before saving.

Steps:

1. Check the completeness score.
2. Check missing sections.
3. Read the JSON-like review summary.
4. Confirm the company name and decision context are correct.
5. Click `Salvar rascunho`.
6. Click `Enviar para Company Brain`.

Expected save message:

- It should confirm inputs and memory entries were saved.
- If files were included, it should mention uploaded files.

If save fails:

- Confirm you are logged in.
- Confirm the user has company/workspace access.
- Try saving without files first.
- Then upload files in smaller batches.

## 6. Governance Run

URL: `/governance-run`

Purpose:

Governance Run turns Company Brain context into a short board-ready thesis: priorities, risks, a board pack, advisor reviews, follow-ups, and a suggested decision path.

This page may not be in the left rail for all users, but it is a key operator page.

Steps:

1. Open `/governance-run`.
2. Confirm the company is selected in the top bar.
3. Click `Rodar Board Brain`.
4. Wait up to a minute.
5. Read the notice after completion.
6. Inspect:
   - Risk score.
   - Confidence score.
   - Board Pack version.
   - Executive diagnosis.
   - Priorities.
   - Evidence gaps.
   - Workstreams.

Good result:

- A Board Pack is created.
- A decision question is recommended.
- Follow-ups and advisor reviews are created.
- The output is specific enough to guide a room.

If the page says no company exists:

- Return to `/company/intake`.
- Save company profile and memory.
- Reload Governance Run.

If the run completes with fallback:

- It means the system used contingency logic because external AI was unavailable.
- The app remains usable, but review quality carefully.

## 7. Diagnóstico

URL: `/diagnosis`

Purpose:

Diagnosis is the Strategy Core readout. It frames the problem before the board session starts.

What to inspect:

1. Problema declarado.
2. Problema inferido.
3. Tensão A and Tensão B.
4. Confidence score.
5. Possible frames.
6. Evidence map.
7. Recommended board question.

How to use it:

1. Read the declared problem.
2. Read the inferred problem.
3. Ask: "Is the system seeing a deeper problem than the founder stated?"
4. Check whether the selected frame feels right.
5. Check evidence map:
   - Confirmado = usable evidence.
   - Parcial = usable with caution.
   - Faltando = must be requested, accepted as a gap, or turned into a follow-up.
6. Copy or remember the recommended board question.

Good result:

- The diagnosis clarifies the trade-off.
- It does not just repeat the founder's words.
- It names evidence limitations before the room.

If it feels wrong:

- Go back to intake.
- Add a sharper description of the challenge.
- Add missing files or notes.
- Re-run Governance Run if needed.

## 8. Briefings

URL: `/briefings`

Purpose:

Briefings show how the board agents are instructed before they speak. This is where the user verifies that the advisors are not generic personas.

What to inspect:

1. Board brief.
2. Each advisor role.
3. Each advisor angle.
4. Evidence each advisor should use.
5. Pressure each advisor should apply.

How to use it:

1. Read the board brief first.
2. Check each advisor card.
3. Ask whether each advisor has a distinct role.
4. Confirm the evidence and pressure are relevant to the company.

Good result:

- Finance advisor pressures economic logic.
- Growth/category advisor pressures market and demand logic.
- Customer advisor pressures customer proof.
- Risk/legal/compliance advisor pressures downside and conditions.
- Board Brain coordinates the room.

If advisors feel generic:

- Add more company-specific context.
- Add the CEO/founder transcript.
- Add examples of customers, financial constraints, and strategic options.

## 9. Salas De Decisão

URL: `/rooms`

Purpose:

This is where the live decision session happens. A room is not a blank chat. It starts from the Company Brain, diagnosis, evidence map, missing data, and advisor briefings.

Available room types may include:

- Problem Build: use when the problem is still too broad.
- Hot Seat: use when a real decision needs pressure now.
- Board Round or related rooms: use when you want a broader advisory discussion.

Recommended onboarding room:

- Use Hot Seat.

### 9.1 Room Selection Screen

Before entering:

1. Read `Estado da sala`.
2. Check whether mode says `OpenAI ao vivo` or `Modo determinístico`.
3. Check confidence percentage.
4. Read `Melhor próximo passo`.
5. If context is weak, decide whether to add context first or proceed with gaps clearly marked.

Click:

- `Hot Seat`.

### 9.2 Hot Seat Header

Once inside the room, inspect:

- Room type.
- Status: live/open/approved/deferred.
- Active question.
- Question tabs: Q1, Q2, Q3, etc.
- Save status: local draft, saving, saved, or error.
- Export PDF button.

How to test multiple questions:

1. Click Q1 and read it.
2. Click Q2 and read it.
3. Click Q3 and read it.
4. Make sure each question pressures a different dimension:
   - Decision.
   - Minimum evidence.
   - Risk/gates.
   - Owner.
   - Communication.

### 9.3 Context Panel

Left side of the room.

Inspect:

- Context of the session.
- Evidence drawer.
- Data the room can request.
- Founder notes.

What to do:

1. Read the evidence drawer.
2. For each missing data item, choose:
   - `Pedir dado`: if the session should request it and create a follow-up.
   - `Seguir sem dado`: if the room should proceed but mark the evidence gap.
3. Add founder notes before or during the session.
4. Click outside the notes field to save.

Important:

- Missing evidence should not block the session by default.
- It should become an explicit condition, risk, or follow-up.

### 9.4 Center Panel: Live Turns

Buttons:

- `Próximo turno`: advances the next advisor.
- `Pressionar mais`: asks the room to challenge harder.
- `Pedir evidência`: asks for proof or missing data.
- `Convidar papel`: brings in another perspective.
- `Isolar divergência`: filters for disagreement, risk, data requests, and pressure.

Recommended first Hot Seat sequence:

1. Click `Próximo turno`.
2. Read the advisor turn.
3. Click `Próximo turno` again.
4. Continue until several advisors have spoken.
5. Click `Pressionar mais`.
6. Click `Pedir evidência`.
7. Click `Isolar divergência`.
8. Review what remains.
9. Turn off isolation with `Ver todos`.

Good result:

- Advisors disagree with each other when appropriate.
- They ask for concrete evidence.
- They do not overclaim when context is missing.
- They produce a clear path to decision or deferment.

### 9.5 Right Panel: Síntese Ao Vivo

Inspect:

- Concorda.
- Discorda.
- Riscos.
- Fila de entregáveis.

Actions:

1. Click `+ Brief` to queue a strategy brief.
2. Click `+ Memo` to queue a board memo.
3. Click `Ir para decisão` when the room is ready.

Good result:

- Agreements are few and meaningful.
- Disagreements reveal trade-offs.
- Risks become gates or follow-ups.
- Deliverables are tied to the decision.

### 9.6 Decision Modal

When you click `Ir para decisão`, the modal asks you to register the decision.

Options:

- `Aprovar`: the decision is approved.
- `Adiar`: the decision is deferred.
- `Voltar`: return to the room.

Use `Aprovar` only if:

- The recommendation is clear.
- Missing evidence is accepted or requested.
- A responsible owner is clear.
- There is a condition or review date.

Use `Adiar` if:

- Evidence is too weak.
- The board cannot choose between options.
- A critical owner or financial condition is missing.

After capture:

- The room saves.
- Decision Memory should receive the decision.
- Follow-ups should be created or updated.
- PDF export should be available.

### 9.7 Export Hot Seat PDF

In the room header:

1. Click `Exportar PDF`.
2. Wait for save/export.
3. Click `Abrir PDF`.
4. Review the PDF.

The PDF should feel:

- Executive.
- Calm.
- Not overly wordy.
- Clear in hierarchy.
- Fit for sharing after a session.

If the PDF is sparse:

- The room may still be open.
- There may be no final recommendation.
- Run more turns, capture the decision, then export again.

## 10. Entregáveis

URL: `/outputs`

Purpose:

The Execution Studio shows output artifacts tied to decisions and source evidence.

What to inspect:

1. Studio roster.
2. Output cards.
3. Artifact type.
4. Page count.
5. Sources.

Expected artifacts:

- Decision memo.
- Strategy brief.
- Board memo.
- Follow-up plan.
- Other generated materials depending on the session.

How to use:

1. Review queued outputs from the room.
2. Check whether each artifact has sources.
3. Confirm the artifact aligns with the decision.
4. Use PDFs/exports when available.

Good result:

- Outputs are not generic.
- They reference Company Brain, Decision Room, Strategy Core, or Board Pack.
- They can be shared or refined for CEO review.

## 11. Decision Memory

URL: `/decisions`

Purpose:

Decision Memory is the ledger. It preserves what was decided, why, what was rejected, who owns it, conditions, confidence, and review dates.

What to inspect:

1. Decision statement.
2. Rationale.
3. Confidence.
4. Owner.
5. Rejected options.
6. Conditions.
7. Review date.

How to use:

1. Open the page after a Hot Seat or Governance Run.
2. Find the latest decision.
3. Confirm it matches what happened in the room.
4. Check rejected options.
5. Check conditions.
6. Confirm the owner and review date are useful.

Good result:

- The decision is auditable.
- It does not hide uncertainty.
- It preserves the options not chosen.
- It can be revisited later.

If no decision appears:

- Return to the room.
- Click `Ir para decisão`.
- Approve or defer.
- Wait for save.
- Reload Decision Memory.

## 12. Follow-Ups

URL: `/follow-ups`

Purpose:

Follow-ups turn board discussion into execution. They track responsible owner, deadline, status, dependency, escalation trigger, and reminder.

What to inspect:

1. Follow-up title.
2. Owner.
3. Deadline.
4. Status.
5. Dependency.
6. Escalation trigger.

How to use:

1. Open after a room or Governance Run.
2. Check whether missing evidence became follow-up work.
3. Confirm deadlines are realistic.
4. Confirm each item has an owner.
5. Update statuses when work progresses.
6. Use reminders if available.

Good result:

- Follow-ups are specific.
- They close evidence gaps.
- They support the decision review date.
- They do not become vague tasks like "align strategy."

## 13. Board Pack

URL: `/board-pack`

Purpose:

Board Pack is the CEO/board-facing dossier. It packages the governance run into a structured board document.

If there is no Board Pack:

1. The page will say no board pack exists.
2. Click `Rodar Board Brain` or go to `/governance-run`.
3. Run Governance Run.
4. Return to `/board-pack`.

When a Board Pack exists, inspect:

1. Sumário executivo.
2. Perguntas estratégicas.
3. Relatórios financeiros.
4. Mapa de riscos.
5. Relatórios estruturados dos advisors.
6. Agenda da reunião.
7. Candidatos de decisão.

Exports available:

- HTML
- PDF
- PPT
- DOCX
- XLSX
- CSV

How to export:

1. Click the desired export button.
2. Wait for export notice.
3. Click `Abrir exportação`.
4. Review the file.

For CEO sharing:

- Use PDF first.
- Use PPT if you need a presentation flow.
- Use DOCX if you need editable narrative.
- Use XLSX/CSV if reviewing structured rows.

Good Board Pack signal:

- It is concise.
- It has a clear decision agenda.
- It names risks and missing evidence.
- Advisor reports are differentiated.
- The export is polished enough to send with minimal cleanup.

## 14. Board Pack Presentation

URL: `/board-pack/presentation`

Purpose:

Presentation mode is for live review. It removes the normal app shell and presents the Board Pack more like a meeting artifact.

Use it when:

- You are walking a CEO through the board packet.
- You want less interface and more presentation.
- You are preparing for a board-style conversation.

Check:

- Does the first viewport clearly show the company/pack?
- Are sections readable on screen?
- Does it feel like a meeting artifact rather than an admin page?

## 15. Admin Pages

Admin pages are not part of the normal client onboarding. Use them only if your new user is an operator/admin.

### Admin

URL: `/admin`

Purpose:

Admin overview for operational health.

Use it to check:

- System status.
- Recent operational objects.
- Whether the admin account has the right access.

### Usuários

URL: `/admin/users`

Purpose:

Create and manage users.

Use it to:

- Create a test user.
- Verify email.
- Assign role.
- Reset password.
- Confirm whether a user should be admin or regular client.

### Sessões

URL: `/admin/sessions`

Purpose:

Inspect board sessions.

Use it to:

- Verify the Hot Seat session was saved.
- Confirm session status.
- Check closure summary/recommendation.
- Debug missing exports or sparse PDFs.

### Conexões

URL: `/admin/referrals`

Purpose:

Track referrals or connection records.

Use it if:

- The user came from a partner/referral path.
- You need to verify source/relationship metadata.

### Documentos

URL: `/admin/documents`

Purpose:

Operational document queue.

Use it to:

- Review uploaded documents.
- Check extraction status.
- Debug failed uploads/extractions.
- Confirm which documents are feeding Company Brain.

### Agentes

URL: `/admin/agents`

Purpose:

Manage advisor/agent configuration.

Use it to:

- Check which advisors exist.
- Review role definitions.
- Validate training/adherence setup.

### Training Packs

URL: `/admin/training-packs`

Purpose:

Manage or inspect training materials for agents.

Use it to:

- Confirm training packs exist.
- Review whether advisor behavior is grounded in the intended methodology.

### IA Ops

URL: `/admin/ai`

Purpose:

AI operations and health.

Use it to:

- Check AI provider status.
- Confirm OpenAI connectivity for Board OS.
- Investigate fallback usage.
- Review model/provider configuration.

### Parceiros

URL: `/admin/partners`

Purpose:

Manage partner entities and associations.

Use it if:

- A partner or external advisor needs to be connected to companies/users.

### Auditoria

URL: `/admin/audit`

Purpose:

Audit trail.

Use it to:

- Review operational changes.
- Confirm who created or changed records.
- Investigate access or export events.

## 16. Full New User Onboarding Script

Use this sequence for a complete first run.

### Step 1: Login

1. Go to `https://www.board-os.ai/login`.
2. Sign in with the new user.
3. Confirm the app opens on the dashboard.

Pass condition:

- User can enter the app and sees the correct company context.

### Step 2: Create Company Brain

1. Go to `/company/intake`.
2. Start in Chat.
3. Paste the founder/company challenge.
4. Send it to Board Brain.
5. Add files in Arquivos.
6. Fill Empresa.
7. Fill Estratégia.
8. Fill Financeiro with known data and explicit gaps.
9. Fill Time.
10. Review.
11. Save/send to Company Brain.

Pass condition:

- Save succeeds and memory entries are created.

### Step 3: Review Company Brain

1. Go to `/company-brain`.
2. Confirm evidence and gaps appear.
3. Confirm the company context is not generic.

Pass condition:

- Company Brain knows the company, challenge, evidence, and missing data.

### Step 4: Run Governance

1. Go to `/governance-run`.
2. Click `Rodar Board Brain`.
3. Wait for completion.
4. Review risk, confidence, priorities, and decision question.

Pass condition:

- Board Pack and decision path are created.

### Step 5: Read Diagnosis

1. Go to `/diagnosis`.
2. Compare declared vs inferred problem.
3. Check evidence map.
4. Confirm recommended board question.

Pass condition:

- Diagnosis is specific and decision-oriented.

### Step 6: Read Briefings

1. Go to `/briefings`.
2. Review board brief.
3. Review each advisor's angle, evidence, and pressure.

Pass condition:

- Advisors feel differentiated and company-specific.

### Step 7: Run Hot Seat

1. Go to `/rooms`.
2. Open Hot Seat.
3. Review Q1-Q5.
4. Add founder notes.
5. Request one missing data item.
6. Bypass one missing data item if appropriate.
7. Run at least 4 advisor turns.
8. Click `Pressionar mais`.
9. Click `Pedir evidência`.
10. Use `Isolar divergência`.
11. Review synthesis.

Pass condition:

- The room produces agreements, disagreements, risks, data requests, and a clear direction.

### Step 8: Capture Decision

1. Click `Ir para decisão`.
2. Choose `Aprovar` or `Adiar`.
3. Wait for save.

Pass condition:

- Decision Memory and Follow-ups update.

### Step 9: Export Hot Seat PDF

1. In the room, click `Exportar PDF`.
2. Open the PDF.
3. Review for executive polish and content completeness.

Pass condition:

- PDF opens and reflects the actual room.
- If it is sparse, confirm whether the room was actually closed/captured.

### Step 10: Review Outputs

1. Go to `/outputs`.
2. Check queued/generated artifacts.
3. Confirm sources.

Pass condition:

- Outputs map back to the decision and Company Brain.

### Step 11: Review Decision Memory

1. Go to `/decisions`.
2. Open the latest decision.
3. Check rationale, rejected options, conditions, owner, confidence, review date.

Pass condition:

- The decision is auditable.

### Step 12: Review Follow-Ups

1. Go to `/follow-ups`.
2. Check owner, due date, status, dependency, escalation.

Pass condition:

- Evidence gaps and execution work are actionable.

### Step 13: Export Board Pack

1. Go to `/board-pack`.
2. Review sections.
3. Export PDF.
4. Optionally export PPT/DOCX/XLSX/CSV.

Pass condition:

- Board Pack opens and can be shared as a CEO-facing artifact.

## 17. What To Watch During QA

During your new-user test, record issues in these categories:

- Access: login, password, permissions, company selector.
- Context: company memory not specific enough.
- Language: missing accents, stiff AI phrasing, overly generic Portuguese.
- Room behavior: advisors too similar, too agreeable, or not evidence-driven.
- Missing data: room blocks instead of asking/requesting/bypassing.
- Persistence: session does not save, decision does not appear, follow-ups not created.
- Exports: sparse PDF, wrong company, poor formatting, missing recommendation.
- Creative OS connector: company exists in one system but not the other.

## 18. First Real Client Readiness Checklist

Before giving a CEO access, confirm:

- User can log in.
- Correct company appears in top bar.
- Company Brain has at least basic company, strategy, finance, and team context.
- CEO/founder transcript or equivalent context is saved.
- Diagnosis is specific.
- Briefings are differentiated.
- Hot Seat can run multiple turns.
- Missing data can be requested or bypassed.
- Decision can be approved or deferred.
- Session PDF export works.
- Board Pack exists.
- Board Pack PDF export works.
- Decision Memory records the outcome.
- Follow-ups are generated.
- Language is acceptable in Brazilian Portuguese.
- No admin pages are visible to a regular client user.

## 19. Suggested First User Test Data

Use a deliberately realistic test company:

- Company: `QA Onboarding Company - 2026-07-03`
- Sector: `B2B services`
- Model: `Project revenue plus recurring advisory`
- Stage: `Early growth`
- Main decision: `Should we prioritize enterprise sales, productized offers, or operational margin before scaling acquisition?`
- Known evidence:
  - Revenue is growing but margin by offer is incomplete.
  - Founder has strong customer intuition but limited structured customer research.
  - Team capacity is constrained.
- Missing evidence:
  - Margin by product/service line.
  - Pipeline by segment.
  - Conversion by channel.
  - Customer willingness to pay.
  - Owner capacity for execution.

This creates a realistic Board OS session because the system must guide the client through incomplete data rather than assuming perfect inputs.
