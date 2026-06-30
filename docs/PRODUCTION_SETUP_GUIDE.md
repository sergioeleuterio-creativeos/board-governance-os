# Production Setup Guide

Last updated: 2026-06-29

This guide keeps Board Governance OS separate from Creative OS while the product moves toward production.

## Current Environment Files

- Local secrets live in `.env.local`.
- Public template lives in `.env.local.example`.
- Never copy Creative OS keys into this project unless the service itself is shared by design.
- Vercel production and preview environments need their own values copied from `.env.local`, not committed to git.

## OpenAI

Use a dedicated OpenAI project for Board Governance OS.

1. Open the OpenAI platform and go to API keys.
2. Create or select a project named `Board Governance OS`.
3. Create a new API key for this app only.
4. In `.env.local`, set:
   - `AI_PROVIDER="openai"`
   - `AI_MODEL="gpt-4.1"` for the current implementation default, or another approved model after testing.
   - `OPENAI_API_KEY="..."`.
5. Restart the local Next.js server after changing env vars.
6. Later, repeat the same values in Vercel under Project Settings -> Environment Variables.

Implementation note:
- The current AI adapter uses OpenAI chat completions in `lib/board/ai.ts`.
- Model selection is env-driven, so changing models should not require code changes.
- The future model-routing variables should be left blank until implemented, or filled with real model IDs only. Do not use descriptive values such as `lower-cost model`.
- Agent prompt hardening is still pending; IBGC training will be folded into persona prompts before live paid usage.
- If OpenAI returns `insufficient_quota`, the key reached the API but the OpenAI project/account has no available paid quota. Add billing/credits in the OpenAI platform or switch `AI_PROVIDER="mock"` temporarily for demos.
- Governance Run falls back to the deterministic governance engine when the external AI provider fails, so demos can continue while quota is fixed.

Official reference:
- https://platform.openai.com/docs/quickstart
- https://platform.openai.com/docs/guides/error-codes/api-errors

## Cloudflare Turnstile

Turnstile is optional locally and should be enabled before production.

1. Open Cloudflare Dashboard.
2. Go to Turnstile.
3. Add a widget for `Board Governance OS`.
4. Use a managed challenge unless we later decide on a stricter mode.
5. Add hostnames:
   - `localhost` for local testing.
   - `board-os.ai`.
   - `www.board-os.ai`.
   - the Vercel preview domain if we want preview testing with Turnstile.
6. Copy the site key into `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
7. Copy the secret key into `TURNSTILE_SECRET_KEY`.
8. Restart local dev and verify the login page renders the widget.
9. Add the same keys in Vercel env vars.

Implementation note:
- The login page renders Turnstile only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` exists.
- `/api/auth/turnstile` verifies tokens server-side.
- CSP has been updated for `https://challenges.cloudflare.com`.

Official reference:
- https://developers.cloudflare.com/turnstile/

## Supabase Auth

Sergio already created the dedicated Supabase project:

- `https://supabase.com/dashboard/project/jzmwrwzrmpjftuirqljc`

Password-only decision:
- Magic links are disabled in the Board Governance OS login UI.
- Users need an invited Supabase Auth account with a password set.
- If a user was created through a magic-link-only flow, set or reset their password in Supabase before asking them to log in.
- Password recovery links should redirect to `https://www.board-os.ai/reset-password`.
- The app also has a first-party password reset request flow from `/login`.

Important email note:
- Resend env vars power Board Governance OS product emails.
- Supabase Auth password recovery emails are still sent by Supabase Auth unless Supabase SMTP is configured.
- For production password recovery, configure Supabase Auth SMTP with Resend SMTP credentials, or replace Supabase recovery emails with a custom admin/invite flow.

Production checklist:
1. Supabase Dashboard -> Authentication -> URL Configuration.
2. Set Site URL to the production app URL.
3. Add redirect URLs for local and production:
   - `http://localhost:3001/auth/callback`
   - `http://localhost:3001/reset-password`
   - the active local port if different during testing.
   - `https://www.board-os.ai/auth/callback`
   - `https://www.board-os.ai/reset-password`
   - `https://board-os.ai/auth/callback`
   - `https://board-os.ai/reset-password`
   - `https://www.board-os.ai/**`
   - `https://board-os.ai/**`
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. It must never be exposed as a public env var.

