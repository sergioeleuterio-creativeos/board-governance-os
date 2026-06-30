# Restore Rehearsal Runbook

Last updated: 2026-06-30

This runbook is the paid-launch rehearsal for recovering Board Governance OS data without touching Creative OS or production records directly.

## Preconditions

- A separate staging Supabase project exists for Board Governance OS restore tests.
- Production Supabase backups are enabled.
- The operator has service-role access for the staging project only.
- No restore rehearsal is performed inside Creative OS.

## Rehearsal Steps

1. Pick one low-risk company or seeded dataset, such as the LANCE showcase.
2. Export current production row counts for:
   - `organizations`
   - `companies`
   - `company_brain_entries`
   - `uploaded_documents`
   - `document_extractions`
   - `governance_cycles`
   - `business_plans`
   - `board_packs`
   - `agent_reviews`
   - `board_sessions`
   - `decisions`
   - `follow_ups`
   - `audit_events`
3. Restore the selected backup into the staging Supabase project.
4. Confirm restored table counts and storage bucket visibility.
5. Compare a sample company record, board pack, decision, and follow-up against production.
6. Generate one Board Pack export in staging.
7. Confirm private storage remains private and only signed URLs expose export artifacts.
8. Record findings in `docs/SHADOW_BOARD_MEMORY.md`.

## Pass Criteria

- Staging restore completes without requiring Creative OS resources.
- Core governance records are readable in staging.
- Private storage buckets remain private.
- Signed export URLs expire according to `EXPORT_SIGNED_URL_TTL_SECONDS`.
- Any missing tables, policies, or storage objects are logged before paid launch.

## Current Status

Not yet rehearsed. This requires a staging Supabase project and a production backup snapshot.
