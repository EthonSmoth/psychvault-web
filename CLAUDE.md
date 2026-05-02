# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start local dev server (uses Turbopack)
npm run build        # Generate Prisma client + build
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:seed      # Seed demo data via tsx prisma/seed.ts
.\check-drift.ps1   # Detect drift between prisma/schema.prisma and live Supabase DB
```

Do not use `npm run db:push` or `npm run db:migrate`. They fail on PgBouncer transaction mode (port 6543) and the direct DB host is unreachable. All schema changes go through the Supabase SQL Editor.

`check-drift.ps1` now parses the raw diff and outputs plain-English instructions per item (which field, what the DB has, exact `onDelete`/`onUpdate` values to set). It never suggests running SQL against the database.

No test runner is configured. There is no `npm test` command.

On Windows: if `npm run build` fails because the Prisma query engine DLL is locked, stop any running dev process and retry.

## Architecture Overview

PsychVault is a **Next.js 16 App Router** marketplace for psychology resources — creators sell downloadable files to clinician buyers. Pricing is AUD.

### Request flow

Public catalog pages are ISR-cached with Next.js tags (`src/server/cache/public-cache.ts`). Viewer-specific state (ownership, purchase status, follow state) is fetched separately on the client or via server queries, so logged-out and logged-in states don't flash each other's CTAs.

When a creator publishes or admin moderation runs, server actions call `revalidatePublicResources()` / `revalidatePublicStores()` to bust the relevant ISR tags immediately.

### Auth (`src/lib/auth.ts`)

NextAuth v5 beta with a custom `createLinkedPrismaAdapter()` that wraps the standard Prisma adapter. On every OAuth sign-in, the adapter looks up the user's Supabase `auth.users` UUID and sets `User.id` to that UUID, keeping Prisma and Supabase auth in sync. `allowDangerousEmailAccountLinking: true` on the Google provider ensures OAuth sign-ins link into an existing credentials account rather than creating a duplicate.

For credentials sign-up, a Supabase auth user is created first (via `supabase.auth.admin.createUser`), and the returned UUID is used as `User.id` in Prisma. On Prisma failure, the Supabase auth user is rolled back.

Supports credentials (bcrypt), optional Google OAuth, and optional Facebook OAuth. Sessions are JWT-backed. The session JWT caches user state (role, email verified, isSuperAdmin) and only refreshes from the database every 30 seconds (`AUTH_USER_STATE_REFRESH_MS`) to reduce Prisma reads.

Role hierarchy: `BUYER` → `CREATOR` → `ADMIN`. `isSuperAdmin` is a separate boolean on `User`.

### Server action pattern

All mutations live in `src/server/actions/`. Actions call:
1. `auth()` to get session
2. `requireVerifiedEmailOrRedirect()` (`src/lib/require-email-verification.ts`) or `isEmailVerified()` for sensitive actions
3. `verifyCSRFToken(token, sessionId)` (`src/lib/csrf.ts`) for state-changing form submissions
4. A rate limit check via `checkRateLimit()` (`src/lib/rate-limit.ts`) (Postgres-backed, in-memory fallback)
5. The actual Prisma mutation

Action files: `account-actions`, `admin-actions`, `auth-actions`, `blog-comment-actions`, `creator-application-actions`, `creator-resource-actions`, `email-verification-actions`, `follow-actions`, `message-actions`, `refund-actions`, `report-actions`, `resource-actions`, `review-actions`, `store-actions`, `store-danger-action`.

`saveStoreAction` in `store-actions` enforces the AHPRA registration requirement: it checks `user.role === "ADMIN" || user.isSuperAdmin` and only skips the AHPRA validation and write for those users. Non-admin creators get a hard error if the number is missing or fails the regex. The `StoreForm` component accepts an `isAdminOrSuperAdmin` boolean prop and hides the field entirely for admins. The go-live checklist on the creator store page includes an "AHPRA registration number added" item for non-admin creators only.

### Storage (`src/lib/storage.ts`)

Two Supabase buckets:
- `psychvault-resources` (public): thumbnails, logos, banners, preview images
- `psychvault-downloads` (private): paid and free downloadable files

Private files are stored as opaque `supabase://bucket/path` references in the database, never as public URLs. Downloads are served via short-lived signed URLs generated server-side after access checks.

