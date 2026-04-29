# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. It combines public resource discovery, creator storefronts, buyer libraries, trust-aware moderation, Stripe checkout, protected downloads, messaging, reviews, and a markdown-backed blog for SEO and content marketing.

The app is structured for production deployment on Vercel with Cloudflare in front, Supabase for Postgres and Storage, Stripe for payments, and Resend for transactional email. The canonical domain is `psychvault.com.au` and pricing is in AUD.

## What Ships Today

- Public homepage, resource browse, store browse, search, resource detail, store detail, and blog surfaces
- Template SEO landing pages grouped by clinical workflow and search intent
- Creator dashboard with store settings, resource creation/editing, sales, analytics, and payouts
- Buyer account flows including library access, purchases, reviews, follows, and creator messaging
- **AHPRA-aware review compliance system** with 26 hard-trigger rejections, 16 soft-signal flags, and user education
- Admin moderation for queued resources, marketplace reports, recent activity, creator trust context, and flagged reviews
- Email verification gates for high-trust actions like purchases, reviews, follows, messaging, and reporting
- Stripe Checkout plus webhook-based fulfilment for paid resources
- Optimized image uploads for thumbnails, previews, logos, and banners
- SEO metadata, sitemap, structured data, RSS feed, and crawlable public content
- Legal, support, and informational pages (about, contact, FAQ, help, careers, privacy policy, terms of service, refund policy)
- Warm clinical design system built on CSS custom properties (warm beige/amber palette, WCAG AA contrast)

## Public Architecture

The public site is designed to stay lean and crawlable:

- public catalog pages are cache-first and SEO-oriented
- resource and store detail pages stay static-friendly
- viewer-specific state is fetched separately on the client
- logged-in actions use neutral loading states instead of flashing incorrect logged-out CTAs
- blog posts are authored in markdown and rendered as public content
- template landing pages group resources by clinical intent for SEO content clustering
- category browse pages are at `/resources/[slug]` — statically generated with dedicated metadata, not query params
- all internal links in crawlable page content use clean static paths (no `?sort=`, `?price=`, or `?category=` in `href` values)
- **ISR constraint**: never call `headers()`, `cookies()`, or other dynamic Next.js APIs in `src/app/layout.tsx` or any layout that wraps ISR pages — doing so opts the entire route tree into dynamic rendering and causes `DYNAMIC_SERVER_USAGE` errors in production

## Blog And Content Workflow

The blog is built into the app and is intended to support both SEO and topical authority for the marketplace.

- posts live in `content/blog/*.md`
- frontmatter supports `title`, `description`, `publishedAt`, `updatedAt`, `author`, `category`, `tags`, `featured`, `coverImage`, and `coverImageAlt`
- cover images and inline images should live in `public/blog`
- blog index, blog post pages, JSON-LD, RSS, robots, and sitemap entries are already wired up

Published posts (as of April 2026):

| Slug | Topic |
|---|---|
| `how-to-make-psychoeducation-handouts-clinician-friendly` | Psychoeducation handout design |
| `how-to-write-psychology-progress-notes` | Progress note writing |
| `ndis-report-template-checklist` | NDIS report templates |
| `psychology-templates-free-download` | Free psychology templates |
| `reasonable-and-necessary-ndis-funding-criteria` | NDIS funding criteria |
| `sell-psychology-resources-without-looking-spammy` | Creator marketing |
| `lbpp-76-weekly-system-blog-post` | LBPP-76 logbook weekly system for 5+1 provisional psychologists |

Example frontmatter:

```md
---
title: "How to make psychoeducation handouts clinicians actually want to use"
description: "A practical guide to creating psychoeducation handouts that feel credible in session and useful for clients."
coverImage: "/blog/example-cover.webp"
coverImageAlt: "Clinician-ready psychoeducation handouts on a desk"
publishedAt: "2026-04-14"
author: "PsychVault Editorial Team"
category: "Psychoeducation"
tags: ["psychoeducation handouts", "therapy resources"]
featured: true
---
```

Inline images use standard markdown:

```md
![Helpful alt text](/blog/example-inline.webp)
```

Optional caption:

```md
![Helpful alt text](/blog/example-inline.webp "Optional caption")
```

## Template Landing Pages

Template SEO landing pages live at `/templates` and `/templates/[slug]`. Each page is defined in `src/lib/template-landing-pages.ts` and groups existing marketplace resources by clinical intent, tag, and category. They are designed to rank for high-intent clinician searches and link naturally into the browse catalog.

Examples: CBT thought record templates, NDIS report templates, therapy intake forms, treatment plans, and more.

## Core Product Areas

### Public marketplace

- browse resources by category, tag, and search
- search page at `/search` with full filter support
- browse creator stores
- view resource detail pages with previews, reviews, related content, and trust context
- view store pages with follow, message, and report entry points
- following feed for logged-in users at `/following`
- read blog content that links naturally into marketplace pages
- template SEO landing pages at `/templates`

### Buyer experience

- email/password login with optional Google sign-in
- free and paid resource claiming/purchase flows
- protected download access through the buyer library
- reviews for purchased resources
- follows, messages, and reporting

### Creator experience

- public store profile with logo, banner, bio, and publishing controls
- resource creation and editing with taxonomy, previews, pricing, and main-download uploads
- resource archiving and draft management
- sales and analytics views
- payout readiness and Stripe Connect onboarding flow

### Admin and trust

- moderation queue for resources awaiting review
- open resource and store reports
- creator trust scoring and moderation context
- recent resource and store visibility into marketplace health
- **review compliance moderation** for AHPRA-flagged and auto-rejected reviews
  - soft-signal flagged reviews await admin approval
  - hard-trigger rejected reviews with user education feedback
  - moderation stats tracking flagging rate and patterns

### Legal and support pages

| Route | Purpose |
|---|---|
| `/about` | About PsychVault |
| `/contact` | Contact form (Resend-backed) |
| `/faq` | Frequently asked questions |
| `/help` | Help centre |
| `/feedback` | User feedback |
| `/careers` | Careers page |
| `/join-the-team` | Team recruitment |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |
| `/refund-policy` | Refund policy |

Note: `/privacy` and `/terms` also exist as alternate routes pointing to the same legal content.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Runtime | React 19 |
| Auth | Auth.js / NextAuth v5 beta (custom Supabase-linked adapter) |
| Database | PostgreSQL on Supabase |
| ORM | Prisma 6 |
| Storage | Supabase Storage |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Styling | Tailwind CSS v4 + CSS custom properties design system |
| CSS Utilities | `clsx` + `tailwind-merge` via `cn()` helper |
| Rate Limiting | Database-backed (Prisma) with in-memory fallback |

## Database Workflow

**Supabase SQL Editor is the source of truth for the database schema.** `prisma/schema.prisma` is kept in sync with the live database, not the other way around.

Why:

- `prisma db push` and `prisma migrate` use prepared statements that fail on PgBouncer transaction mode (port 6543)
- the direct database host (port 5432) is unreachable from the development network
- Vercel deployments do not run Prisma migrations
- manual SQL in Supabase is the only reliable path for schema changes

Schema change workflow:

1. Write the SQL for the schema change (new columns, indexes, constraints, etc.).
2. Run the SQL in the **Supabase SQL Editor**.
3. Verify the change in Supabase (e.g. query `information_schema.columns`).
4. Update `prisma/schema.prisma` to match what the database now looks like.
5. Run `npm run db:generate` to regenerate the Prisma client.
6. Run `.\check-drift.ps1` to confirm zero drift between schema and database.

Drift checking:

- `check-drift.ps1` compares `prisma/schema.prisma` against the live Supabase database
- it uses `prisma migrate diff` over a session-mode pooler connection (port 5432) that supports prepared statements
- output is plain-English instructions: which FK/field is drifting, what the DB actually has, and the exact `onDelete`/`onUpdate` values to set in `schema.prisma`
- if it reports changes, update the Prisma schema to match the database — not the other way around
- the script loads `DATABASE_URL` from `.env` and switches port 6543 to 5432 automatically

