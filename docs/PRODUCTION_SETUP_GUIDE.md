# Production Setup Guide

Last updated: 2026-06-28

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

Official reference:
- https://platform.openai.com/docs/quickstart

## Cloudflare Turnstile

Turnstile is optional locally and should be enabled before production.

1. Open Cloudflare Dashboard.
2. Go to Turnstile.
3. Add a widget for `Board Governance OS`.
4. Use a managed challenge unless we later decide on a stricter mode.
5. Add hostnames:
   - `localhost` for local testing.
   - `board-os.ai`.
   - `www.board-os.ai` if used.
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

Production checklist:
1. Supabase Dashboard -> Authentication -> URL Configuration.
2. Set Site URL to the production app URL.
3. Add redirect URLs for local and production:
   - `http://localhost:3001/auth/callback`
   - the active local port if different during testing.
   - `https://<subdomain>.<domain>/auth/callback`
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
9. Add `www.board-os.ai` only if you want the www redirect.
10. In DNS, create the records Vercel requests.
11. Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://board-os.ai`.
12. Update Supabase Auth redirect URLs and Cloudflare Turnstile hostnames with `board-os.ai`.

Official reference:
- https://vercel.com/docs/projects/domains

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

Google setup, later:
1. Create the Board Governance OS Google Cloud project.
2. Configure OAuth consent.
3. Create OAuth credentials only if we need Google Calendar/Gmail integration.
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

Official reference:
- https://resend.com/docs/dashboard/domains/introduction

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
