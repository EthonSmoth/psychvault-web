# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. The app supports public browsing, creator storefronts, trust-aware moderation, protected downloads, reviews, follows, messaging, Stripe checkout, and email-based account verification.

This repo is structured for a production deployment on Vercel with Cloudflare in front, Supabase for Postgres and Storage, Stripe for payments, and Resend for transactional email.

## Current Status

- Public resource and store surfaces are cache-first and SEO-oriented.
- Creator, buyer, admin, checkout, upload, download, messaging, and webhook flows stay dynamic.
- Creator trust scoring feeds moderation and admin review workflows.
- Store viewer state is now rendered server-side to avoid auth-state flicker on store pages.
- Resource and navbar session-dependent UI still hydrate client-side, but they now show loading skeletons instead of incorrect logged-out actions.
- Image uploads for thumbnails, logos, banners, and previews are optimized with `sharp` before storage when possible.
- Security hardening is in place for sessions, redirects, origin validation, CSRF, rate limiting, and server-side authorization.

## Core Features

- Public browse for resources and creator stores
- Resource detail pages with previews, purchase state, reviews, and related content
- Store pages with follows, messaging entry points, and reporting
- Buyer library with protected free and paid download access
- Creator dashboards for store, resource, analytics, sales, and payout management
- Admin moderation for reports, publishing, trust workflows, and audit visibility
- Stripe Checkout plus verified webhook fulfilment
- SEO metadata, sitemap, structured data, and crawlable server-rendered public content

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

## Auth And Security Posture

Implemented today:

- Credentials auth with bcrypt password hashes
- Optional Google OAuth provider
- JWT sessions with explicit 7-day max age
- Lightweight token refresh throttling to avoid unnecessary Prisma reads on every session lookup
- Secure session cookies with `httpOnly`, `sameSite=lax`, and `secure` in production
- Email verification gating for uploads, purchases, follows, messaging, reviews, and reporting
- CSRF protection on state-changing server-action forms
- Centralized safe redirect validation
- Origin validation on state-changing API routes
- Database-backed rate limiting with in-memory fallback
- Generic user-facing error responses with server-side logging only
- Role and ownership checks for protected actions
- Stripe signature verification before webhook processing
- Security headers in Next.js config

Not implemented yet:

- Apple OAuth
- CAPTCHA / Turnstile
- Password reset flow

## Environment

Create a `.env` file in the project root.

Core variables:

```env
DATABASE_URL=
DIRECT_URL=
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
PAYMENTS_AVAILABLE=false
PLATFORM_FEE_BPS=2000

RESEND_API_KEY=
EMAIL_FROM=
SUPPORT_EMAIL=

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Notes:

- `DATABASE_URL` is the pooled runtime connection.
- `DIRECT_URL` is for Prisma schema operations like `db:push`.
- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` should match the canonical deployed domain in production.
- `SUPABASE_DOWNLOADS_BUCKET` should stay private.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are optional, but both must be present to enable Google sign-in.

## Supabase Storage Model

Current recommended setup:

- `psychvault-resources`: public bucket for thumbnails, logos, banners, and preview assets
- `psychvault-downloads`: private bucket for downloadable files

Current app behavior:

- uploads flow through server routes using the service-role client
- non-main image uploads are resized and converted to WebP when optimization succeeds
- preview assets can be rendered publicly
- main downloads are stored as internal storage references
- access is checked in the app before issuing a short-lived signed URL

For the current architecture, broad `storage.objects` policies are not needed for private downloads. The server uses the service-role key, which bypasses RLS for trusted server-side operations.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

### 3. Push Schema

```bash
npm run db:push
```

If your local network cannot reach the Supabase direct database host, apply schema SQL from Supabase SQL Editor instead.

### 4. Optional Seed

```bash
npm run db:seed
```

### 5. Optional Backfill

```bash
npm run db:backfill-public-state
```

### 6. Run Dev Server

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

## Production And Operations Notes

- Anonymous traffic should mostly hit cached/static public surfaces.
- Dynamic compute should stay focused on auth, checkout, downloads, dashboards, uploads, moderation, messaging, and webhooks.
- Stripe webhook fulfilment is the server-side source of truth.
- Rotate any secret that has been exposed in logs, chat, or screenshots.
- Keep Google OAuth and database secrets out of version control.
- If Prisma build steps fail on Windows with a locked query engine DLL, close running dev processes and retry.

## Current Documentation Vault

This repo includes an Obsidian-friendly knowledge base in [`vault/`](./vault).

Start here:

- [vault/Home.md](./vault/Home.md)
- [vault/Architecture.md](./vault/Architecture.md)
- [vault/Auth And Account Security.md](./vault/Auth%20And%20Account%20Security.md)
- [vault/Cost And Performance.md](./vault/Cost%20And%20Performance.md)
- [vault/Deployment And Infra.md](./vault/Deployment%20And%20Infra.md)

Git note:

- Markdown docs in `vault/` are meant to stay tracked.
- Local Obsidian app state in `vault/.obsidian/` is now intended to stay out of Git.
- Renaming the folder to `.vault` is optional for local preference, but the ignore rule is what actually prevents Git noise.

## Near-Term Focus

- keep public request cost low while preserving strong SEO
- keep trust, moderation, and admin workflows aligned with real marketplace risk
- decide whether Apple OAuth is worth the extra setup burden
- add Turnstile only if signup abuse becomes meaningful
- keep docs, env setup, and infra notes aligned with the shipped app

## License

This repository does not currently declare a license.
