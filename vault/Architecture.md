# Architecture

## Core Stack

- Next.js 16 App Router
- Prisma + PostgreSQL on Supabase
- Auth.js / NextAuth with JWT sessions
- Stripe Checkout + verified webhooks
- Resend for transactional email
- Supabase Storage for public previews and private downloads
- Tailwind CSS v4 with CSS-native configuration (no tailwind.config.js)
- `clsx` + `tailwind-merge` for conditional class composition (`cn()` helper)

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

## CSS Architecture

Tailwind CSS v4 uses CSS-native configuration with no `tailwind.config.js`. Theme tokens are CSS custom properties defined in `:root` in `src/app/globals.css`. Content scanning is scoped via `@source` directives to exclude non-template files (`*.md`, `*.txt`, `*.ps1`, `prisma/`, `vault/`, `content/`, `public/`).

Three CSS layers:

- `src/app/globals.css` — Tailwind import, `@source` directives, `:root` design tokens, global resets, body styles
- `src/app/components.css` — reusable component utility classes (`.card`, `.card-panel`, `.card-section`, `.btn`, `.btn-primary`, `.btn-secondary`, `.input-surface`, `.heading-2xl`, `.heading-section`, `.nav-dropdown-item`, `.footer-link`, `.stack`, `.field`, `.tag-amber`, `.badge-verified`)
- Tailwind utility classes — used in JSX for layout, spacing, and responsive overrides via `bg-[var(--token)]` arbitrary value syntax

All components use semantic tokens (`var(--text)`, `var(--primary)`, `var(--border)`) rather than hardcoded Tailwind color classes. The `cn()` helper in `src/lib/utils.ts` wraps `clsx` + `tailwind-merge` for conditional class composition with automatic Tailwind conflict resolution.
