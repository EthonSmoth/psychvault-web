# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. It supports public browsing, creator storefronts, protected downloads, reviews, messaging, moderation workflows, and Stripe checkout for digital products.

This repo is no longer just a starter. It is already shaped around a production deployment on Vercel with Supabase, Stripe, Resend, and Cloudflare in front of the app.

## What The App Does

- Public marketplace for psychology resources and creator stores
- Buyer library with protected access to purchased and free-claimed downloads
- Creator dashboards for stores, listings, analytics, sales, and payouts
- Resource and store moderation, reporting, and trust workflows
- Email verification gates on sensitive account and marketplace actions
- Supabase Storage uploads with signed private download delivery
- SEO-oriented public pages with caching, metadata, sitemap, and structured data

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Auth | Auth.js / NextAuth v5 beta |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Storage | Supabase Storage |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Styling | Tailwind CSS |

## Current Auth And Abuse Posture

Implemented today:

- Credentials auth with bcrypt password hashes
- Email verification before creator actions, purchases, messaging, follows, and reporting
- CSRF protection on server-action forms
- Database-backed rate limiting with in-memory fallback
- Input normalization on key user-submitted fields
- Safe JSON-LD serialization for structured data script tags
- Signed private download delivery from storage

Not implemented yet:

- Google OAuth
- Apple OAuth
- CAPTCHA on signup

## Recommended Next Auth Additions

### Google OAuth

Good fit for this app:

- lowest friction social sign-in option
- simple Auth.js provider setup
- good for buyers and creators

Recommended scope:

- add Google as an optional provider alongside credentials
- keep email verification semantics clear for credentials users
- decide whether OAuth users should be treated as verified immediately

Suggested env vars:

```env
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

Suggested implementation point:

- [src/lib/auth.ts](./src/lib/auth.ts)

Current repo status:

- Google OAuth is wired as an optional Auth.js provider.
- It appears on login and signup only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
- Existing same-email accounts can sign in with Google and be linked automatically.

### Apple OAuth

Viable, but more operationally strict than Google:

- stronger setup burden
- Apple developer account required
- web service configuration is stricter
- best added after Google unless Apple is a business requirement right now

Suggested env vars:

```env
AUTH_APPLE_ID=
AUTH_APPLE_SECRET=
AUTH_APPLE_ISSUER=https://appleid.apple.com
```

Recommended stance:

- add only if you expect meaningful iPhone/macOS-heavy buyer traffic
- document the Apple web return URL and domain verification carefully

### CAPTCHA On Account Creation

Best fit here: Cloudflare Turnstile.

Why:

- you already run Cloudflare in front of the app
- lower friction than traditional CAPTCHA
- cleaner UX for a marketplace
- straightforward server-side verification

Recommended scope:

- add Turnstile to signup first
- optionally add it later to contact form and verification resend if abuse shows up
- do not add it to login by default unless you see active credential stuffing

Suggested env vars:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Suggested implementation points:

- signup UI
- [src/app/api/register/route.ts](./src/app/api/register/route.ts)

## Environment

Create a `.env` file in the project root.

Core variables:

```env
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CSRF_SECRET=
AUTH_TRUST_HOST=true

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

NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Notes:

- `DATABASE_URL` is the pooled runtime connection.
- `DIRECT_URL` is for Prisma schema operations such as `db:push`.
- `SUPABASE_DOWNLOADS_BUCKET` should stay private.
- `NEXT_PUBLIC_APP_URL` should match the real deployed domain in production.

## Getting Started

### 1. Install

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

If your local network cannot reach the Supabase direct database host, apply schema changes from Supabase SQL Editor instead.

### 4. Optional Seed

```bash
npm run db:seed
```

### 5. Run Dev Server

```bash
npm run dev
```

## Important Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start local development |
| `npm run build` | Generate Prisma client and build the app |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to the database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:backfill-public-state` | Backfill denormalized public file-state columns |

## Project Shape

```text
psychvault/
|-- prisma/
|-- public/
|-- src/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- server/
|   `-- types/
|-- vault/
`-- README.md
```

## Obsidian Vault

This repo now includes a Markdown knowledge base in [`vault/`](./vault).

Open that folder directly as an Obsidian vault if you want:

- architecture notes
- auth roadmap
- deployment and ops context
- cost/performance decisions
- security notes

Good starting note:

- [vault/Home.md](./vault/Home.md)

## Production Notes

- Keep secrets out of version control.
- Rotate any credential that has been exposed in logs, chat, or screenshots.
- Keep download assets private and serve them through signed URLs only.
- Use Vercel/Next caching for public pages and reserve dynamic compute for auth, checkout, creator/admin, uploads, and entitlement checks.
- Consider moving rate limiting to Redis/Upstash if traffic grows beyond what you want to put on the primary database.

## License

This repository does not currently declare a license.