## Vercel And Subdomain

The product should live on a subdomain, not a path under another app.

1. Push this repo to a private GitHub repository for Board Governance OS.
2. In Vercel, create a new project from that repository.
3. Set project name to `board-os`. If Vercel says `board-governance-os` already exists, that is only a Vercel project-slug conflict; the custom domain can still be `board-os.ai`.
4. Set framework preset as Next.js. If Vercel shows `Other`, change it manually to `Next.js`.
5. Keep root directory as `./`.
6. Add production env vars from `.env.local`:
   - Supabase URL, anon key, service role key, storage bucket names.
   - OpenAI key and model settings.
   - Turnstile keys.
   - Email provider keys.
   - Stripe placeholders can remain blank until Stripe is ready.
7. Deploy a preview.
8. In Vercel Project Settings -> Domains, add `board-os.ai`.
9. Add `www.board-os.ai`.
10. In DNS, create the records Vercel requests.
11. If `www` is canonical, set `board-os.ai` to redirect to `www.board-os.ai`.
12. Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://www.board-os.ai`.
13. Update Supabase Auth redirect URLs and Cloudflare Turnstile hostnames with both `board-os.ai` and `www.board-os.ai`.

Official reference:
- https://vercel.com/docs/projects/domains

## Brand Metadata

Deployment-facing brand assets are served from:
- `/brand/mark.png`
- `/brand/logo-light.png`
- `/brand/logo-dark.png`
- `/brand/site-thumbnail.png`

The app metadata should expose:
- favicon and Apple touch icon from `/brand/mark.png`
- Open Graph and Twitter card image from `/brand/site-thumbnail.png`
- canonical URL from `NEXT_PUBLIC_APP_URL`
- web manifest at `/manifest.webmanifest`
- robots file at `/robots.txt`
- sitemap at `/sitemap.xml`

After changing brand assets or `NEXT_PUBLIC_APP_URL`, redeploy Vercel and test:
- `https://www.board-os.ai/brand/site-thumbnail.png`
- `https://www.board-os.ai/manifest.webmanifest`
- `https://www.board-os.ai/robots.txt`
- `https://www.board-os.ai/sitemap.xml`

Repeatable check:
- Run `npm run verify:production` after a production deploy.
- To check another host, run `npm run verify:production -- https://preview-or-custom-host`.

## Public Route Posture

Only these surfaces should be public:
- `/`
- `/login`
- `/reset-password`
- `/auth/callback`
- metadata assets such as manifest, robots, sitemap, icon, and brand images
- auth utility endpoints under `/api/auth`
- Vercel Cron endpoint `/api/cron/reminders`, protected by `CRON_SECRET`
- Stripe webhook endpoint `/api/billing/webhook`, protected by Stripe signature verification

All product routes such as `/dashboard`, `/company`, `/board-pack`, `/shadow-board`, and `/decisions` must redirect unauthenticated visitors to `/login`.

## Email

Recommended split:
- Google Workspace handles human mailboxes, identity, calendar, and normal business email.
- Resend handles product email: login-adjacent notices, governance reminders, board session notifications, and later newsletters.

Resend setup:
1. Create a Resend account.
2. Add the sending domain `board-os.ai`, or use a sending subdomain if Resend recommends it during setup.
3. Add the DNS records Resend gives you.
4. Verify the domain in Resend.
5. Add `RESEND_API_KEY` and `EMAIL_FROM="Board Governance OS <mail@board-os.ai>"` to `.env.local` and Vercel.

Supabase Auth SMTP with Resend:
1. In Resend, create SMTP credentials.
2. In Supabase -> Project Settings -> Authentication -> SMTP Settings, enable custom SMTP.
3. Use the Resend SMTP host, port, username, and password from Resend.
4. Set sender details to `Board Governance OS <mail@board-os.ai>`.
5. Re-test `/login` -> forgot password.

Google setup, later:
1. Create the Board Governance OS Google Cloud project.
2. Configure OAuth consent.
3. Create OAuth credentials only if we need Google Calendar/Gmail integration.
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

