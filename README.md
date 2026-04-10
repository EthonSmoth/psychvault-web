# PsychVault

PsychVault is a clinician-focused marketplace for psychology resources. Buyers can browse resources and stores, claim free downloads, purchase digital products, save them to a library, message creators, follow stores, and leave reviews. Creators can build branded stores, upload resources, manage listings, and track store performance.

The project now goes well beyond a starter. It includes moderation workflows, creator trust scoring, store and resource reporting, email verification, legal and policy pages, and production-facing marketplace trust features.

## Current state

- Public marketplace with homepage, browse, resource pages, creator stores, about, contact, and legal pages
- Public `/stores` browse page with search, sorting, and links into creator storefronts
- Buyer library, protected downloads, reviews, and creator messaging
- Creator dashboards for store setup, resources, analytics, sales, and payouts
- Stripe Checkout plus Stripe webhook purchase recording
- Supabase Storage uploads with public asset storage plus signed private download delivery
- Upload-time optimization for preview and thumbnail images before they are stored
- Email verification for creator actions, uploads, purchases, messaging, reporting, and follows
- Auth.js credentials auth with bcrypt password hashes
- CSRF protection on server-action forms
- Stripe webhook signature verification
- Shared database-backed rate limiting for login and abuse-prone routes
- Public-page caching and query trimming for resource and store browse/detail pages
- Admin dashboard button pending states and improved global interactive feedback
- Moderation system for resources and stores:
  - text moderation
  - PDF inspection
  - reporting
  - admin queue
  - audit log
  - creator trust scoring
  - auto-hide thresholds

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Auth | Auth.js / NextAuth with credentials |
| Payments | Stripe Checkout plus Webhooks |
| Storage | Supabase Storage |
| Email | Resend |

## Core features

### Public
- Browse published resources
- Browse published stores
- Product-style resource detail pages with previews, reviews, tags, creator trust cues, and reporting
- Public creator store pages with follow, message, and report actions
- About, contact, privacy policy, terms of service, and refund policy pages

### Buyers
- Account signup and login
- Email verification flow
- Free claims and paid checkout entry
- Personal library with protected downloads
- Leave reviews after purchase
- Message creators
- Follow stores and browse store-specific listings

### Creators
- Store setup with logo, banner, bio, moderation state, and go-live checklist
- Resource creation and editing with uploads, pricing, previews, moderation feedback, and upload progress/status messaging
- Creator dashboard, analytics, sales, and payouts views

### Moderation and trust
- Resource and store reporting
- Admin moderation dashboard
- Resource and store moderation states
- Moderation event audit log
- Creator trust scoring
- Auto-hide after repeated reports

## Requirements

- Node.js 20 or newer recommended
- npm
- PostgreSQL / Supabase database
- Supabase Storage bucket for public assets, default `psychvault-resources`
- Supabase Storage bucket for private downloads, default `psychvault-downloads`
- Resend account and API key for outbound email
- Stripe account and webhook secret for paid checkout

## Environment setup

Create a `.env` file in the project root. You can use `.env.example` as the canonical template.

Key variables used by the app:

```env
DATABASE_URL=
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CSRF_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLIC_BUCKET=psychvault-resources
SUPABASE_DOWNLOADS_BUCKET=psychvault-downloads

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=https://www.psychvault.com.au
PAYMENTS_AVAILABLE=false
PLATFORM_FEE_BPS=2000

RESEND_API_KEY=
EMAIL_FROM="PsychVault <noreply@auth.psychvault.com.au>"
SUPPORT_EMAIL=hello@psychvault.com.au
```

Notes:

- `NEXTAUTH_SECRET` is the correct auth secret variable used by the current codebase.
- `CSRF_SECRET` should be set explicitly in every non-local environment.
- `SUPABASE_DOWNLOADS_BUCKET` should point at a private bucket used only for main download files.
- `PAYMENTS_AVAILABLE=false` is useful while Stripe live charges are still being activated.
- App-generated email is sent through Resend using `EMAIL_FROM`.
- Support enquiries from the contact form are sent via Resend to `SUPPORT_EMAIL` with the submitter's address set as `replyTo`.
- For local development, `NEXTAUTH_URL` can remain `http://localhost:3000`.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client and sync the database

```bash
npm run db:generate
npm run db:push
```

Optional:

```bash
npm run db:seed
```

### 3. Configure Supabase Storage

Create the buckets used by the app:

- `psychvault-resources` for public thumbnails, previews, banners, and logos
- `psychvault-downloads` for private main download files

