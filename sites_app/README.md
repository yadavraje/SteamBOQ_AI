# SteamBOQ Proposal Estimator

Free public-beta application for preliminary saturated-steam demand, line-sizing and pressure-drop screening, priced BOQ generation, scenario comparison, account project storage, and structured tester feedback.

## Public-free v8

The public site requires ChatGPT sign-in. That sign-in also acts as registration: SteamBOQ does not keep a separate password database. The Worker validates the host-provided identity on every protected API request and stores projects under that user ID.

A branded hostname can be attached without replacing ChatGPT sign-in. Add the exact approved hostname to `CUSTOM_SITE_HOSTNAMES` when the Sites custom-domain connection and DNS records are configured; unlisted domains cannot supply account identity.

This edition has no pricing page, checkout, subscription, payment mandate, GST invoice, Supabase dependency, or Razorpay route. It includes:

- Free authenticated access with a default limit of 25 cloud projects per user.
- Private account history for the latest 50 deliberate calculations, with reopen, duplicate, CSV export and deletion controls.
- D1-backed users, projects, and feedback with server-side ownership checks.
- Local browser copies of scenarios as a convenience and recovery layer.
- Same-origin write enforcement, bounded request bodies, security headers, and private caching.
- A licensed-rate adapter that fails closed to an explicitly unverified seed catalogue unless both `RATE_LICENSE_APPROVED=true` and a valid current HTTPS feed are configured.

## Engineering engine

The calculation engine is isolated in `src/engine.js` and protected by Node regression tests. It covers:

- IAPWS-IF97 benchmark property nodes at 0.5 barg intervals, with vapor-density interpolation.
- Energy balance for product heating and direct heat-load modes.
- Iterative saturated-steam pressure-drop screening with diameter-dependent fitting `Le/D` allowances.
- Pressure-drop limit, minimum heat-transfer approach, condensate receiver pressure, and flash-steam effects.
- A blocking no-solution state when no Sch. 40 size through DN200 meets entered limits.
- Separate hydraulic and 5% BOQ material lengths.
- User-entered steam and condensate routes/fittings plus explicit preliminary BOQ allowances.

The calculations remain suitable for budgetary estimation only. Final design requires approved process data, complete P&amp;ID and line list, verified steam tables, detailed hydraulics and water-hammer review, vendor sizing, applicable codes, stress analysis, and site confirmation.

## Run and validate

```bash
npm install
npm test
npm run dev
```

The test command builds both the client and Worker, then runs engineering, API, database-ownership, authentication-gate, no-payment, and client-contract checks.

## Sites persistence

`.openai/hosting.json` binds D1 as `DB`. Deployment migrations are in `drizzle/`; `db/schema.ts` records the application schema contract.

## Licensed daily rate-feed adapter

Configure these only after data-use rights are approved:

- `RATE_LICENSE_APPROVED=true`
- `RATE_FEED_URL` — HTTPS endpoint returning the canonical snapshot.
- `RATE_FEED_API_KEY` — optional bearer token stored as a secret.
- `RATE_FEED_SOURCE_LABEL` — fallback display name for the licensed source.
- `RATE_MAX_AGE_DAYS` — accepted snapshot age, bounded to 1–14 days.

Expected JSON fields:

```json
{
  "as_of": "2026-09-04",
  "source_label": "Licensed source and assessment name",
  "steel_index_change_pct": 1.4,
  "aluminium_index_change_pct": -0.3,
  "supplier_factor": 1.02,
  "region": "Mumbai / Thane",
  "region_factor": 1.03,
  "coverage_pct": 82,
  "confidence": "A — verified"
}
```

Successful rate responses are cached for six hours. Stale, malformed, unlicensed, non-HTTPS, or unavailable feeds revert to the visibly unverified seed catalogue.

## Future monetization

Commercial design work is intentionally dormant and absent from the active Worker/UI. If paid access is reconsidered later, review legal entity, GST and invoicing treatment, payment-provider terms, refund handling, privacy, licensed data rights, and engineering liability before restoring any checkout capability. Historical planning remains in `COMMERCIAL_DEPLOYMENT.md`; it is not the current deployment architecture.
