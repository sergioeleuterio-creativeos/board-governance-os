# Advisor Adherence Framework

Last updated: 2026-06-30

The six governance lenses are useful only if they stay distinct. Board Governance OS now has coded rubrics in `lib/board/advisor-rubrics.ts`, structured source/case packs in `lib/board/training-sources.ts`, an admin readout at `/admin/agents`, and a CLI evaluator in `scripts/evaluate-advisors.mjs`.

## Evaluation Dimensions

Each advisor is scored on:

- Scope fidelity: does the advisor stay inside its specific role?
- Evidence discipline: does it ask for the data that role should require?
- Board-level relevance: does it turn the topic into governance decisions, risks, tradeoffs, owners, and review cadence?
- Closure contribution: does it help the Board Brain reach commit, commit with conditions, defer, reject, request more data, or escalate?

## Advisor Roles

Board Brain:
- Orchestrates advisors, preserves the governance boundary, names consensus/dissent, and turns analysis into decision memory.

Finance Advisor:
- Tests cash, ROI, margins, runway, OCF, DRE/P&L, debt, capital allocation, payback, and financial gates.

Operator Advisor:
- Turns decisions into owners, dates, dependencies, operating cadence, leading indicators, and escalation paths.

Growth Advisor:
- Tests market expansion, revenue quality, product/channel readiness, unit economics, and downside if growth is wrong.

Risk Advisor:
- Names visible but unpriced risks: legal, compliance, concentration, controls, data, reputation, ESG, audit, and escalation.

Customer Advisor:
- Tests brand, customer trust, retention, market position, stakeholder perception, demand quality, and customer economics.

Talent Advisor:
- Tests leadership capacity, incentives, succession, key-person risk, hiring gaps, culture, and founder bottlenecks.

## Source Map

Primary governance sources:
- IBGC course/source map in `docs/IBGC_AGENT_TRAINING.md`
- OECD/G20 Corporate Governance Principles 2023
- COSO Enterprise Risk Management
- UK FRC Corporate Governance Code
- NACD Directorship Certification references
- INSEAD International Directors Programme
- Institute of Directors Chartered Director Programme
- Fundacao Dom Cabral executive governance context

These references are used as rubrics and summaries. Proprietary source text is not copied into prompts.

The detailed source/case operating map is in `docs/GOVERNANCE_SOURCE_AND_CASE_PACKS.md`.

## Case Library

The first open case library lives in `lib/board/training-sources.ts` and is exposed through `/admin/agents`.

Cases:
- The New York Times - digital subscription transformation
- Netflix - content investment, cash discipline, culture, and global scale
- Boeing 737 MAX - safety, incentives, and board oversight
- WeWork - governance, controls, and IPO readiness
- Uber - culture, leadership, and control reset
- Facebook / Meta - data trust and stakeholder risk
- Natura - sustainable growth and stakeholder model
- Magazine Luiza / Magalu - digital transformation, marketplace expansion, and profitability discipline
- Petrobras Pasadena - capital allocation and governance controls

These are not copied business-school cases. They are public-source governance scenarios used to stress-test advisor behavior.

LANCE remains the live showcase case and is seeded separately through `scripts/seed-lance.mjs`, so the product does not create duplicate LANCE companies during training-pack refreshes.

## Operating Rule

An advisor output below 55 should be treated as weak and reviewed before using in a client-facing demo. Scores between 55 and 74 are usable but need prompt hardening. Scores of 75+ are acceptable for product demonstration, but still need human judgment before paid advisory use.

## Current Evaluation Implementation

- `lib/board/advisor-rubrics.ts` contains app-side rubrics and bilingual keyword groups for Portuguese and English outputs.
- `scripts/evaluate-advisors.mjs` mirrors the same scoring logic for live Supabase checks.
- `/admin/agents` exposes recent review scores, source coverage, case-library coverage, and closure contribution to super admins.

Latest LANCE showcase check:
- Live company: `LANCE!`
- Latest reviews scored: 7
- Average adherence score after enrichment: 93
- Use this as a demo-quality seed baseline, not as a replacement for future model evals with blind test cases.