Ensure your service role key has permission to upload and sign URLs for both buckets. Keep the downloads bucket private.

### 4. Run the app

```bash
npm run dev
```

If you are using a local Supabase/Postgres connection with a very small pool, the admin page is now careful to avoid large parallel query bursts, but a connection limit greater than `1` will still give you a much better local experience.

### 5. Local Stripe webhook testing

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

For test card payments, Stripe's common test card is:

```text
4242 4242 4242 4242
```

Use any future expiry date and any CVC.

## Important flows

### Account verification
1. User signs up
2. App creates the account
3. Verification email is sent
4. User verifies from `/verify-email`
5. Protected actions unlock

### Paid checkout
1. Buyer clicks buy on a resource page
2. App posts to `/api/checkout`
3. Stripe Checkout session is created
4. Stripe sends `checkout.session.completed` to `/api/webhook`
5. Server records the purchase idempotently
6. Buyer gains library and download access

### Free claim
1. Buyer clicks get for free
2. App posts to `/api/checkout`
3. Server records a zero-value purchase immediately
4. Buyer can download from library or the resource page

### Moderation
1. Creator saves a store or resource
2. Text, file, and trust checks run
3. Content is approved, held for review, or blocked
4. Admin can review and resolve from `/admin`

## Security overview

Security controls currently in place:

- Passwords are stored as bcrypt hashes.
- Email verification is required before uploads, creator actions, purchases, messaging, follows, and reporting.
- Server-action forms use signed CSRF tokens.
- Stripe webhooks are verified with the webhook signing secret.
- Uploads are validated by field type, extension, MIME, and size before they are stored.
- Preview and thumbnail image uploads are resized and converted to lighter formats when supported by the runtime.
- Main download files are stored as private Supabase references and delivered through short-lived signed URLs.
- Login, checkout, upload, registration, contact, and reporting routes use shared database-backed rate limiting.
- Legacy JSON write endpoints for stores/resources have been retired so creator changes must go through the moderated UI flow.
- Public resource and store API responses are sanitized to avoid leaking owner secrets or main download links.
- Resources and stores go through moderation and reporting workflows, including admin review and audit logging.

Current security limitations to be aware of:

- Rate limiting currently uses the primary database for shared limits, with an in-memory fallback if the database is temporarily unavailable.
- Existing old download files uploaded before private-bucket rollout may need to be re-uploaded or migrated if you want every asset to live in the private downloads bucket.
- Private downloads depend on the `SUPABASE_DOWNLOADS_BUCKET` remaining private and available for signed URL generation.
- Some local development environments may still hit Prisma pool pressure if the database connection limit is set extremely low.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and build the app |
| `npm run start` | Start the production server |
| `npm run lint` | Run Next.js lint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |

## Project structure

```text
psychvault/
|-- prisma/
|-- public/
|-- src/
|   |-- app/
|   |   |-- (public)/
|   |   |-- (protected)/
|   |   |-- (creator)/
|   |   |-- about/
|   |   |-- admin/
|   |   |-- api/
|   |   |-- contact/
|   |   |-- privacy-policy/
|   |   |-- refund-policy/
|   |   |-- terms-of-service/
|   |   |-- layout.tsx
|   |   |-- robots.ts
|   |   `-- sitemap.ts
|   |-- components/
|   |-- lib/
|   |-- server/
|   `-- types/
`-- README.md
```

## Operational notes

- Keep real secrets out of version control.
- Rotate any live Stripe keys that have been exposed.
- If using live Stripe, set `NEXT_PUBLIC_APP_URL` to your real domain.
- Paid checkout can be intentionally disabled with `PAYMENTS_AVAILABLE=false`.
- Email verification now affects creator tools, uploads, purchases, messaging, reporting, and follows.
- Main download files should be uploaded into the private downloads bucket and accessed only through `/api/downloads/[resourceId]`.
- Public resource and store pages use short-lived server caching to reduce repeated database work.
- The admin dashboard now loads data by active tab to avoid exhausting low local Prisma connection pools.

## Production hardening checklist

- Set strong values for `NEXTAUTH_SECRET` and `CSRF_SECRET`.
- Keep the downloads bucket private and periodically review older resources for pre-rollout public download URLs.
- Consider moving rate limiting from the primary database to Redis / Upstash if traffic grows significantly.
- Periodically review public API responses to ensure new fields do not expose sensitive creator or download data.
- Keep Stripe live mode disabled until account review, webhooks, and legal pages are fully ready.

## License

This repository does not include a license by default.
