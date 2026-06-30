# Export QA Checklist

Last updated: 2026-06-30

Use this before a polished client demo of Board Pack exports.

## Automated Checks

Run:

```bash
npm run qa:exports
```

Pass criteria:
- latest export artifacts exist
- artifact size is non-trivial
- content type is recorded
- new artifacts record signed URL TTL and no artifact exceeds 24 hours
- older artifacts without TTL metadata are warnings, not launch blockers

## Visual Checks

For the latest Board Pack, export and open:

- HTML: clear title page, source note, sections, readable financial tables
- PDF: not blank, page breaks readable, no raw JSON blocks
- PPTX: opens without repair prompt, title and section slides readable
- DOCX: opens without repair prompt, headings and paragraphs readable
- XLSX/CSV: table rows structured enough for audit/reuse

## Current Caveat

The export route now avoids raw JSON in client-facing artifacts and records signed URL TTL metadata. Full visual QA still needs a manual open-through pass on generated files before a high-stakes demo.
