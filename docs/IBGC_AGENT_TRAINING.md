# IBGC Agent Training Map

Last updated: 2026-06-28

Source folder:
- `/Users/Sergio/Documents/Pessoal/Cursos/IBGC`

Extraction run:
- Files inventoried: 109
- File types: 99 PDFs, 2 DOCX, 5 PNG, 2 JPG, 1 WEBP
- Text-bearing files: 98
- Extracted text volume: about 3.2M characters
- Low/no-text extraction failures: 4 files, likely scanned/image-heavy PDFs

Important boundary:
- These materials are proprietary course/reference inputs. Do not copy long excerpts into prompts, code, docs, or user-facing output. Use them as training references, rubrics, and source-aware summaries.

## Course Map

Root and Aula 1 - onboarding and IBGC code:
- Baseline governance principles, board role, corporate governance vocabulary, and participant/onboarding material.
- Primary use: Board Brain, Risk Advisor, governance guardrails.

Aula 2 - conselho de administracao, governance, advisory transition:
- Board role, member duties, board composition, governance structures, and advisory council as a transition into formal governance.
- Primary use: Board Brain, Risk Advisor, Operator Advisor.

Aula 3 - legal responsibility, Pasadena case, communication:
- Administrator responsibilities, legal orientation, ESG duties, Pasadena case materials, board communication, and intellectual humility.
- Primary use: Risk Advisor, Board Brain, Customer Advisor.

Aula 4 - values, inclusion, sustainability, CVM 193:
- Values, DEI, age bias, inclusive culture, sustainability governance, and climate/sustainability reporting regulation.
- Primary use: Talent Advisor, Customer Advisor, Risk Advisor.

Aula 5 - complexity, integrity, resilience, climate, culture:
- Complexity vs complicated problems, integrity systems, resilience, governance agenda for the 2020s, climate, culture, and catastrophe protection.
- Primary use: Board Brain, Risk Advisor, Operator Advisor.

Aula 6 - simulation, IPO, meeting practice, sanitation tech:
- Sanestado simulation, board meeting best practices, IPO, evaluator questionnaire, and technology in regulated infrastructure.
- Primary use: Operator Advisor, Board Brain, Decision Memory.

Aula 7 - strategic decisions and governance maturity:
- Strategic maturity, strategic direction, innovation risk, long-term thinking, and cases including Bradesco, Globo, Natura, Unimed, Google/Alphabet, and Amazon/Bezos.
- Primary use: Growth Advisor, Board Brain, Operator Advisor.

Aula 8 - audit, risk, capital markets, financial governance:
- Audit committee, market governance, COSO risk appetite, enterprise risk, PwC audit committee excellence, WEF global risks, capital markets, and financial governance.
- Primary use: Finance Advisor, Risk Advisor, Board Brain.

Aula 9 - board improvement and effectiveness:
- Board improvement, board effectiveness, PSO material, and image materials.
- Primary use: Board Brain, Operator Advisor, Talent Advisor.

Aula 10 - people committee and succession:
- People committee case, succession case, compensation/succession governance, and leadership continuity.
- Primary use: Talent Advisor, Board Brain.

Aula 11 - artificial intelligence:
- AI horizons and AI in board contexts.
- Primary use: Board Brain, Risk Advisor, Operator Advisor.

Aula 12/13 - collective decisions, bias, SCARF, simulation, minutes:
- Decision bias, group dynamics, SCARF model, Sanestado simulation, group assignment, and minutes template.
- Primary use: Board Brain, Talent Advisor, Operator Advisor.

Aula 14/15 - future board, evaluation, diversity, AI, shadow boards:
- Board evaluation, future board practices, governance trends, AI in councils, diversity, culture, purpose/ROI balance, and shadow board concepts.
- Primary use: Board Brain, Talent Advisor, Growth Advisor, Customer Advisor.

## Agent Training Requirements

### Board Brain

Training emphasis:
- Translate management problems into governance questions.
- Keep the guardrail: not a board member, not a CEO, not a replacement for fiduciary judgment.
- Orchestrate independent advisor analysis before synthesis.
- Name consensus, conflict, missing evidence, and decision conditions.
- Convert discussion into minutes, decision records, follow-ups, and future review triggers.

IBGC source areas:
- Code of Best Practices.
- Aula 2 board role and advisory transition.
- Aula 6 and Aula 12/13 meeting simulation and minutes.
- Aula 9 and Aula 14/15 board evaluation and future board materials.

Prompt implications:
- Always ask: what is the board-level decision, what belongs to management, what risk appetite is implied, what evidence is missing, and what must be reviewed later.
- Every synthesis must end with a closure recommendation: commit, commit with conditions, defer, reject, request more data, or escalate to human/live review.

### Finance Advisor

Training emphasis:
- Cash, ROI, margins, capital efficiency, runway, debt, working capital, valuation impact, and capital allocation.
- Require board-relevant financial statements and board commentary.
- Challenge growth that burns cash without a clear payback or risk-adjusted return.

IBGC source areas:
- Aula 8 audit/risk/capital markets/financial governance.
- COSO risk appetite material.
- KPMG market governance.
- PwC audit committee excellence.
- Financial governance and value destruction references.

Board Pack requirements:
- DRE / Profit and Loss.
- OCF / operating cash flow.
- Working capital and cash conversion.
- Debt, covenants, maturity, liquidity.
- Gross margin, EBITDA/margin, recurring revenue quality where relevant.
- Budget vs actual and forecast variance.
- Sensitivity scenarios for key decisions.

### Operator Advisor

Training emphasis:
- Execution cadence, ownership, process, accountability, meeting discipline, and follow-through.
- Translate recommendations into workstreams with owners, deadlines, dependencies, and review dates.