Non-main image uploads are resized and converted to WebP via the upload API route.

### Payments (`src/lib/stripe.ts`, `src/lib/stripe-connect.ts`, `src/lib/payments.ts`)

Stripe Checkout for paid resources. Webhook at `/api/stripe/webhook` is the server-side source of truth for purchase fulfilment — it creates the `Purchase` record (via `src/server/services/purchase-fulfillment.ts`) and triggers email. `/api/webhook` is a legacy alias pointing to the same handler. Platform fee is configurable via `PLATFORM_FEE_BPS` (default 2000 = 20%). Revenue split logic is in `src/lib/revenue-split.ts`. Stripe Connect is used for creator payouts (`src/lib/stripe-connect.ts`, payout readiness checks in `src/lib/payout-readiness.ts`).

`PAYMENTS_AVAILABLE=false` env var disables paid checkout without code changes.

### Database

Prisma 6 ORM on Postgres (Supabase). **Supabase SQL Editor is the source of truth** for the database schema. `prisma/schema.prisma` is kept in sync with the live database, not the other way around.

Schema change workflow: write SQL in Supabase SQL Editor -> update `prisma/schema.prisma` to match -> `npm run db:generate` -> `.\check-drift.ps1` to confirm zero drift.

Schema is at `prisma/schema.prisma`. `User.id` is a UUID (`@db.Uuid`) defaulting to `gen_random_uuid()`, matching Supabase `auth.users.id`. All foreign key columns that reference `User.id` are annotated `@db.Uuid`.

Key relationships:
- `User` → `Store` (one creator, one store)
- `Store` → `Resource[]`
- `Resource` → `Purchase[]`, `Review[]`, `ResourceFile[]`, `ResourceReport[]`
- `Purchase` → `RefundRequest?`
- `Conversation` ↔ `User` via `ConversationParticipant`

`Store` has `ahpraRegistrationNumber String?` — stored uppercased with whitespace stripped, validated server-side with `/^[A-Za-z]{2,4}\d{5,12}$/`. Never exposed publicly. Admins/superadmins are exempt from supplying it. Required for all other creators on both store create and update.

`Resource` has denormalized columns (`averageRating`, `reviewCount`, `salesCount`, `hasMainFile`) that are updated by server actions to avoid expensive aggregation queries on public pages.

### Moderation

Resources and stores have a `ModerationStatus` enum (APPROVED / PENDING_REVIEW / REJECTED) and an `isPublished` flag. `ModerationEvent` logs every admin action. Creator trust score is computed in `src/lib/creator-trust.ts`. Admin routes live at `/admin`.

### Redirects (`src/lib/redirect-rules.ts`)

All permanent (301) URL redirects are defined in `src/lib/redirect-rules.ts` as a typed `REDIRECT_RULES` array and consumed by `next.config.ts` via `async redirects()`. This is the single place to track URL changes — add an entry here before removing any old route so indexed pages and backlinks stay intact. The file includes commented examples and audit-trail fields (`added`, `reason`).

`next.config.ts` is TypeScript (converted from `.js`) to allow direct import of `REDIRECT_RULES`. `/privacy` and `/terms` are 301-redirected to `/privacy-policy` and `/terms-of-service` here (previously handled as page-level 307s).

### Middleware (`src/proxy.ts`)

Next.js middleware lives at `src/proxy.ts` — Next.js recognises this file as the middleware entry point directly (no separate `middleware.ts` is needed or should be created alongside it). The proxy wraps NextAuth's `auth()` and does two things:
1. Redirects unauthenticated requests to `/creator/*` to `/login`.
2. Sets a per-request CSP response header on every non-static route.

The CSP uses `'unsafe-inline'` for `script-src`. Nonce-based CSP **cannot** be used here because public pages use ISR — cached HTML would carry a stale nonce that doesn't match the middleware-generated nonce on the next request, breaking hydration. Static security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS in production) are set in `next.config.js`.

