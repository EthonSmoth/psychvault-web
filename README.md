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

## Blog And Content Workflow

The blog is built into the app and is intended to support both SEO and topical authority for the marketplace.

- posts live in `content/blog/*.md`
- frontmatter supports `title`, `description`, `publishedAt`, `updatedAt`, `author`, `category`, `tags`, `featured`, `coverImage`, and `coverImageAlt`
- cover images and inline images should live in `public/blog`
- blog index, blog post pages, JSON-LD, RSS, robots, and sitemap entries are already wired up

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
  app/
    (creator)/creator/      Creator dashboard routes (store, resources, analytics, sales, payouts)
    (protected)/messages/   Auth-required messaging routes
    (public)/               Public routes (homepage, resources, stores, blog, library, login, signup...)
    admin/                  Admin moderation panel
    api/                    API routes (auth, checkout, downloads, messages, resources, stores, stripe, upload, webhook)
    templates/              SEO template landing pages
    about/ contact/ faq/    Informational pages
    privacy-policy/ terms-of-service/ refund-policy/  Legal pages
  components/
    analytics/              Google Analytics integration
    auth/                   Login, signup, Google auth button
    blog/                   Blog post card, markdown renderer
    forms/                  Contact, login, resource, signup, store forms
    layout/                 Navbar, footer, mobile menu
    legal/                  Privacy, terms, refund policy content components
    messages/               Conversation list, message thread, composer
    resources/              Resource card, grid, gallery, viewer, browse client, review and report forms
    stores/                 Store header, viewer, browse client, report form
    ui/                     Shared UI primitives (verified badge, form submit button)
  lib/                      Utility modules (auth, CSRF, rate limiting, storage, email, payments, validators, etc.)
  server/
    actions/                Server actions by domain (admin, auth, creator resources, follow, messages, reports, reviews, stores)
    cache/                  Public content cache helpers
    queries/                Database query functions (resources, stores, public content, viewer state)
    services/               Service layer (reviews, resource taxonomy)
  types/                    TypeScript type definitions
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
```

Optional:

- `DIRECT_URL` for Prisma schema operations when you have a working direct database connection
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` if enabling Google OAuth

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
- security headers via Next.js config (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS in production)
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
