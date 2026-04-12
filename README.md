# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. The app supports public browsing, creator storefronts, moderated listings, protected downloads, reviews, messaging, Stripe checkout, and email-based account verification.

This repo is already shaped around a production deployment on Vercel with Cloudflare in front, Supabase for Postgres and Storage, Stripe for payments, and Resend for transactional email.

## Current Status

- Public marketplace pages are optimized for cache-first delivery.
- Auth, checkout, downloads, uploads, dashboards, moderation, and webhooks stay dynamic.
- Credentials auth and Google OAuth are both supported.
- Private downloads are issued as short-lived signed Supabase URLs after entitlement checks.
- Security hardening is in place for sessions, redirects, origin validation, rate limiting, and error handling.

## Core Features

- Public browse for resources and creator stores
- Resource detail pages with previews, ratings, and related content
- Buyer library with protected free and paid download access
- Creator dashboards for store and resource management
- Reviews, follows, and creator messaging
- Admin moderation for reports, publishing, and trust workflows
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
- Secure session cookies with `httpOnly`, `sameSite=lax`, and `secure` in production
- Email verification gating for sensitive marketplace actions
- CSRF protection on server-action forms
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

- `psychvault-resources`: public bucket for thumbnails and preview assets
- `psychvault-downloads`: private bucket for purchased/downloadable files

Current app behavior:

- uploads flow through server routes using the service-role client
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
- Dynamic compute should stay focused on auth, checkout, downloads, dashboards, uploads, moderation, and webhooks.
- Stripe webhook fulfilment is server-side source of truth.
- Rotate any secret that has been exposed in logs, chat, or screenshots.
- Keep Google OAuth and database secrets out of version control.
- If Prisma build steps fail on Windows with a locked query engine DLL, close running dev processes and retry.

## Current Documentation Vault

This repo includes an Obsidian-ready knowledge base in [`vault/`](./vault).

Start here:

- [vault/Home.md](./vault/Home.md)
- [vault/Architecture.md](./vault/Architecture.md)
- [vault/Auth And Account Security.md](./vault/Auth%20And%20Account%20Security.md)
- [vault/Deployment And Infra.md](./vault/Deployment%20And%20Infra.md)

## Near-Term Focus

- decide whether Apple OAuth is worth the extra setup
- add Turnstile only if signup abuse becomes meaningful
- continue reducing public-request cost on browse/detail pages
- keep docs, env setup, and infra notes aligned with the real production app

## License

This repository does not currently declare a license.
