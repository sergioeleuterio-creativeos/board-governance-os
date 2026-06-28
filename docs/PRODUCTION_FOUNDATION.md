# Board Governance OS Production Foundation

Last updated: 2026-06-26

This document captures Sprint 0 decisions and operating rules. Its purpose is to keep Board Governance OS isolated from Creative OS while the product moves from wireframe to production app.

## Product Identity

- Public product name: Board Governance OS
- Agent-review module name: Shadow Board Review
- Internal shorthand allowed in architecture notes: Board OS
- First production language: pt-BR
- Supported language scaffolding: pt-BR, en, es

## Local Isolation

Run Board Governance OS separately from Creative OS.

- Board Governance OS local URL: `http://localhost:3001`
- Preferred command: `npm run dev:shadow`
- Creative OS should keep its own folder, env file, Supabase project, Stripe products, and local port.

Avoid running `npm run build` and `npm run dev` at the same time in this project because both write to `.next`.

If the local Next cache becomes stale:

```bash
rm -rf .next
npm run dev:shadow
```

## Environment Contract

Use `.env.local.example` as the source of truth for required local variables.

Do not commit:
- `.env`
- `.env.*`
- `.env.local.txt`
- copied keys from Supabase, Stripe, OpenAI, Resend, or Google

Required production services:
- Supabase project dedicated to Board Governance OS
- Supabase storage buckets for company documents and generated exports
- Stripe account/products/prices/webhooks dedicated to Board Governance OS
- OpenAI API key
- Vercel project dedicated to Board Governance OS
- Resend and/or Google email credentials

## Deployment Posture

Deployment target: Vercel.

URL posture: subdomain-based deployment. Final subdomain is still open until domain ownership/DNS are confirmed.

Production deployment checklist:
- Vercel project connected to this repo/project only
- Vercel env vars filled from `.env.local.example`
- Supabase redirect URLs include local, preview, and production URLs
- Stripe webhook endpoint points to the Vercel production URL
- Resend sender/domain is verified
- Storage buckets exist with private access
- RLS migration applied before real client data

## Production Safety Rules

- Treat Board Governance OS and Creative OS as separate products.
- Never reuse Creative OS Supabase project, Stripe products, prompts, agent memory, or billing events.
- User-uploaded files live in Supabase storage, not in the repo.
- Generated exports live in Supabase storage and are linked through `export_artifacts`.
- Board sessions are the billable usage unit.
- Agents must recommend a closure path, not only produce commentary.

## Sprint 0 Completion Criteria

- Product approvals recorded in memory.
- Repo has a dedicated dev script for port `3001`.
- Env template includes Supabase, Stripe, OpenAI, Vercel, email, storage, billing, and safety limits.
- Git ignore rules protect all real env files.
- Production docs exist for the next implementation sprints.
