# Security And Operations Review

Last updated: 2026-06-30

## Current Posture

In place:
- Supabase RLS is enabled across core organization, company, governance, decision, follow-up, billing, audit, governance run, and persona review tables.
- Table policies enforce organization/company membership and admin boundaries.
- App uploads and exports use server-side route handlers with service role access, not direct public bucket writes.
- Storage buckets `company-documents` and `board-exports` are private.
- Export signed URLs are time-limited through `EXPORT_SIGNED_URL_TTL_SECONDS` and capped at 24 hours.
- Middleware/API rate-limit buckets exist.
- Password reset, Governance Run, and referral creation have route-level rate limits.
- `/privacy` and `/terms` are public; protected app routes redirect unauthenticated users.

Repeatable checks:
- `npm run qa:security` parses the foundation migration and checks RLS/policy/storage-bucket posture.
- `npm run qa:mobile` checks public mobile routes and protected redirects.
- `npm run qa:exports` checks recent export artifacts and signed URL TTL metadata.

## Review Items Before Paid Production

Still pending:
- Live Supabase dashboard review of storage object policies.
- Staging restore rehearsal from a real backup snapshot.
- Move in-memory rate limits to durable Redis/Upstash or equivalent before meaningful public traffic.
- Add operator tools for failed AI retry/replay, not only inspection.
- Add legal-reviewed privacy policy, terms, DPA/subprocessor page, and AI advisory limitation wording.
- Add structured incident/support runbook.