Important:

- do not use `prisma db push` or `prisma migrate` to change the production schema
- treat `prisma/migrations/` as reference history, not as the deployment mechanism
- when drift is detected, the database is correct — update `prisma/schema.prisma` to match it
- `drift.sql` (generated by the script) is gitignored

## Source Layout

```text
src/
  proxy.ts                    Next.js middleware: auth redirect for /creator + per-request CSP header
  app/
    layout.tsx                Root layout (non-async — must not call headers()/cookies())
    globals.css / components.css
    (creator)/creator/        Auth-required creator dashboard
      store/                  Store settings
      resources/              Resource list, new, edit, archived
      analytics/
      sales/
      payouts/
    (protected)/              Auth-required non-creator routes
      account/                Account settings
      apply-creator/          Creator application form
      messages/               Conversations + threads
      purchases/[id]/receipt/ Purchase receipt
    (public)/                 Publicly accessible routes
      page.tsx                Homepage
      blog/                   Blog index + [slug] post pages
      resources/              Browse + [slug] category pages
      stores/                 Browse + [slug] store pages
      search/
      library/
      following/
      login/ signup/
      forgot-password/ reset-password/
      verify-email/
      unsubscribe/
      checkout/success/
    admin/                    Admin panel
      page.tsx                Dashboard
      queue/                  Moderation queue
      reports/                Marketplace reports
      applications/           Creator applications
      audit/                  Audit log
      refunds/                Refund requests
      revenue/                Revenue splits
      stores/                 Store management
    api/
      auth/[...nextauth]/     NextAuth handler
      auth/forgot-password/   Password reset request
      auth/reset-password/    Password reset confirm
      register/               Credentials signup
      verify-email/           Email verification
      session/nav/            Client-side session check (used by navbar + blog comments)
      checkout/               Stripe Checkout session creation
      downloads/[resourceId]/ Signed URL download
      messages/               Message send + read receipts
      resources/              Resource CRUD + viewer state
      stores/                 Store CRUD + viewer state
      stripe/connect/         Connect onboarding, return, dashboard
      stripe/webhook/         Stripe webhook (purchase fulfillment source of truth)
      webhook/                Legacy webhook route (alias)
      upload/                 Image upload + WebP optimization
      contact/                Contact form
      admin/                  Admin API routes
    templates/                SEO template landing pages [slug]
    about/ contact/ faq/ help/ feedback/ careers/ join-the-team/
    privacy/ privacy-policy/ terms/ terms-of-service/ refund-policy/
    feed.xml/ robots.ts sitemap.ts opengraph-image.tsx
  components/
    analytics/                google-analytics.tsx
    auth/                     login-form, signup-form, google-auth-button, submit-button
    blog/                     blog-post-card, markdown-renderer, blog-comments-section,
                              blog-comment-form, blog-comment-list
    forms/                    account-form, contact-form, login-form, resource-form,
                              signup-form, store-form
    layout/                   navbar, navbar-session, footer, mobile-overlay-menu
    legal/                    privacy-policy-content, terms-of-service-content,
                              refund-policy-content, policy-contact-panel
    library/                  refund-request-form
    messages/                 conversation-list, message-thread, message-composer
    resources/                resource-card, resource-grid, resource-gallery, resource-viewer,
                              resources-browse-client, review-form, report-resource-form,
                              flag-review-button, checkout-success-pending
    stores/                   store-header, store-viewer, stores-browse-client, report-store-form
    ui/                       verified-badge, form-submit-button, breadcrumb
  lib/
    auth.ts                   NextAuth config + custom Supabase-linked adapter
    auth-guards.ts            Route-level auth guard helpers
    analytics.ts              GA helper
    blog.ts                   Markdown blog post parsing
    category-seo.ts           Category page SEO metadata
    creator-trust.ts          Trust score computation
    csrf.ts                   HMAC CSRF token generation/verification
    db.ts                     Prisma client singleton
    email.ts                  Resend transactional email
    email-verification.ts     Email verification token helpers
    env.ts                    Environment variable accessors
    http.ts                   Fetch helpers
    input-safety.ts           User text sanitization
    legal.ts                  Legal content helpers
    logger.ts                 Structured logger
    moderation-events.ts      Moderation event logging
    navbar-session-sync.ts    Client-side session state for navbar
    password-reset.ts         Password reset token helpers
    payments.ts               Stripe Checkout session creation
    payout-readiness.ts       Creator payout eligibility checks
    performance.ts            Slow-query logging helpers
    public-resource-visibility.ts  Visibility rules for public resource state
    rate-limit.ts             Postgres-backed rate limiting with in-memory fallback
    redirects.ts              Safe redirect URL validation
    request-security.ts       Origin validation for API routes
    require-admin.ts          Admin role guard
    require-email-verification.ts  Email verification gate
    resource-file-state.ts    Resource hasMainFile state helpers
    resource-moderation.ts    Resource moderation helpers
    resource-taxonomy.ts      Taxonomy constants and helpers
    revenue-split.ts          Platform fee / revenue split logic
    review-compliance.ts      AHPRA-aware review compliance analysis
    review-compliance.test.ts 27 test cases for compliance engine
    storage.ts                Supabase Storage upload/download helpers
    stripe.ts                 Stripe client singleton
    stripe-connect.ts         Stripe Connect helpers
    supabase.ts               Supabase client helpers
    super-admin.ts            Super-admin checks
    template-landing-pages.ts SEO template page definitions
    unsubscribe.ts            Email unsubscribe token helpers
    utils.ts                  cn() clsx+tailwind-merge helper
    validators.ts             Shared input validators
  server/
    actions/
      account-actions.ts
      admin-actions.ts
      auth-actions.ts
      blog-comment-actions.ts
      creator-application-actions.ts
      creator-resource-actions.ts
      email-verification-actions.ts
      follow-actions.ts
      message-actions.ts
      refund-actions.ts
      report-actions.ts
      resource-actions.ts
      review-actions.ts
      store-actions.ts
      store-danger-action.ts
    cache/
      public-cache.ts         ISR tag revalidation helpers
    queries/
      public-content.ts
      resources.ts
      resource-viewer.ts
      stores.ts
      store-viewer.ts
    services/
      purchase-fulfillment.ts
      resource-taxonomy.ts
      review-moderation.ts
      reviews.ts
  types/
    next-auth.d.ts
    public.ts
    resource-viewer.ts
    store-viewer.ts
```

