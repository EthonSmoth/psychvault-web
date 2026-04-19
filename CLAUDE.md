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

No test runner is configured. There is no `npm test` command.

On Windows: if `npm run build` fails because the Prisma query engine DLL is locked, stop any running dev process and retry.

## Architecture Overview

PsychVault is a **Next.js 16 App Router** marketplace for psychology resources — creators sell downloadable files to clinician buyers. Pricing is AUD.

### Request flow

Public catalog pages are ISR-cached with Next.js tags (`src/server/cache/public-cache.ts`). Viewer-specific state (ownership, purchase status, follow state) is fetched separately on the client or via server queries, so logged-out and logged-in states don't flash each other's CTAs.

When a creator publishes or admin moderation runs, server actions call `revalidatePublicResources()` / `revalidatePublicStores()` to bust the relevant ISR tags immediately.

### Auth (`src/lib/auth.ts`)

NextAuth v5 beta with the Prisma adapter. Supports credentials (bcrypt) and optional Google OAuth. Sessions are JWT-backed. The session JWT caches user state (role, email verified, isSuperAdmin) and only refreshes from the database every 30 seconds (`AUTH_USER_STATE_REFRESH_MS`) to reduce Prisma reads.

Role hierarchy: `BUYER` → `CREATOR` → `ADMIN`. `isSuperAdmin` is a separate boolean on `User`.

### Server action pattern

All mutations live in `src/server/actions/`. Actions call:
1. `auth()` to get session
2. `requireVerifiedEmailOrRedirect()` or `isEmailVerified()` for sensitive actions
3. `verifyCSRFToken(token, sessionId)` for state-changing form submissions
4. A rate limit check via `checkRateLimit()` (Postgres-backed, in-memory fallback)
5. The actual Prisma mutation

### Storage (`src/lib/storage.ts`)

Two Supabase buckets:
- `psychvault-resources` (public): thumbnails, logos, banners, preview images
- `psychvault-downloads` (private): paid and free downloadable files

Private files are stored as opaque `supabase://bucket/path` references in the database, never as public URLs. Downloads are served via short-lived signed URLs generated server-side after access checks.

Non-main image uploads are resized and converted to WebP via the upload API route.

### Payments (`src/lib/stripe.ts`, `src/lib/payments.ts`)

Stripe Checkout for paid resources. Webhook at `/api/webhook/stripe` is the server-side source of truth for purchase fulfilment — it creates the `Purchase` record and triggers email. Platform fee is configurable via `PLATFORM_FEE_BPS` (default 2000 = 20%). Stripe Connect is used for creator payouts.

`PAYMENTS_AVAILABLE=false` env var disables paid checkout without code changes.

### Database

Prisma 6 ORM on Postgres (Supabase). **Supabase SQL Editor is the source of truth** for the database schema. `prisma/schema.prisma` is kept in sync with the live database, not the other way around.

Schema change workflow: write SQL in Supabase SQL Editor -> update `prisma/schema.prisma` to match -> `npm run db:generate` -> `.\check-drift.ps1` to confirm zero drift.

Schema is at `prisma/schema.prisma`. Key relationships:
- `User` → `Store` (one creator, one store)
- `Store` → `Resource[]`
- `Resource` → `Purchase[]`, `Review[]`, `ResourceFile[]`, `ResourceReport[]`
- `Purchase` → `RefundRequest?`
- `Conversation` ↔ `User` via `ConversationParticipant`

`Resource` has denormalized columns (`averageRating`, `reviewCount`, `salesCount`, `hasMainFile`) that are updated by server actions to avoid expensive aggregation queries on public pages.

### Moderation

Resources and stores have a `ModerationStatus` enum (APPROVED / PENDING_REVIEW / REJECTED) and an `isPublished` flag. `ModerationEvent` logs every admin action. Creator trust score is computed in `src/lib/creator-trust.ts`. Admin routes live at `/admin`.

### Security patterns

- CSRF: stateless HMAC token generated per-session (`src/lib/csrf.ts`). Generated at session load, verified in server actions.
- Rate limiting: Postgres `RateLimitState` table is primary store; in-memory Map is fallback. Keys are SHA-256-hashed before storage.
- Email verification gate: sensitive actions (purchases, reviews, follows, messaging, reporting) call `requireVerifiedEmailOrRedirect()`.
- Input sanitization: `src/lib/input-safety.ts` handles user text before storage or email rendering.
- Security headers configured in `next.config.js` (CSP, X-Frame-Options, HSTS in production).

### Blog and content

Blog posts are markdown files in `content/blog/*.md`. The blog system reads these at build/request time — no CMS. Cover and inline images go in `public/blog/`. Template SEO landing pages are defined statically in `src/lib/template-landing-pages.ts`.

### Email (`src/lib/email.ts`)

Transactional email via Resend. HTML content is escaped with `escape-goat` before sending. Triggered from server actions and the Stripe webhook handler.

## Design system

Tailwind CSS v4 with CSS-native configuration (no `tailwind.config.js`). All components use CSS custom property tokens from `src/app/globals.css`. Do not use hardcoded Tailwind color classes — use semantic tokens like `bg-[var(--card)]`, `text-[var(--text)]`, `border-[var(--border)]`. Primary palette is warm beige/walnut (`--background: #f4eadc`, `--primary: #80502d`).

Reusable component classes live in `src/app/components.css` (e.g. `.card-panel`, `.btn-primary`, `.heading-2xl`). The `cn()` helper in `src/lib/utils.ts` wraps `clsx` + `tailwind-merge` for conditional class composition.

## Environment

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL`, `DIRECT_URL` (Prisma)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `CSRF_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`
- `NEXT_PUBLIC_APP_URL`

Optional: `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` for Google OAuth, `NEXT_PUBLIC_GA_MEASUREMENT_ID` for Analytics, `PAYMENTS_AVAILABLE=false` to disable checkout.

## Documentation vault

Detailed architecture and infrastructure notes live in `vault/` (Obsidian-compatible markdown). Start with [vault/Home.md](./vault/Home.md) and [vault/Architecture.md](./vault/Architecture.md).
