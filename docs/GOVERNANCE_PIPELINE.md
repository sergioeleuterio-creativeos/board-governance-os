# Governance Pipeline

Last updated: 2026-06-28

Sprints 6 through 10 now have a first production-shaped pipeline.

## Current Flow

- Route: `/api/governance/run`
- AI helper: `lib/board/ai.ts`
- Canonical persistence:
  - `business_plans`
  - `board_packs`
  - `agent_reviews`
  - `board_sessions`
  - `decisions`
  - `follow_ups`
  - `audit_events`
- Compatibility persistence:
  - `governance_runs`

The route can accept explicit run input, or derive a first governance input from `company_brain_entries`.

## Canonical Output

The route creates:
- a ready-for-review business plan
- a ready board pack
- a board financial report scaffold with DRE/P&L, operating cash flow, working capital, liquidity, variance, and board notes
- structured advisor reports for the six governance lenses
- six completed advisor reviews
- an awaiting-founder diagnostic board session
- one decision candidate
- open follow-ups
- a completed compatibility governance run row

## Board Pack Exports

- Route: `/api/board-pack/export`
- Bucket: `board-exports`
- Supported now:
  - HTML
  - CSV
- Table:
  - `export_artifacts`

PDF, PPTX, DOCX, and XLSX export generation remain pending.

## Verified Live Data

The first autonomous diagnostic seed created:
- `business_plans: 1`
- `board_packs: 1`
- `agent_reviews: 6`
- `board_sessions: 1`
- `decisions: 1`
- `follow_ups: 3`
- `governance_runs: 1`
- `export_artifacts: 1`

The HTML export exists in the private `board-exports` bucket.

## Board Pack Structure

Current board pack artifacts should include:
- executive summary
- strategic questions
- financial reports for board review
- risk map
- structured advisor reports
- meeting agenda
- decision candidates

The financial section is now treated as a first-class board artifact, not a supporting appendix. It should cover:
- DRE / Profit and Loss
- OCF / operating cash flow
- working capital and cash conversion
- debt, runway, covenants, and liquidity
- budget vs actual
- forward-looking scenarios and sensitivity notes

The advisor report section should preserve each agent's independent stance, finding, C-level questions, recommendations, and later closure recommendation.

## Pending

- Browser-triggered founder review/approval flow.
- Agent-to-agent challenge rounds in `agent_conversations`.
- Meeting minutes generation.
- PDF/PPTX/DOCX/XLSX export generators.
- Real financial statement parsing and normalized financial tables.
- Usage package enforcement before paid session creation.