## Design System

The app uses a warm clinical design system built on CSS custom properties in `src/app/globals.css`. All components use semantic tokens rather than hardcoded Tailwind color classes.

Key tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f4eadc` | App canvas (warm beige) |
| `--surface` | `#eddcc5` | Section backgrounds |
| `--card` | `#fbf6ee` | Card and panel backgrounds |
| `--primary` | `#80502d` | Primary actions (warm walnut) |
| `--primary-dark` | `#6a3f21` | Hover states |
| `--accent` | `#97623d` | Accent interactions |
| `--text` | `#3f2d1f` | Primary text (warm charcoal) |
| `--text-muted` | `#624936` | Secondary text |
| `--text-light` | `#7e624c` | Tertiary text |
| `--border` | `rgba(112,79,52,0.24)` | Subtle warm border |
| `--border-strong` | `rgba(112,79,52,0.38)` | Emphasized borders |

Text contrast ratios meet WCAG AA.

## CSS Architecture

Tailwind CSS v4 with CSS-native configuration (no `tailwind.config.js`). Theme tokens are defined as CSS custom properties in `:root`. Content scanning is controlled via `@source` directives in `globals.css`.

Three CSS layers:

- `src/app/globals.css` — Tailwind import, `@source` exclusions, `:root` tokens, global resets, body styles, focus states, interactive transitions, and the `.app-main` layout class
- `src/app/components.css` — Reusable component classes: `.card`, `.card-panel`, `.card-section`, `.card-panel-md`, `.btn`, `.btn-primary`, `.btn-secondary`, `.input-surface`, `.heading-2xl`, `.heading-section`, `.nav-dropdown-item`, `.footer-link`, `.stack`, `.field`, `.tag-amber`, `.badge-verified`
- Tailwind utility classes — Used directly in JSX for layout, spacing, and responsive overrides via `bg-[var(--token)]` arbitrary value syntax