**Do not** call `headers()` from `next/headers` in `src/app/layout.tsx` or any layout/page that should be statically rendered or ISR-cached. Calling `headers()` opts the entire subtree into dynamic rendering, which breaks ISR and causes `DYNAMIC_SERVER_USAGE` errors in production.

### Security patterns

- CSRF: stateless HMAC token generated per-session (`src/lib/csrf.ts`). Generated at session load, verified in server actions.
- Rate limiting: Postgres `RateLimitState` table is primary store; in-memory Map is fallback. Keys are SHA-256-hashed before storage.
- Email verification gate: sensitive actions (purchases, reviews, follows, messaging, reporting) call `requireVerifiedEmailOrRedirect()`.
- Input sanitization: `src/lib/input-safety.ts` handles user text before storage or email rendering.
- CSP set per-request in `src/proxy.ts` (middleware). Static headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS in production) in `next.config.js`.

### Blog and content

Blog posts are markdown files in `content/blog/*.md`. The blog system reads these at build/request time — no CMS. Cover and inline images go in `public/blog/`. Template SEO landing pages are defined statically in `src/lib/template-landing-pages.ts`.

Existing blog posts (as of May 2026):
- `how-to-make-psychoeducation-handouts-clinician-friendly.md`
- `how-to-write-psychology-progress-notes.md`
- `ndis-report-template-checklist.md`
- `psychology-resources-australia.md`
- `psychology-templates-free-download.md`
- `reasonable-and-necessary-ndis-funding-criteria.md`
- `sell-psychology-resources-without-looking-spammy.md`
- `lbpp-76-weekly-system-blog-post.md` — LBPP-76 logbook weekly system guide for 5+1 provisional psychologists
- `clinical-hours-trap-clinical-masters.md` — risks when admin issues force an early exit from a clinical masters and what it means for 5+1 hours and registration
- `what-good-supervision-actually-feels-like.md` — green flags, red flags, and grey zones in the supervisory relationship for provisional psychologists
- `national-psychology-examination-how-to-prepare.md` — NPE structure (150 questions, 4 domains, 70% scaled pass mark), study strategy, OLP vs test centre delivery, and the three-strike policy
- `what-are-neuroaffirming-templates-and-why-do-they-look-different-from-standard-clinical-resources.md` — what neuroaffirming templates are, why the visual and language conventions differ, and how to use them

#### Blog image generation workflow (as of May 2026)

All blog illustrations use a **Risograph two-colour flat-print aesthetic** (amber + accent on cream, visible halftone grain and ink misregistration).

Images are generated via **ChatGPT (GPT-4o image generation)** one prompt at a time, then downloaded via authenticated Node.js fetch and processed with sharp. The entire pipeline runs autonomously — no OS save dialogs, no user confirmation needed.

**Autonomous workflow — exact steps:**

1. **Write the post first.** Image references use the final `/blog/{slug}-{descriptor}.jpg` paths before images exist. Prompts live in each image's alt text.

2. **Extract cookies once per session** (reuse until 401):
   ```js
   // Playwright: page bc367268-932c-4c37-bc03-7af3cb45d1c2 (ChatGPT)
   const cookies = await page.evaluate(() => document.cookie);
   ```
   Write to `dl-cookies.txt` at repo root:
   ```powershell
   Set-Content -Path 'dl-cookies.txt' -Value $cookies -NoNewline
   ```

3. **Submit each prompt** via `type_in_page` into `div[contenteditable="true"]`, then `key: Enter`.

4. **Poll for completion** — do NOT use screenshots. Poll with Playwright until image count increases:
   ```js
   const imgs = await page.evaluate(() => {
     const all = Array.from(document.querySelectorAll('main img'));
     return [...new Set(all.filter(i => i.src.includes('file_')).map(i => i.src))];
   });
   ```
   Poll every ~15 seconds. Average generation time is 60–75 seconds.

5. **Get the new image URL** — it's the last entry in the deduped array above.

