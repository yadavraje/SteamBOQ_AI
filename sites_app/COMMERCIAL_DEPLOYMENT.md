# SteamBOQ external commercial deployment

This release is designed for an external Cloudflare Worker with D1 persistence, Supabase email OTP and Razorpay subscriptions. The existing `chatgpt.site` deployment remains a private, non-payment test surface. Checkout is blocked in code on every `*.chatgpt.site` hostname.

## 1. Launch boundaries

Do not enable `PAYMENTS_ENABLED=true` until all of these are complete:

- legal entity, address, support email, GST/tax invoice process and payment-provider KYC;
- counsel-approved Terms, Privacy Notice, refund/cancellation language and engineering-liability allocation;
- licensed market/supplier rate rights and a production feed returning dated provenance;
- production D1 database with migrations applied and tested backups/recovery;
- Supabase production project, email delivery and abuse/rate-limit settings;
- Razorpay test-mode subscription lifecycle and signed webhook verification;
- custom-domain TLS, monitoring, alerting, access logs and a rollback owner.

The app enforces this boundary independently: external mode, D1, authentication, business details, legal approval, licensed-rate approval, Razorpay secrets and `PAYMENTS_ENABLED=true` must all be present before checkout can be created.

## 2. Create the Cloudflare deployment

Use a current Wrangler release. Cloudflare recommends JSON configuration for new projects and treating that file as the source of truth.

```bash
cp wrangler.jsonc.example wrangler.jsonc
npx wrangler d1 create steamboq-production --location apac
```

Copy the returned D1 UUID into `wrangler.jsonc`, then apply the checked-in migration:

```bash
npx wrangler d1 migrations apply steamboq-production --remote
npm ci
npm test
npm run build
```

The Worker entry point is `dist/server/index.js`; the build embeds the hashed client assets in the Worker bundle.

Cloudflare references: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [D1 commands and migrations](https://developers.cloudflare.com/workers/wrangler/commands/d1/), and [secret management](https://developers.cloudflare.com/workers/configuration/secrets/).

## 3. Configure Supabase email OTP

Create a production Supabase project and set its Site URL to the final SteamBOQ domain. In the email authentication template, include `{{ .Token }}` so users receive the six-digit code expected by the UI. Add the final domain to the permitted redirect/origin configuration and test sign-in, refresh, expiry and sign-out.

Set these production values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon value; intentionally exposed to the browser)

The Worker verifies every bearer token against Supabase before reading projects or entitlements. See [Supabase passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), and [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## 4. Configure Razorpay subscriptions

Complete Razorpay KYC in the correct legal entity. Create monthly Professional and Team plans whose amounts exactly match the displayed INR prices. Put their identifiers in `RAZORPAY_PRO_PLAN_ID` and `RAZORPAY_TEAM_PLAN_ID`.

Add a test-mode webhook:

```text
https://YOUR_DOMAIN/api/billing/webhook
```

Subscribe at minimum to the subscription lifecycle events used for entitlement changes, including authenticated, activated, paused, resumed, halted, cancelled, completed and pending where available. Use a strong, unique webhook secret. The Worker validates the raw-body HMAC, deduplicates event IDs and updates entitlements server-side.

Razorpay references: [Subscriptions overview](https://razorpay.com/docs/payments/subscriptions), [create subscriptions](https://razorpay.com/docs/payments/subscriptions/create/), and [subscription webhook events](https://razorpay.com/docs/webhooks/subscriptions/).

Store secrets interactively; never add them to `wrangler.jsonc` or Git:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put RAZORPAY_PRO_PLAN_ID
npx wrangler secret put RAZORPAY_TEAM_PLAN_ID
npx wrangler secret put RATE_FEED_API_KEY
```

Although Supabase URL/anon and Razorpay key ID are publishable values, using one controlled secret workflow reduces configuration drift.

## 5. Connect the licensed daily rate feed

Configure `RATE_FEED_URL`, `RATE_FEED_API_KEY`, `RATE_FEED_SOURCE_LABEL` and `RATE_MAX_AGE_DAYS`. The feed must return the JSON contract documented in `README.md`. A payload with an invalid date, future date, excessive age or out-of-bounds factor is rejected. A rejected or unavailable feed visibly falls back to “supplier review required”; it is never relabelled live. Set `RATE_LICENSE_APPROVED=true` only after the owner has documented the contractual right to use and display the selected rate data.

## 6. Stage, verify, then enable payments

Keep both launch flags false during staging:

```text
LEGAL_REVIEW_APPROVED=false
RATE_LICENSE_APPROVED=false
PAYMENTS_ENABLED=false
```

Run the preflight with the production values loaded into the shell:

```bash
npm run check:commercial
```

Test at least:

1. OTP request, verify, refresh and sign-out.
2. Free project limit and paid entitlement transitions.
3. Project ownership isolation using two separate accounts.
4. Razorpay test subscription success, pause, cancellation, failure and duplicate webhook delivery.
5. Feedback and pilot-lead capture without confidential estimator context.
6. Live-rate freshness failure and supplier-review fallback.
7. Terms/privacy version recording before checkout.
8. Custom-domain security headers, HTTPS, backup recovery, monitoring and rollback.

After counsel approval, set `LEGAL_REVIEW_APPROVED=true`. Enable `PAYMENTS_ENABLED=true` only for the final production release, rerun preflight/tests, build, and deploy:

```bash
npm test
npm run build
npx wrangler deploy
```

## 7. Operations after launch

- Reconcile Razorpay subscriptions and D1 entitlements daily during the first month.
- Review stale/failed licensed rates every business day.
- Triage customer feedback weekly and close the loop with users who consented to follow-up.
- Monitor auth abuse, webhook failures, 5xx errors and database capacity.
- Retest engineering benchmarks and commercial contract tests before every deployment.
- Publish any changed Terms or Privacy version and retain the acceptance record.
