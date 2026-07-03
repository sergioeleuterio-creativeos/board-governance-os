# Claude Design Brief - Board OS Decision Room

Last updated: 2026-07-02

## 1. Opening Tension

Founders do not only need better advice. They need a room that helps them build the real problem, pressure-test the answer, and leave with decisions their teams can execute.

Dreamboard-style sessions prove the demand: founders value the feeling of being seen, challenged, and surrounded by senior pattern recognition. But those rooms have uneven context, limited memory, and weak follow-through.

Board OS should keep the board structure and discussion energy, while adding what Dreamboard cannot reliably provide: persistent company memory, briefed agents, evidence discipline, decision records, and execution briefs.

## 2. Business Objective

Redesign Board OS from a governance workflow into a premium decision-room product for founder-led companies.

The product must still preserve the original purpose: help founders turn messy business problems into board-level decisions, owners, memory, and follow-through before they can afford or operate a formal board.

The target version should make three things obvious:

- Board OS knows the business before it gives advice.
- Board OS stages structured executive pressure, not generic AI chat.
- Board OS turns the room into briefs, plans, decisions, and follow-up.

## 3. Current Board OS Context

Current product spine from the repository:

- Company Brain
- Governance Run
- Board Pack
- Shadow Board Review
- Board Meeting Session
- Decision Memory
- Follow-ups
- Founder Dashboard

Current positioning:

> Board Governance OS is an AI governance layer for founder-led companies. It is not an AI board member, board replacement, or virtual CEO. It is a governance operating system for better founder decisions.

Current advisors:

- Board Brain
- Finance Advisor
- Operator Advisor
- Growth Advisor
- Risk Advisor
- Customer Advisor
- Talent Advisor

Current UX direction in `docs/CLAUDE_DESIGN_PROMPT.md`:

- Shadow Room
- Decision Cockpit
- Governance Dossier

The current system is strong on governance memory, structured review, decisions, and follow-up. It is less explicit about synthetic hot-seat sessions, role briefings, founder-facing pressure, and the bridge from strategy diagnosis to board discussion to execution materials.

## 4. Creative OS Context To Preserve As Capability Layer

Creative OS lives separately and is built on a different stack/model. Board OS should not become a clone of Creative OS, and it should not depend on Creative OS as a codebase.

Instead, Board OS should treat these Creative OS capabilities as modular engines:

- Strategy Core: problem diagnosis, strategic tension, options, positioning, decision logic.
- Brief Engine: board briefings, role briefings, strategy briefs, campaign briefs, sales briefs.
- Campaign Planner: go-to-market activation, campaign architecture, channel sequence, asset plan.

Product distinction:

- Creative OS builds the thinking and execution materials.
- Board OS stages the decision room and preserves decision memory.

Target line:

> Strategy Core builds the thinking. Board OS puts it through the room.

## 5. Audience And Behavior

Primary users:

- Founders and CEOs of founder-led companies.
- C-level operators preparing for major decisions.
- Companies that use peer advisory, Dreamboard-style sessions, investor conversations, or informal boards but lack structured governance.

Behavioral state:

- They have a messy business issue.
- They can describe symptoms, but not always the real problem.
- They want senior advice but often receive fragmented opinions.
- They need pressure, confidence, and clarity before acting.
- They need usable outputs, not only a good conversation.

Desired product behavior:

- Founder uploads context.
- Board OS builds the problem.
- Board OS briefs the room.
- Founder runs a synthetic hot-seat or board session.
- Agents challenge the plan from distinct roles.
- Founder makes or prepares a decision.
- Board OS creates briefs, memo, plan, owners, and review cadence.

## 6. Current Belief / Barrier

The founder may believe the value is in "getting more advice."

Board OS must reframe the value:

The value is not more advice. The value is better problem-setting, structured disagreement, and decisions with memory.

Another barrier:

AI board products can feel fake, theatrical, or generic. Board OS must avoid pretending to be a human board. It should feel like a serious operating system that uses AI to prepare, challenge, synthesize, and remember.

## 7. Desired Shift

From:

> "I need smart people to give me their opinion."

To:

> "I need a decision room that knows my company, pressures the problem from multiple executive angles, and turns the outcome into an operating plan."

From:

> "Board OS is an AI governance dashboard."

To:

> "Board OS is the boardroom that knows the business before it gives advice."

## 8. Single-Minded Strategic Thought

Board OS turns founder ambiguity into board-grade decisions by combining deep company context, briefed executive agents, structured challenge, and decision memory.

## 9. Target Product Architecture

Design around two agent sets.

### Agent Set 1 - The Strategic Board

These agents decide and challenge.

- Chair / Board Brain: frames the session, manages turns, forces closure.
- CEO Operator: asks what decision changes tomorrow.
- CFO / Investor: tests economics, risk, capital allocation, sequencing, and opportunity cost.
- CMO / Brand Strategist: tests positioning, perception, audience, and distinctiveness.
- CRO / Sales Leader: tests buyer logic, sales motion, objections, and deal reality.
- Product / Customer Agent: tests user/customer demand and product consequence.
- Category Expert: brings market pattern recognition.
- Skeptic / Red Team: attacks weak assumptions, false certainty, and polite strategy.

### Agent Set 2 - The Execution Studio

These agents produce outputs after the decision.

- Strategy Core: diagnosis and strategic compression.
- Brief Engine: board brief, role briefings, sales brief, campaign brief, leadership brief.
- Campaign Planner: activation plan and channel logic.
- Sales Narrative Builder: pitch architecture, objections, buyer story.
- Research / Evidence Agent: source mapping and claims discipline.
- Memo Writer: board memo, minutes, executive summary.
- Project Manager: owners, milestones, dependencies, review cadence.

## 10. Target Session Types

Design Board OS around recurring synthetic sessions a founder can access from time to time.

### 1. Problem Build Session

Use when the founder knows something is wrong but has not named the real problem.

Outputs:

- stated problem
- inferred problem
- problem-frame options
- evidence map
- decision question
- what not to solve yet

### 2. Hot Seat Session

Use when the founder wants Dreamboard-like pressure.

Outputs:

- board discussion
- agreements
- disagreements
- strongest objection
- founder blind spots
- recommended path
- decision required

### 3. Board Prep Session

Use before a real board, investor, partner, or leadership meeting.

Outputs:

- board memo
- likely questions
- weak points
- recommended narrative
- data gaps
- ask from the board

### 4. Strategy Reset Session

Use for repositioning, GTM, growth, brand, sales, or category shifts.

Outputs:

- diagnosis
- strategic options
- chosen game
- positioning
- operating plan

### 5. Campaign Pressure-Test

Use after Strategy Core and Campaign Planner have created a campaign direction.

Outputs:

- campaign critique
- audience logic
- message risks
- creative risks
- media implications
- improved campaign territories

### 6. Decision Review

Use after a decision has been executed for a few weeks.

Outputs:

- what changed
- what still holds
- evidence confirming or challenging the plan
- continue / adjust / stop recommendation

## 11. Target Workflow

1. Upload or select company context.
2. Strategy Core creates the initial diagnosis.
3. Brief Engine creates board brief and role briefings.
4. Founder selects a session type.
5. Board OS runs the structured discussion.
6. Board Brain pauses for decision, pushback, or deeper inquiry.
7. Founder chooses a path or marks it as unresolved.
8. Execution Studio creates outputs.
9. Decision Memory records rationale, trade-offs, confidence, owners, conditions, and review date.
10. Follow-ups are created and added to the founder dashboard.

## 12. UX / UI Design Requirements

The interface should feel like a working decision room, not a chat app with personas.

### Recommended Navigation

- Home / Founder Dashboard
- Company Brain
- Diagnosis
- Briefings
- Decision Rooms
- Outputs
- Decision Memory
- Follow-ups
- Admin / Operations

### Core Screens To Design

#### Founder Dashboard

Purpose:

- show open decisions, upcoming sessions, overdue follow-ups, unresolved assumptions, and current strategic priorities.

Must include:

- active decision rooms
- next recommended session
- unresolved board questions
- risk/confidence readout
- follow-up status

#### Company Brain

Purpose:

- persistent company memory.

Must include:

- uploaded files
- extracted evidence
- company facts
- goals
- risks
- financials
- past decisions
- unresolved questions
- data completeness score

#### Diagnosis

Purpose:

- Strategy Core readout before the room.

Must include:

- stated problem
- inferred problem
- strategic tension
- possible problem frames
- evidence map
- recommended board question
- confidence and missing context

#### Briefings

Purpose:

- show that agents are briefed before they speak.

Must include:

- board brief
- individual role briefs
- agent angle
- evidence each agent is using
- questions each agent will pressure-test

#### Decision Room

Purpose:

- synthetic hot-seat or board session.

Recommended layout:

- left: session question, evidence drawer, source files, founder notes
- center: structured board discussion
- right: live synthesis, agreements, disagreements, risks, decisions, output queue

Important controls:

- challenge harder
- ask for evidence
- invite another role
- isolate disagreement
- move to decision
- create brief
- create board memo
- defer decision

#### Outputs

Purpose:

- artifacts produced by Execution Studio.

Must include:

- board memo
- strategic brief
- role briefings
- sales brief
- campaign brief
- operating plan
- minutes
- export actions

#### Decision Memory

Purpose:

- durable record of decisions.

Must include:

- decision
- rationale
- trade-offs
- rejected options
- confidence
- owner
- conditions
- review date
- linked evidence
- linked future decisions

#### Follow-ups

Purpose:

- turn board decisions into operating cadence.

Must include:

- owner
- due date
- status
- dependency
- escalation trigger
- reminder settings

## 13. Visual / Interaction Direction

Preserve the strongest parts of the existing design prompt:

- serious, not stiff
- premium, not decorative
- operational, not theatrical
- calm under pressure
- designed for repeated use

The recommended direction is a hybrid:

- Shadow Room for Decision Room sessions.
- Decision Cockpit for dashboard and follow-ups.
- Governance Dossier for outputs, board packs, briefings, and decision memory.

Avoid:

- generic AI gradients
- robots
- glowing brain imagery
- fake executive avatars
- theatrical boardroom gimmicks
- chat-first layout as the default
- agents that look playful but do not improve judgment

Use UI to communicate:

- this is a serious room
- agents are briefed
- evidence is available
- disagreement is useful
- decisions become memory
- follow-up matters

## 14. Success Criteria

The redesign works if a founder can:

- understand the product in one screen
- upload context and see a meaningful diagnosis
- understand why each agent is speaking
- feel productive pressure, not generic advice
- see agreements and disagreements clearly
- convert a session into briefs and a plan
- preserve the decision with owner and review date
- return later and continue from memory

The redesign fails if:

- it feels like an AI chat with executive labels
- it creates more advice but no decisions
- outputs are disconnected from source evidence
- briefings are hidden or invisible
- the room feels theatrical instead of useful
- Creative OS and Board OS become indistinguishable

## 15. Claude Design Deliverables Requested

Please produce:

1. Product UX thesis for the new Board OS Decision Room.
2. Revised information architecture.
3. Core user flow from upload to decision memory.
4. Desktop wireframe concepts for:
   - Founder Dashboard
   - Diagnosis
   - Briefings
   - Decision Room
   - Outputs
   - Decision Memory
5. Mobile behavior principles.
6. Component inventory.
7. Visual direction and design tokens.
8. Interaction model for synthetic hot-seat sessions.
9. Empty, loading, and error states for agent sessions.
10. Export artifact style for board memo, strategy brief, campaign brief, and decision record.

## 16. Codex Implementation Guardrails

Claude Design should design for incremental delivery. Codex will execute in separate sprints.

Do not require the Creative OS codebase to be present. Assume Creative OS capabilities may initially be mocked behind stable output schemas.

Use stable product boundaries:

- Board OS owns sessions, agents, decisions, memory, UX, and follow-up.
- Creative OS capabilities provide diagnosis, brief generation, and campaign planning as service-style outputs.