The `cn()` helper in `src/lib/utils.ts` wraps `clsx` + `tailwind-merge` for conditional class composition with proper conflict resolution.

## Environment

Create a `.env` file in the project root.

Core variables from `.env.example`:

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
CSRF_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLIC_BUCKET=psychvault-resources
SUPABASE_DOWNLOADS_BUCKET=psychvault-downloads

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYMENTS_AVAILABLE=true
PLATFORM_FEE_BPS=2000

RESEND_API_KEY=
EMAIL_FROM=
SUPPORT_EMAIL=
SUPPORT_PHONE=
BUSINESS_ADDRESS=

NEXT_PUBLIC_GA_MEASUREMENT_ID=
FACEBOOK_APP_ID=
```

Optional:

- `DIRECT_URL` for Prisma schema operations when you have a working direct database connection
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` if enabling Google OAuth
- `FACEBOOK_APP_ID` — your Facebook App ID; when set, emits `fb:app_id` in the `<head>` on every page for the Facebook Open Graph validator and share debugger

Notes:

- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` should match the canonical deployed domain in production
- `SUPABASE_DOWNLOADS_BUCKET` should remain private
- `PAYMENTS_AVAILABLE` can be used to keep paid checkout dormant until Stripe is ready

## Supabase Storage Model

Recommended buckets:

- `psychvault-resources`: public bucket for thumbnails, logos, banners, and preview assets
- `psychvault-downloads`: private bucket for paid and free downloadable files

Current app behavior:

- uploads flow through server routes using the service-role client
- non-main image uploads are resized and converted to WebP when optimization succeeds
- preview assets can be rendered publicly
- downloadable files are stored as internal storage references
- the app checks access before issuing a short-lived signed URL for downloads

## Security Posture

Implemented:

- credentials auth with bcrypt password hashes, Supabase `auth.users` created first on signup
- optional Google OAuth with `allowDangerousEmailAccountLinking` — OAuth sign-in links into an existing credentials account instead of creating a duplicate
- `User.id` is a UUID pinned to `auth.users.id`, keeping Prisma and Supabase auth in sync
- JWT-backed sessions
- throttled auth-user refreshes to reduce unnecessary Prisma reads
- secure cookies in production
- email verification gating for sensitive actions
- CSRF protection on state-changing form submissions (`src/lib/csrf.ts`)
- redirect validation
- origin validation on state-changing API routes
- database-backed rate limiting with in-memory fallback (`src/lib/rate-limit.ts`)
- HTML-escaped contact and verification emails via `escape-goat`
- server-side authorization checks for ownership and role-protected actions
- Stripe webhook signature verification
- security headers: static headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS in production) via `next.config.js`; CSP set per-request in `src/proxy.ts` (middleware) using `'unsafe-inline'` for `script-src` — nonce-based CSP is incompatible with ISR because cached HTML cannot carry a per-request nonce
- **review compliance analysis** with AHPRA-aware phrase detection, context-sensitive soft signals, and proportionate moderation

Not implemented yet:

- Apple OAuth
- CAPTCHA / Turnstile
- server-revoked sessions (JWT sessions are time-bounded but not individually revocable)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npm run db:generate
```

### 3. Apply database schema changes

All schema changes are made in the **Supabase SQL Editor**, then reflected back into the Prisma schema.

1. Write and run your SQL in Supabase SQL Editor.
2. Update `prisma/schema.prisma` to match.
3. Run `npm run db:generate`.
4. Run `.\check-drift.ps1` to confirm zero drift.

