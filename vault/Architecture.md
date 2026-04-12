# Architecture

## Core Stack

- Next.js App Router
- Prisma + PostgreSQL on Supabase
- Auth.js / NextAuth
- Stripe for checkout
- Resend for email
- Supabase Storage for assets and private downloads

## Main Application Areas

### Public

- homepage
- resource browse
- resource detail pages
- store browse
- store detail pages
- static marketing and legal pages

### Authenticated Buyer

- library
- downloads
- reviews
- follows
- creator messaging

### Authenticated Creator

- store management
- resource creation and editing
- analytics
- payouts

### Admin

- moderation queue
- report handling
- store/resource publishing controls

## Design Principles

- cache public content aggressively
- keep interactive/account surfaces dynamic
- avoid broad middleware or shell-level DB work
- deliver purchased files via signed storage URLs instead of streaming through app code