6. **Update `dl-temp.js`** with the new URL and destination filename, then download:
   ```powershell
   node dl-temp.js
   ```
   `dl-temp.js` reads cookies from `dl-cookies.txt` automatically. If it exits non-zero with HTTP 401, refresh cookies (repeat step 2).

7. **Repeat steps 3–6** for each image. ChatGPT free tier rate-limits to ~3–4 images per 10 minutes. On hitting a rate limit, record state and resume after the reset window — do not ask the user.

8. **Run sharp** after all raws are in place:
   ```powershell
   node scripts/process-blog-images.mjs
   ```
   - Files ending in `-hero` → 1200×630 → `public/blog/{slug}-hero.jpg`
   - All other files → 800×500 → `public/blog/{slug}-{descriptor}.jpg`
   - `jpeg({ quality: 82, mozjpeg: true })`

9. **Verify**: check that every `![...]( /blog/... )` path in the post matches an existing JPG in `public/blog/`.

**Key files:**
- `dl-temp.js` — reusable one-image downloader. Edit the `IMAGES` array to set URL + dest, then `node dl-temp.js`. Reads cookies from `dl-cookies.txt`.
- `dl-cookies.txt` — session cookies written by the agent. Not committed. Refresh when stale (401).
- `dl-chatgpt-img.js` — legacy single-image downloader. Takes URL + cookie string as CLI args.
- `scripts/process-blog-images.mjs` — sharp batch processor. Safe to re-run; skips already-processed files.

**ChatGPT conversation:** always use the existing conversation at `https://chatgpt.com/c/69f579bc-353c-8323-8b61-268335608dc5` (browser page `bc367268-932c-4c37-bc03-7af3cb45d1c2`) to avoid re-authenticating. Open it if not already open via `open_browser_page`.

### Category routing and SEO conventions

Category browse pages live at `/resources/[slug]` (e.g. `/resources/therapy-worksheets`), not at `/resources?category=slug`. These are statically generated pages with dedicated H1, meta title, and description defined in `src/lib/category-seo.ts`.

Currently defined categories in `CATEGORY_SEO`: `therapy-worksheets`, `ndis-resources`, `psychoeducation`, `report-templates`, `emotional-regulation-tools`, `parent-handouts`, `assessment-tools`. All six are included in `sitemap.ts`.

SEO linking rule: internal links in homepage body copy and navigation must use clean static paths. Never link to `/resources?sort=rating`, `/resources?price=free`, or similar query-param variants from crawlable page content — those filters are client-side UI only and should not appear as `href` values in JSX.

### Email (`src/lib/email.ts`)

Transactional email via Resend. HTML content is escaped with `escape-goat` before sending. Triggered from server actions and the Stripe webhook handler.

### Logbook parser (`src/app/logbook/`, `src/app/api/logbook/`)

Pay-per-parse tool for AHPRA 5+1 internship logbooks. **Stores no logbook content in the database.** All parsed data lives only in React state in the browser and is destroyed when the user leaves the page.

**Data model:**
- `ParseCredit` — tracks paid parse credits per user (upserted by the Stripe webhook on purchase)
- `ParseReceipt` — minimal audit record (timestamp + detected form type only; no logbook content)

Run the following SQL in the Supabase SQL Editor before using this feature:

```sql
CREATE TABLE "ParseCredit" (
  id TEXT NOT NULL,
  "userId" UUID NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE ("userId"),
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE "ParseReceipt" (
  id TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "formType" TEXT NOT NULL,
  "parsedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX "ParseReceipt_userId_idx" ON "ParseReceipt"("userId");
CREATE INDEX "ParseReceipt_userId_parsedAt_idx" ON "ParseReceipt"("userId", "parsedAt");
```

**AHPRA hour requirements** (from `src/lib/logbook-constants.ts`):
- Total internship hours target: 1,500
- Total supervision hours required: 80
- Principal supervisor individual hours required: 50
- Direct client contact hours required: 500
- PD/education hours: 60 (informational)
- **Advisory supervision ratio: ~1:18 per December 2025 guidelines (mandatory ratio removed; shown as a warning, not an error)**
- Telephone supervision cap: 20 hrs (warning)
- Async supervision cap: 10 hrs (warning)
- Short sessions cap: 10 sessions under 1 hour (warning)

