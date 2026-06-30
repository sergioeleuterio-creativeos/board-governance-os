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

The export route now avoids raw JSON in client-facing artifacts and records signed URL TTL metadata.

Latest checked live artifacts were legacy PDF/HTML exports generated before the newest formatting pass. They render, but the PDF is still too plain for a polished client demo and one legacy financial section showed object-like rows. The route has been patched so fresh exports should format those rows as readable labels.

Before a high-stakes demo, generate fresh PDF, PPTX, DOCX, XLSX, HTML, and CSV artifacts from production and open each file visually. The current automated QA confirms artifact health; it does not replace visual review of Office/PDF layout quality.