Official reference:
- https://resend.com/docs/dashboard/domains/introduction

## Cron Reminders

The repo includes `vercel.json` with:
- path: `/api/cron/reminders`
- schedule: `0 12 * * *`

This runs daily at 12:00 UTC, approximately 09:00 in Sao Paulo.

Setup:
1. Generate a long random secret.
2. In Vercel, open the Board Governance OS project.
3. Go to Settings -> Environment Variables.
4. Add `CRON_SECRET` with the generated value.
5. Apply it to Production. Preview/Development can also use it if needed.
6. Redeploy production so Vercel picks up both `vercel.json` and the env var.
7. After deploy, verify the route manually with:
   `curl -H "Authorization: Bearer YOUR_SECRET" https://www.board-os.ai/api/cron/reminders`

Expected behavior:
- Without the header, the route returns `401`.
- With the correct header and `RESEND_API_KEY`, due scheduled reminders are sent.
- Sent reminders move to `sent`; failed reminders move to `failed`.

Official reference:
- https://vercel.com/docs/cron-jobs

## Backup And Export

The operating policy lives in `docs/BACKUP_EXPORT_POLICY.md`.
Export QA lives in `docs/EXPORT_QA_CHECKLIST.md`.

Production stance:
- Supabase database backups are the source of truth for structured recovery.
- Supabase Storage buckets stay private; app routes or signed URLs should mediate access.
- Generated board export links expire by default and are bounded by `EXPORT_SIGNED_URL_TTL_SECONDS`, capped at 24 hours.
- Restore rehearsals should happen in a separate staging Supabase project, never inside Creative OS.

Repeatable checks:
- `npm run qa:exports` checks recent export artifacts, content metadata, sizes, and signed URL policy.
- `npm run qa:mobile` checks public mobile routes and protected-route redirects with a mobile user agent.

## Stripe

Stripe is intentionally parked for now.

Current stance:
- Keep pricing pages and UI-ready surfaces.
- Do not enforce paid sessions yet.
- Leave Stripe env vars empty or placeholders until the Stripe account, products, prices, and webhooks exist.

Later implementation:
- Stripe Checkout route.
- Customer portal.
- Webhook route.
- Subscription and usage package sync into Supabase.
- Usage enforcement before starting paid Board Governance Sessions.

## Agent QA And Source Discipline

Advisor adherence is now code-backed in `lib/board/advisor-rubrics.ts`.

Current production behavior:
- Board Brain prompts include advisor-specific rubrics and a curated open case library.
- `/admin/agents` gives super admins a browser-visible view of latest advisor reviews and adherence signals.
- `scripts/evaluate-advisors.mjs` can be run against live Supabase to score recent `agent_reviews`.

Source hierarchy:
- IBGC remains the primary Brazilian governance source.
- External calibration sources include OECD/G20 corporate governance principles, COSO risk framework, UK FRC Corporate Governance Code, NACD certification role expectations, INSEAD director training, and Fundacao Dom Cabral executive-governance context.
- Public company cases are used as calibration patterns, not as copied training material.

Operational rule:
- An advisor output is not production-grade unless it shows role-specific evidence, tradeoffs, board-level questions, risks, and a clear closure recommendation.

## Notifications And Rate Limits

Product notifications use Resend through `lib/email/send.ts`.

Currently wired events:
- daily cron reminders from `/api/cron/reminders`
- board-pack-ready notice after Governance Run completion
- session-closed notice after Shadow Board session closure
- referral triage notice to configured admins after a referral request

Hardening now in place:
- password reset requests are rate-limited
- Governance Run creation is rate-limited
- referral creation is rate-limited
- file uploads enforce `MAX_FILES_PER_REQUEST` and `MAX_FILE_BYTES` / `MAX_UPLOAD_MB`
- export signed URLs have a bounded TTL
- `/privacy` and `/terms` are public legal posture pages
- `/admin/ai` shows AI fallbacks, model errors, and operational email delivery events

Production check:
- Keep `BOARD_GOVERNANCE_ADMIN_EMAILS` current so admin triage emails reach the right people.
- Confirm `RESEND_API_KEY` and `EMAIL_FROM` exist in Vercel before relying on event notifications.