**Parse flow:**
1. `POST /api/logbook/parse` receives a multipart file, checks `ParseCredit ≥ 1`
2. XLSX → SheetJS parser (Section A/B/C/D sheets)
3. PDF → `pdf-parse` text extraction + regex (no external API; extracts summary totals from digital PDFs — does not support scanned images)
4. If parse succeeds: decrement `ParseCredit` + create `ParseReceipt` in a single transaction
5. Return result to client; file is discarded — nothing stored

**Stripe setup:**
- Single product: "PsychVault Logbook Parse" at $2.00 AUD; quantities 1, 3, 5 via `price_data`
- Separate webhook endpoint at `/api/logbook/webhook` (uses `LOGBOOK_STRIPE_WEBHOOK_SECRET`)
- On `checkout.session.completed` where `metadata.purchase_type === 'logbook_credit'`: upsert `ParseCredit` incrementing by `metadata.quantity`

**Supervision ratio note:** The prompt that generated this feature specified a 1:17 ratio. The correct current value is 1:18 (December 2025 guidelines). The ratio is also now advisory, not mandatory. The dashboard shows it as a guidance warning. Do not revert to 17.

## Source layout

> For detailed descriptions of every file see `README.md#source-layout`. This section lists what exists so you don't create duplicates.

**Routes (`src/app/`)**
- `(creator)/creator/` — dashboard: store, resources (new/edit/archived), analytics, sales, payouts
- `(protected)/` — account/, apply-creator/, messages/, purchases/[id]/receipt/
- `(public)/` — homepage, blog/[slug], resources/[slug], stores/[slug], search, library, following, login, signup, forgot-password, reset-password, verify-email, unsubscribe, checkout/success
- `admin/` — dashboard, queue, reports, applications, audit, refunds, revenue, stores
- `api/auth/[...nextauth]/`, `api/auth/forgot-password/`, `api/auth/reset-password/`, `api/register/`, `api/verify-email/`
- `api/session/nav/` — lightweight endpoint used by navbar and blog comment section to fetch auth state client-side
- `api/checkout/`, `api/downloads/[resourceId]/`, `api/upload/`, `api/contact/`
- `api/resources/`, `api/stores/`, `api/messages/`
- `api/stripe/webhook/` — Stripe webhook (source of truth for purchase). `api/webhook/` is a legacy alias.
- `api/stripe/connect/` — onboarding, return, dashboard
- `api/logbook/checkout/` — POST: create Stripe Checkout session for parse credits (1, 3, or 5 × $2 AUD)
- `api/logbook/webhook/` — POST: Stripe webhook for logbook credit fulfilment (separate endpoint, uses `LOGBOOK_STRIPE_WEBHOOK_SECRET`)
- `api/logbook/credits/` — GET: return current parse credit balance for authenticated user
- `api/logbook/parse/` — POST: parse uploaded XLSX (SheetJS) or PDF (Claude API); decrements credit; returns result; stores NO logbook content
- `logbook/` — public marketing page at `/logbook`
- `logbook/dashboard/` — auth-required dashboard (React state only; clears on refresh)
- `templates/[slug]/`, `feed.xml/`, `robots.ts`, `sitemap.ts`

**Components (`src/components/`)**
- `analytics/` — google-analytics.tsx
- `auth/` — login-form, signup-form, google-auth-button, submit-button
- `blog/` — blog-post-card, markdown-renderer, blog-comments-section, blog-comment-form, blog-comment-list
- `forms/` — account-form, contact-form, login-form, resource-form, signup-form, store-form
- `layout/` — navbar, navbar-session, footer, mobile-overlay-menu
- `legal/` — privacy-policy-content, terms-of-service-content, refund-policy-content, policy-contact-panel
- `library/` — refund-request-form
- `messages/` — conversation-list, message-thread, message-composer
- `resources/` — resource-card, resource-grid, resource-gallery, resource-viewer, resources-browse-client, review-form, report-resource-form, flag-review-button, checkout-success-pending
- `stores/` — store-header, store-viewer, stores-browse-client, report-store-form
- `ui/` — verified-badge, form-submit-button, breadcrumb

