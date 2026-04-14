# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. It combines public resource discovery, creator storefronts, buyer libraries, trust-aware moderation, Stripe checkout, protected downloads, messaging, reviews, and a markdown-backed blog for SEO and content marketing.

The app is structured for production deployment on Vercel with Cloudflare in front, Supabase for Postgres and Storage, Stripe for payments, and Resend for transactional email.

## What Ships Today

- Public homepage, resource browse, store browse, resource detail, store detail, and blog surfaces
- Creator dashboard with store settings, resource creation/editing, sales, analytics, and payouts
- Buyer account flows including library access, purchases, reviews, follows, and creator messaging
- Admin moderation for queued resources, marketplace reports, recent activity, and creator trust context
- Email verification gates for high-trust actions like purchases, reviews, follows, messaging, and reporting
- Stripe Checkout plus webhook-based fulfilment for paid resources
- Optimized image uploads for thumbnails, previews, logos, and banners
- SEO metadata, sitemap, structured data, RSS feed, and crawlable public content

## Public Architecture

The public site is designed to stay lean and crawlable:

- public catalog pages are cache-first and SEO-oriented
- resource and store detail pages stay static-friendly
- viewer-specific state is fetched separately on the client
- logged-in actions use neutral loading states instead of flashing incorrect logged-out CTAs
- blog posts are authored in markdown and rendered as public content

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

## Core Product Areas

### Public marketplace

- browse resources by category, tag, and search
- browse creator stores
- view resource detail pages with previews, reviews, related content, and trust context
- view store pages with follow, message, and report entry points
- read blog content that links naturally into marketplace pages

### Buyer experience

- email/password login with optional Google sign-in
- free and paid resource claiming/purchase flows
- protected download access through the buyer library
- reviews for purchased resources
- follows, messages, and reporting

### Creator experience

- public store profile with logo, banner, bio, and publishing controls
- resource creation and editing with taxonomy, previews, pricing, and main-download uploads
- sales and analytics views
- payout readiness and Stripe onboarding flow

### Admin and trust

- moderation queue for resources awaiting review
- open resource and store reports
- creator trust scoring and moderation context
- recent resource and store visibility into marketplace health

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Auth | Auth.js / NextAuth v5 beta |
| Database | PostgreSQL on Supabase |
| ORM | Prisma 6 |
| Storage | Supabase Storage |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Styling | Tailwind CSS |

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

- `DIRECT_URL` for Prisma schema operations when you want a direct database connection
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

Implemented today:

- credentials auth with bcrypt password hashes
- optional Google OAuth
- JWT-backed sessions
- throttled auth-user refreshes to reduce unnecessary Prisma reads
- secure cookies in production
- email verification gating for sensitive actions
- CSRF protection on state-changing form submissions
- redirect validation
- origin validation on state-changing API routes
- database-backed rate limiting with fallback behavior
- server-side authorization checks for ownership and role-protected actions
- Stripe webhook signature verification
- security headers via Next.js config

Not implemented yet:

- Apple OAuth
- CAPTCHA / Turnstile
- password reset flow

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npm run db:generate
```

### 3. Push the schema

```bash
npm run db:push
```

If your local machine cannot reach the direct database host, run the equivalent SQL from Supabase SQL Editor instead.

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
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes |
| `npm run db:migrate` | Run Prisma migrations in development |
| `npm run db:seed` | Seed demo data |
| `npm run db:backfill-public-state` | Backfill denormalized public file-state columns |

## Production Notes

- anonymous traffic should mostly hit cached public surfaces
- dynamic compute should stay focused on auth, dashboards, uploads, checkout, downloads, moderation, messaging, and webhooks
- Stripe webhook fulfilment is the server-side source of truth for paid access
- keep secrets and OAuth credentials out of version control
- if Prisma build steps fail on Windows because the query engine DLL is locked, stop running dev processes and retry

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
