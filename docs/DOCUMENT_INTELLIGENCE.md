# Document Intelligence

Last updated: 2026-06-29

Sprint 5 now has a first production adapter.

## Current Flow

- Upload route: `/api/company-brain/intake/files`
- Extraction route: `/api/company-brain/documents/extract`
- Extraction module: `lib/shadow-board/document-intelligence.ts`
- Storage bucket: `company-documents`
- Tables:
  - `uploaded_documents`
  - `document_extractions`
  - `company_brain_entries`
  - `audit_events`

## Supported Inputs

- PDF through `pdf-parse`
- DOCX through `mammoth`
- PPTX through XML extraction with `jszip`
- XLSX through XML extraction with `jszip`
- CSV and TXT through UTF-8 text extraction

## Persisted Output

For each processed document, the extractor:
- downloads the private storage object
- writes `text`, `summary`, and `memory` rows to `document_extractions`
- writes `financials` rows when board-relevant DRE/P&L, OCF, cash, revenue, margin, or unit-economics signals are detected
- writes `table` rows when spreadsheet-like XLSX/CSV content contains structured financial lines
- updates `uploaded_documents.status`
- stores the summary on `uploaded_documents.summary`
- promotes one conservative memory entry to `company_brain_entries`
- promotes one additional financial memory entry when financial signals or tables are found
- records `company_brain.document_extracted` in `audit_events`

## Financial Table Extraction

The current extractor keeps XLSX rows as tab-separated text and scans those rows for board-relevant finance labels. Detected rows are grouped into:

- `dre_pnl`: DRE/P&L, revenue, margin, EBITDA, profit, costs, OPEX, CAPEX
- `cash_flow`: OCF, cash, runway, burn, debt
- `unit_economics`: CAC, LTV, churn, retention, ARPU, ARR, MRR, ticket, ROI/ROAS
- `financial`: other financial rows worth preserving for board review

Structured rows are stored in `document_extractions.structured_data.financial_tables` for later Board Pack and Company Brain use.

## Verified Live Data

The uploaded file `Creative OS campaign planner.pdf` was processed successfully.

- characters extracted: 5,768
- extraction rows created: 3
- memory entries promoted: 1
- document status: `processed`

## Pending

- Browser control to trigger extraction from UI.
- Source relevance review, so unrelated uploads can be excluded from a company context.
- LLM-assisted table naming and variance interpretation after the first production XLSX samples.
