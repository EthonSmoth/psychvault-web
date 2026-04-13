# Architecture

## Core Stack

- Next.js 16 App Router
- Prisma + PostgreSQL on Supabase
- Auth.js / NextAuth with JWT sessions
- Stripe Checkout + verified webhooks
- Resend for transactional email
- Supabase Storage for public previews and private downloads

## Main Application Areas

### Public

- homepage
- resource browse and resource detail pages
- store browse and store detail pages
- search
- static marketing, help, legal, and contact pages

### Authenticated Buyer

- library
- protected downloads
- reviews
- follows
- creator messaging
- checkout completion and purchase access

### Authenticated Creator

- store management
- resource creation and editing
- archive and restore flows
- creator analytics, sales, and payouts
- creator trust visibility in dashboard surfaces

### Admin

- moderation queue
- report handling
- resource and store publish/archive controls
- creator trust visibility for queued resources
- moderation audit log

## Request Model

- public pages are designed to be static or cache-first where possible
- store viewer state is now loaded on the server to avoid auth-state flicker on store pages
- resource viewer state still loads dynamically, but its loading UI no longer shows incorrect logged-out actions
- navbar session state still loads dynamically, but now uses a loading skeleton rather than flashing logged-out controls
- checkout, downloads, uploads, messaging, moderation, and account actions remain dynamic
- webhook fulfilment is the server-side source of truth

## Storage Model

- `psychvault-resources`: public bucket for thumbnails, logos, banners, and preview assets
- `psychvault-downloads`: private bucket for downloadable files
- main downloads are stored as internal references, not public URLs
- non-main image uploads are optimized with `sharp` and converted to WebP when optimization succeeds
- download access is verified before issuing a short-lived signed URL

## Design Principles

- cache public content aggressively
- avoid anonymous-shell auth/database work where possible
- keep protected operations checked server-side
- prefer shared helpers for auth, redirects, caching, storage, and rate limits
- keep perceived performance high by avoiding wrong-state flashes during session/viewer hydration