**Lib (`src/lib/`)** — all files that already exist; do not recreate:
`analytics`, `auth`, `auth-guards`, `blog`, `category-seo`, `creator-trust`, `csrf`, `db`, `email`, `email-verification`, `env`, `http`, `input-safety`, `legal`, `logger`, `logbook-constants`, `moderation-events`, `navbar-session-sync`, `password-reset`, `payments`, `payout-readiness`, `performance`, `public-resource-visibility`, `rate-limit`, `redirect-rules`, `redirects`, `request-security`, `require-admin`, `require-email-verification`, `resource-file-state`, `resource-moderation`, `resource-taxonomy`, `revenue-split`, `review-compliance`, `storage`, `stripe`, `stripe-connect`, `supabase`, `super-admin`, `template-landing-pages`, `unsubscribe`, `utils`, `validators`

**Server (`src/server/`)**
- `actions/` — account-actions, admin-actions, auth-actions, blog-comment-actions, creator-application-actions, creator-resource-actions, email-verification-actions, follow-actions, message-actions, refund-actions, report-actions, resource-actions, review-actions, store-actions, store-danger-action
- `cache/` — public-cache.ts
- `queries/` — public-content, resources, resource-viewer, stores, store-viewer
- `services/` — purchase-fulfillment, resource-taxonomy, review-moderation, reviews

**Types (`src/types/`)** — next-auth.d.ts, public.ts, resource-viewer.ts, store-viewer.ts, logbook.ts

## Design system

Tailwind CSS v4 with CSS-native configuration (no `tailwind.config.js`). All components use CSS custom property tokens from `src/app/globals.css`. Do not use hardcoded Tailwind color classes — use semantic tokens like `bg-[var(--card)]`, `text-[var(--text)]`, `border-[var(--border)]`. Primary palette is warm beige/walnut (`--background: #f4eadc`, `--primary: #80502d`).

Reusable component classes live in `src/app/components.css` (e.g. `.card-panel`, `.btn-primary`, `.heading-2xl`). The `cn()` helper in `src/lib/utils.ts` wraps `clsx` + `tailwind-merge` for conditional class composition.

## Environment

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` (Prisma — pooled connection via PgBouncer, port 6543)
- `DIRECT_URL` (Prisma — optional direct connection; the direct host is unreachable in this environment so this can be set to the same value as `DATABASE_URL`)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `CSRF_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`
- `NEXT_PUBLIC_APP_URL`

Optional: `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` for Google OAuth, `AUTH_FACEBOOK_ID` + `AUTH_FACEBOOK_SECRET` for Facebook OAuth (note: `FACEBOOK_APP_ID` is a separate var used only for `fb:app_id` Open Graph meta tags — not for OAuth), `NEXT_PUBLIC_GA_MEASUREMENT_ID` for Analytics, `PAYMENTS_AVAILABLE=false` to disable checkout, `FACEBOOK_APP_ID` for `fb:app_id` Open Graph metadata (used by the Facebook share debugger and Open Graph validators).

Logbook parser (optional, needed to enable `/logbook`):
- `LOGBOOK_STRIPE_WEBHOOK_SECRET` — separate Stripe webhook signing secret for the `/api/logbook/webhook` endpoint; configure a second webhook endpoint in the Stripe dashboard pointing to `https://yourapp.com/api/logbook/webhook` for `checkout.session.completed` events
- No Anthropic API key needed — PDF parsing uses `pdf-parse` text extraction (free, no external API)

## Documentation vault

Detailed architecture and infrastructure notes live in `vault/` (Obsidian-compatible markdown). Start with [vault/Home.md](./vault/Home.md) and [vault/Architecture.md](./vault/Architecture.md).
