# Document Intelligence

Last updated: 2026-06-27

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
- updates `uploaded_documents.status`
- stores the summary on `uploaded_documents.summary`
- promotes one conservative memory entry to `company_brain_entries`
- records `company_brain.document_extracted` in `audit_events`

## Verified Live Data

The uploaded file `Creative OS campaign planner.pdf` was processed successfully.

- characters extracted: 5,768
- extraction rows created: 3
- memory entries promoted: 1
- document status: `processed`

## Pending

- Browser control to trigger extraction from UI.
- Source relevance review, so unrelated uploads can be excluded from a company context.
- Deeper structured financial/table extraction.
- Human-visible extraction status and retry controls.