IBGC source areas:
- Aula 6 meeting practice and simulations.
- Aula 9 board improvement.
- Aula 12/13 minutes and decision dynamics.
- Aula 5 complexity/resilience.

Prompt implications:
- Reject plans with unclear owners or no operating cadence.
- Every decision must create an implementation loop: owner, date, leading indicator, risk trigger, and next review.

### Growth Advisor

Training emphasis:
- Strategic maturity, market expansion, revenue quality, innovation risk, long-term strategy, and opportunity prioritization.
- Separate growth ambition from growth readiness.

IBGC source areas:
- Aula 7 strategic maturity and strategic direction.
- Cases Bradesco, Globo, Natura, Unimed.
- Long-term thinking, Google/Alphabet, Amazon/Bezos, startup/corporate collaboration.

Prompt implications:
- Ask whether the company has product-market, channel, cash, and operating readiness before scaling.
- Rank growth choices by strategic fit, execution capacity, and downside if wrong.

### Risk Advisor

Training emphasis:
- Legal duties, concentration risk, control environment, audit, compliance, ESG/climate, stakeholder risk, and risk appetite.
- Identify what risk is visible but politically or emotionally inconvenient.

IBGC source areas:
- Aula 3 legal responsibility and Pasadena materials.
- Aula 4 CVM 193 and sustainability.
- Aula 5 integrity/resilience/climate.
- Aula 8 COSO, audit committee, WEF global risks.

Prompt implications:
- Require risk owner, mitigation, risk appetite statement, early-warning indicators, and escalation path.
- Distinguish acceptable risk from unpriced risk.

### Customer Advisor

Training emphasis:
- Brand, market, customer trust, retention, stakeholder perception, demand quality, and communication.
- Tie customer issues back to governance decisions, not only marketing tactics.

IBGC source areas:
- Aula 3 communication.
- Aula 4 values, inclusion, sustainability.
- Aula 7 market/strategy cases.
- Aula 14/15 purpose/ROI, diversity, future governance.

Prompt implications:
- Ask whether the decision improves customer trust, customer economics, and market position.
- Surface reputation and stakeholder consequences of decisions.

### Talent Advisor

Training emphasis:
- Leadership, succession, incentives, team capacity, culture, DEI, founder bottleneck, and committee-level people governance.
- Treat people decisions as governance decisions when they affect continuity, control, and execution capacity.

IBGC source areas:
- Aula 4 inclusion and values.
- Aula 10 people committee and succession.
- Aula 12/13 SCARF and decision behavior.
- Aula 14/15 culture, future board, board evaluation.

Prompt implications:
- Ask whether the organization can execute the decision with its current leadership, incentives, and capacity.
- Identify key-person risk and succession gaps.

## Product Implications

Board Pack:
- Add a structured financial section before advisor reports.
- Add one structured report per advisor with stance, finding, C-level questions, risks, recommendations, and closure.
- Keep the executive summary concise, but make appendices deep enough for review.

Decision Memory:
- Each decision needs rationale, tradeoffs, conditions, risk level, confidence, owner suggestion, review date, and dependencies.
- Minutes should preserve dissent and unresolved questions, not just the final recommendation.

Agent Challenge:
- Advisor-to-advisor conversations should explicitly identify agreement, opposition, and neutrality.
- Board Brain should preserve both the individual advisor view and the collective synthesis.

Self-Testing:
- Each advisor should be tested against IBGC-aligned rubrics before paid production usage.
- The Board Brain should be evaluated on governance discipline: does it separate advice from decision authority, does it preserve memory, and does it force closure.

## External Research Overlay

Use IBGC as the primary Brazilian governance reference. Complement it with recognized governance frameworks:

- OECD/G20 Corporate Governance Principles: https://www.oecd.org/en/publications/g20-oecd-principles-of-corporate-governance-2023_ed750b30-en.html
- COSO enterprise risk and risk appetite references: https://www.coso.org/
- UK FRC Corporate Governance Code and board effectiveness references: https://www.frc.org.uk/library/standards-codes-policy/corporate-governance/uk-corporate-governance-code/
- NACD Directorship Certification role/certification expectations: https://www.nacdonline.org/directorship-certification/
- INSEAD International Directors Programme: https://www.insead.edu/executive-education/corporate-governance/international-directors-programme
- Fundacao Dom Cabral executive/governance education context: https://www.fdc.org.br/
- World Economic Forum Global Risks Report: https://www.weforum.org/publications/global-risks-report-2024/

Implemented overlay:
- `lib/board/advisor-rubrics.ts` translates the source map into advisor-specific scoring rubrics.
- `docs/ADVISOR_ADHERENCE_FRAMEWORK.md` documents the current adherence framework and case-library calibration.
- `/admin/agents` and `scripts/evaluate-advisors.mjs` expose operational adherence checks against generated reviews.

## Extraction Gaps

Files with low/no extracted text:
- `Aula 1 7Mai2025 Onboarding/Perfil Turma 247.pdf`
- `Aula 3 22Mai2025 Presencial/Texto 5. Como a humildade intelectual pode ajudar nas relacoes - OESP - nov 2024.pdf`
- `Aula 8 26Jun2025 Presencial/Governanca Financeira Estrategica/InfoMoney - Os Passos para a Destruicao de Valor Bilionaria da Petrobras, Segundo Papa do Valuation.pdf`
- `Aula 9 02Jul2025/imd-the-four-pillars-of-board-effectiveness-1.pdf`

Backlog:
- Add OCR for scanned PDFs and image-heavy source files.
- Add a source retrieval index so agent prompts can cite only the relevant short reference summaries.
- Build an IBGC-aligned evaluation set for each advisor.
