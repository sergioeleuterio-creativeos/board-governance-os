# Board Governance OS i18n Foundation

Last updated: 2026-06-26

Sprint 3 makes pt-BR the production language while preserving English and Spanish scaffolds.

## Locale Rules

- Canonical production locale: `pt-BR`
- Supported locales: `pt-BR`, `en`, `es`
- Legacy `pt` cookies are normalized to `pt-BR`
- Message catalogs live in `messages/`
- Shared locale settings live in `i18n/settings.ts`

## Copy Rules

New production UI must not hardcode product copy inside components.

Use:
- `useTranslations(...)` in client components
- `getTranslations(...)` in server components/pages
- message keys grouped by product surface, for example `nav`, `shell`, `companyBrain`, `intake`, `auth`

Acceptable hardcoded text:
- test/demo IDs such as `DEC-118`
- sample company data in `lib/shadow-board/demo-data.ts`
- code labels, enum values, and non-user-facing constants
- temporary static mock data when clearly marked as demo content

## Current Coverage

Already moved into catalogs:
- auth/login copy
- shell/topbar copy
- navigation groups and items
- Company Brain intake copy

Still pending for future i18n passes:
- existing dashboard screen copy
- governance run screen copy
- board pack screen copy
- Shadow Board Review screen copy
- decision memory and follow-up copy
- admin mock table copy

## Implementation Notes

The intake flow was built i18n-first so Sprint 4 can proceed without adding more English-only production copy.
