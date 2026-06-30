# Governance Sources And Company Training Packs

Last updated: 2026-06-30

Board Governance OS uses public governance frameworks and public company sources as calibration material. These packs are reasoning patterns and seed scenarios, not copied business-school case text.

## Status

Implemented:
- Structured source map in `lib/board/training-sources.ts`.
- Ten company training packs in `lib/board/training-sources.ts`.
- Prompt case-library feed now uses the structured packs through `caseLibraryForPrompt()`.
- Admin Agents still exposes the case library and source references through `/admin/agents`.
- `/admin/training-packs` creates and refreshes demo/training companies from the packs.
- `/admin/training-packs` can run advisor adherence evaluation against existing pack companies.
- `npm run seed:training-packs -- --reset` refreshes pack companies from the CLI.
- `npm run evaluate:training-packs` scores all training-pack advisor reviews and stores results in `audit_events`.

Not yet implemented:
- Dedicated evaluation-results table for long-term model comparisons. Current persistence uses `audit_events` metadata.
- Licensed ingestion of proprietary HBS/Kellogg/Stanford/MIT/FGV/USP case text. Do not ingest paid case PDFs unless the license allows it.

## Governance Source Map

Primary Brazilian source:
- IBGC training material and internal map: `docs/IBGC_AGENT_TRAINING.md`

International governance and director-role sources now mapped:
- OECD/G20 Principles of Corporate Governance 2023
- COSO Enterprise Risk Management
- UK FRC Corporate Governance Code 2024
- NACD Directorship Certification
- INSEAD International Directors Programme
- Institute of Directors Chartered Director Programme
- Fundacao Dom Cabral executive governance context

Advisor coverage:
- Board Brain: IBGC, OECD, FRC, NACD, INSEAD, IoD, FDC.
- Finance Advisor: IBGC financial governance, OECD disclosure, COSO risk appetite, FRC audit/risk/internal control, NACD.
- Operator Advisor: IBGC meeting discipline, COSO controls, IoD boardroom practice, FDC execution context.
- Growth Advisor: IBGC strategy material, INSEAD/FDC strategy and leadership contexts, company transformation cases.
- Risk Advisor: COSO, OECD, FRC, IBGC integrity/legal responsibility, platform/safety/control cases.
- Customer Advisor: IBGC stakeholder/communication material, Creative OS method, public customer-trust and subscription cases.
- Talent Advisor: IBGC people/succession material, FRC succession/remuneration, INSEAD/IoD board effectiveness, Uber/Netflix culture cases.

## Company Packs

LANCE is maintained as the single live showcase company through `scripts/seed-lance.mjs`, not as a duplicate training-pack company.

The current training packs:

1. The New York Times Company - digital subscription and newsroom/product transformation.
2. Netflix - content investment, cash discipline, culture, and global scale.
3. Boeing - 737 MAX safety, incentives, controls, and board oversight.
4. WeWork / The We Company - founder control, unit economics, governance rights, and IPO readiness.
5. Uber - culture, leadership, platform risk, and control reset.
6. Meta / Facebook - data trust, platform governance, and stakeholder risk.
7. Natura &Co - sustainable growth, stakeholder model, portfolio complexity, and cash discipline.
8. Magazine Luiza / Magalu - retail digital transformation, marketplace expansion, and profitability discipline.
9. Petrobras - Pasadena capital allocation, information quality, controls, and accountability.

Each pack contains:
- Public source URLs.
- Company archetype.
- Business model.
- Governance stage.
- Strategic context.
- Decision pressure.
- Known unknowns.
- Advisor stress map.
- Board questions.
- Training use.

## Business-School Case Boundary

Harvard, Kellogg, Stanford, MIT Sloan, FGV, USP and similar institutions are useful for finding case patterns and bibliographic references. Most full teaching notes and full cases are proprietary. For the product:

- Use public abstracts, official company filings, public reports, court/regulatory/government reports, investor relations pages, and public articles as the default input.
- Use business-school case titles and abstracts only as signposts unless we have license permission.
- Never paste full paid cases or teaching notes into prompts, seeds, embeddings, or memory.
- If we buy/license a case, record the license terms before ingestion.

## How To Use These Packs

Short term:
- Use LANCE as the live showcase company.
- Use the nine training packs to test whether the six advisors stay in their lanes.
- Run one board question per pack and inspect `/admin/agents` for adherence by advisor.

Next build step:
- Add longitudinal evaluation dashboards by model/provider once OpenAI billing is live.
- Move evaluation results from audit metadata into a dedicated table if run volume becomes high.
- Add source freshness review dates and manual pack-retirement status.
