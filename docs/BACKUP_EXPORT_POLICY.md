# Backup And Export Policy

Last updated: 2026-06-29

Board Governance OS stores sensitive founder, company, financial, board-pack, decision, and follow-up context. Backups and exports should preserve continuity without making partner channels or operators accidental owners of client data.

## Data Classes

- Account data: `user_profiles`, memberships, organizations, companies, partner channels.
- Governance data: intake records, company brain entries, governance cycles, board sessions, advisor analyses, decisions, follow-ups, reminders.
- Documents: uploaded PDFs, decks, spreadsheets, extracted text, extraction metadata, generated board exports.
- Operational records: audit events, referrals, billing records, usage ledgers.

## Backup Policy

- Supabase database backups are the system of record for structured data.
- Production backups should be enabled before paid launch.
- Keep point-in-time recovery enabled when the plan supports it.
- Retain daily backups for at least 30 days during private beta.
- Rehearse one restore into a separate staging Supabase project before live paid usage.
- Never restore production data into a shared Creative OS project.

## Storage Policy

- Uploaded source files live in Supabase Storage, not in git.
- Generated board exports should live in the `board-exports` bucket.
- Storage buckets should remain private; access should be through signed URLs or authenticated routes.
- Deleting a company should archive records first, then schedule storage deletion after an explicit retention window.

## Export Policy

Founder/company users should be able to export:
- board packs in HTML/PDF/PPTX
- decision memory in CSV/XLSX/PDF
- follow-ups in CSV/XLSX/PDF
- company brain summaries in PDF/DOCX

Super admins should be able to export:
- audit event slices for incident review
- documents/extraction status inventory
- session and decision history for a given company
- referral request history

Exports must include:
- company name
- governance cycle/session label
- generated timestamp
- source data date range where applicable
- a clear note when content is AI-generated or AI-synthesized
- considered source references when available
- usage limitations for board-review materials

## Retention Defaults

- Keep active company data indefinitely while the account is active.
- Keep closed board sessions and decisions indefinitely unless a client requests deletion.
- Keep failed document extraction logs for 90 days, unless needed for incident review.
- Keep audit events for at least 12 months.
- Keep generated exports for 30 days by default, then expire/regenerate.

## Recovery Runbook

1. Identify the affected organization/company and incident window.
2. Freeze related writes if corruption or accidental deletion is ongoing.
3. Export current affected records for forensic comparison.
4. Restore Supabase backup into a separate staging project.
5. Compare affected tables and storage objects.
6. Reinsert only the required recovered records into production.
7. Record an `audit_events` entry describing recovery scope and operator.
8. Notify affected users if any data was unavailable, changed, or restored.

## Open Implementation Items

- Add admin export endpoints for audit, decisions, follow-ups, and company brain snapshots beyond the current board-pack export surface.
- Add retention cleanup job for expired generated exports.
- Add storage signed URL policy review before paid launch.
- Add staging restore rehearsal notes after the first real dry run.