See the [Database Workflow](#database-workflow) section for the full explanation.

Example verification query:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Purchase';
```

### 4. Optional seed

```bash
npm run db:seed
```

### 5. Optional backfill

```bash
npm run db:backfill-public-state
```

### 6. Run the dev server

```bash
npm run dev
```

## Important Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start local development |
| `npm run build` | Generate Prisma client and build the app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `.\check-drift.ps1` | Detect schema drift between `prisma/schema.prisma` and live Supabase DB |
| `npm run db:push` | Do not use — fails on PgBouncer transaction mode; schema changes go through Supabase SQL Editor |
| `npm run db:migrate` | Do not use — migration history only; schema changes go through Supabase SQL Editor |
| `npm run db:seed` | Seed demo data |
| `npm run db:backfill-public-state` | Backfill denormalized public file-state columns |

## Production Notes

- anonymous traffic should mostly hit cached public surfaces
- dynamic compute should stay focused on auth, dashboards, uploads, checkout, downloads, moderation, messaging, and webhooks
- Stripe webhook fulfilment is the server-side source of truth for paid access
- keep secrets and OAuth credentials out of version control
- if Prisma build steps fail on Windows because the query engine DLL is locked, stop running dev processes and retry
- schema changes are rolled out through Supabase SQL Editor — Prisma migration commands are not used
- run `.\check-drift.ps1` after any schema change to confirm the Prisma schema matches the database
- rate limiting uses the shared Postgres database as its primary store so limits apply across serverless instances; in-memory fallback applies if the database is temporarily unreachable

## Review Compliance System

PsychVault includes a production-ready AHPRA-aware review compliance system that protects marketplace integrity while keeping most reviews flowing through.

**How it works:**

- **Hard triggers** (26 phrases): Auto-reject reviews that reference personal mental health outcomes, therapeutic benefits, or client references with clear feedback
- **Soft signals** (16 phrases): Flag borderline outcome-focused wording for manual admin review
- **First-time notice**: User education shown once per session explaining review guidelines
- **Inline guidance**: Gentle tips visible above the review box
- **Real-time suggestions**: Browser-side rewrite suggestions as users type

**Learn more:**

- [AHPRA_REVIEW_SYSTEM_README.md](./AHPRA_REVIEW_SYSTEM_README.md) — System overview and philosophy
- [AHPRA_REVIEW_SYSTEM.md](./AHPRA_REVIEW_SYSTEM.md) — Complete design and implementation
- [ADMIN_REVIEW_MODERATION_GUIDE.md](./ADMIN_REVIEW_MODERATION_GUIDE.md) — Admin training and workflows
- [AHPRA_REVIEW_SYSTEM_QUICK_REFERENCE.md](./AHPRA_REVIEW_SYSTEM_QUICK_REFERENCE.md) — Developer API reference
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) — Tasks and deployment steps

**Code files:**

- `src/lib/review-compliance.ts` — Core compliance analysis engine
- `src/lib/review-compliance.test.ts` — 27 comprehensive test cases
- `src/server/actions/review-actions.ts` — Server-side integration
- `src/components/resources/review-form.tsx` — User-facing UI
- `src/server/services/review-moderation.ts` — Admin utilities

## Documentation Vault

This repo includes an Obsidian-friendly knowledge base in [`vault/`](./vault).

Start here:

- [vault/Home.md](./vault/Home.md)
- [vault/Architecture.md](./vault/Architecture.md)
- [vault/Auth And Account Security.md](./vault/Auth%20And%20Account%20Security.md)
- [vault/Cost And Performance.md](./vault/Cost%20And%20Performance.md)
- [vault/Deployment And Infra.md](./vault/Deployment%20And%20Infra.md)

Git note:

- markdown docs in `vault/` are intended to stay tracked
- local Obsidian app state in `vault/.obsidian/` is intended to stay out of Git

## Near-Term Focus

- keep public request cost low while preserving strong SEO
- keep trust, moderation, and admin workflows aligned with real marketplace risk
- expand the blog and content cluster around high-intent clinician searches
- continue improving creator listing quality, trust signals, and conversion
- keep docs, setup notes, and infrastructure guidance aligned with the shipped app

## License

This repository does not currently declare a license.
