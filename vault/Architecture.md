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
- archive/restore flows
- creator analytics, sales, and payouts

### Admin

- moderation queue
- report handling
- resource and store publish/archive controls

## Request Model

- public pages are designed to be static or cache-first where possible
- viewer-specific state is fetched separately for authenticated users
- checkout, downloads, uploads, and account actions remain dynamic
- webhook fulfilment is server-side source of truth

## Storage Model

- `psychvault-resources`: public bucket for thumbnails and preview assets
- `psychvault-downloads`: private bucket for downloadable files
- main downloads are stored as internal references, not public URLs
- download access is verified before issuing a short-lived signed URL

## Design Principles

- cache public content aggressively
- avoid anonymous-shell auth/database work where possible
- keep protected operations checked server-side
- avoid broad middleware or request-wide overhead
- prefer shared helpers for auth, redirects, caching, and rate limits
