# Claude Design Prompt - Shadow Board Look And Feel

Use this prompt in Claude Design to define the visual system and product UI direction for Shadow Board.

---

You are designing the look and feel for Shadow Board, a governance operating system for founder-led companies.

Shadow Board helps founder-led companies turn messy business problems into board-level decisions, follow-ups, and institutional memory before they have a real board.

This is not a generic AI advisor, not a virtual CEO, and not a replacement for a human board. It is decision infrastructure: company memory, structured challenge, board packs, meeting minutes, decision records, and follow-up cadence.

## Audience

Primary users:
- Founders and CEOs of small and medium companies.
- Founder-managed businesses with little professionalized governance.
- Operators who struggle with what to do, how to do it, and why it matters.
- Companies that lose track of decisions, owners, risks, and follow-up.

Channel context:
- Resenha may become a distribution partner.
- Resenha runs networking events, company visits, and Dreamboard advisory sessions.
- Shadow Board is not a Resenha product. It is owned independently and may be distributed by Resenha, self-serve online, or through other partners.
- The design should consider Resenha use cases without becoming a Resenha-branded tool.

## Product Architecture

Design for six core product areas:

1. Company Brain
   Persistent memory for company facts, goals, financials, risks, uploaded files, operating history, past plans, past decisions, and unresolved questions.

2. Governance Run
   The planning engine. It turns company context and new inputs into a business plan with diagnosis, priorities, KPIs, workstreams, risks, owners, timeline, and assumptions.

3. Board Pack
   A structured artifact that can be reviewed by humans and AI agents. It includes executive summary, strategic questions, risk map, priority ranking, meeting agenda, and decision candidates.

4. Shadow Board Review
   Six advisor lenses plus the Board Brain. Each advisor reviews the board pack independently, challenges other advisors, and contributes to a final synthesized recommendation.

5. Board Meeting And Decision Memory
   The decision layer. The user approves, rejects, challenges, or deep-dives into recommendations. Closed decisions become permanent records with rationale, tradeoffs, owner, review date, expected outcome, and linked prior decisions.

6. Founder Dashboard And Follow-ups
   The cadence layer. It shows risk, confidence, open decisions, overdue follow-ups, upcoming meetings, reminders, and referral requests.

## Governance Agents

Design must make the Board Brain and six advisors feel distinct, serious, and useful.

Board Brain:
- Orchestrator.
- Distributes board packs to advisors.
- Collects independent analysis.
- Identifies conflicts and consensus.
- Writes final recommendations and minutes.
- Updates memory.

Advisors:
- Finance Advisor: cash, ROI, pricing, margin, capital efficiency.
- Operator Advisor: execution, process, accountability, cadence.
- Growth Advisor: sales, market, expansion, revenue quality.
- Risk Advisor: governance, concentration, downside, compliance.
- Customer Advisor: brand, retention, demand, customer behavior.
- Talent Advisor: leadership, hiring, incentives, team capacity.

## Brand Feel

The product should feel:
- serious, not stiff
- premium, not decorative
- operational, not theatrical
- confident, not overpromising
- intelligent, not AI-generic
- calm under pressure
- designed for repeated use, not just a first impression

Avoid:
- generic AI gradients
- robots, circuit imagery, glowing brains
- glassmorphism
- vague startup SaaS polish
- oversized marketing sections inside the app
- UI that feels like a pitch deck instead of a working system

## Design Task

Create three distinct UX/UI directions, then recommend one final direction.

Direction 1: Shadow Room
- Private advisory chamber.
- Dark, confidential, premium.
- Best for strategic meetings, investor-style gravitas, and founder confidence.
- Should not become theatrical or hard to use daily.

Direction 2: Decision Cockpit
- Dense operating console.
- Risk meters, workstreams, decision lists, meeting cadence, status indicators.
- Best for repeated founder use and Resenha client implementation.
- Should feel useful and serious, not like a generic dashboard.

Direction 3: Governance Dossier
- Document-first system.
- Board packs, minutes, decision records, annotations, export-ready views.
- Best for shareable artifacts and institutional memory.
- Should feel alive as software, not like a static PDF archive.

## Required Output

For each direction, provide:
- visual thesis
- color palette with tokens
- typography direction
- layout principles
- key UI components
- interaction mood
- best-fit product moments
- risks or trade-offs

Then recommend one final direction or a hybrid system.

The recommended system must include:
- design tokens
- app navigation model
- dashboard layout
- Company Brain screen concept
- Governance Run screen concept
- Board Pack screen concept
- Shadow Board Review screen concept
- Decision Memory screen concept
- Follow-ups screen concept
- mobile behavior principles
- i18n considerations for Portuguese, English, and Spanish
- accessibility considerations
- export artifact style for PDF/PPT/HTML board packs

## Strategic Guardrail

The interface should make one idea obvious:

Shadow Board does not give founders more advice to forget. It turns advisory input into decisions, owners, memory, and follow-through.

