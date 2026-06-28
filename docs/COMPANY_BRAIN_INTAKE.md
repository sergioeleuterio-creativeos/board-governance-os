# Company Brain Intake

Last updated: 2026-06-26

Sprint 4 built the intake workflow and now writes the structured intake payload to the live Board Governance OS Supabase project.

## Current Flow

- Route: `/company/intake`
- Component: `components/shadow-board/CompanyBrainIntake.tsx`
- Domain and scoring: `lib/shadow-board/intake.ts`
- API contract: `/api/company-brain/intake`
- Server persistence: `lib/shadow-board/intake-persistence.ts`
- File upload API: `/api/company-brain/intake/files`

The API returns:
- `mode: live-supabase`
- `persisted: true` for authenticated saves
- `nextAdapter: supabase-storage-files`
- an intake quality score
- persistence metadata with organization, company, governance cycle, input, and memory-entry counts

Queued files are uploaded after the structured intake save succeeds. The upload route:
- requires an authenticated company admin/founder session
- writes binaries to the private `company-documents` Supabase storage bucket
- creates `uploaded_documents` rows
- adds file-mode `governance_inputs` when a governance cycle is present
- records `company_brain.document_uploaded` audit events
- returns per-file success/error status for the UI

## Intake Sections

- Company profile
- Strategy and challenge
- Financial snapshot
- Team and operating cadence
- Chat intake notes
- Voice-ready transcript notes
- File queue
- Review payload

## Quality Score

The score currently weights:
- company profile: 16%
- strategy: 22%
- finance: 22%
- team: 16%
- chat: 12%
- files: 6%
- review: 6%

The draft is considered ready for a first Governance Run when total score is at least 72 and no more than one important section is missing.

## Supabase Persistence

Authenticated saves now persist:
- profile fields to `companies`
- the intake cycle to `governance_cycles`
- intake fragments to `governance_inputs`
- memory candidates to `company_brain_entries`
- selected files to Supabase storage and `uploaded_documents`

Document extraction now has a first adapter at `/api/company-brain/documents/extract`. It processes uploaded documents into `document_extractions` and promotes a conservative summary into `company_brain_entries`. Deeper structured financial/table extraction is still pending.
