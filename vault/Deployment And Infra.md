# Deployment And Infra

## Current Model

- Vercel for rendering and app hosting
- Cloudflare in front for DNS, proxying, and edge security
- Supabase for Postgres and Storage
- Stripe for payments
- Resend for outbound email

## Important Environment Notes

- `DATABASE_URL` is the pooled runtime connection
- `DIRECT_URL` is for Prisma schema operations
- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` should match the canonical deployed domain
- `SUPABASE_PUBLIC_BUCKET` should point to `psychvault-resources`
- `SUPABASE_DOWNLOADS_BUCKET` should point to `psychvault-downloads`

## Supabase Storage Posture

- `psychvault-resources` is a public bucket for thumbnails, logos, banners, and preview assets
- `psychvault-downloads` is a private bucket for purchased/downloadable files
- current app uploads run through the server using the service-role key
- non-main image uploads are optimized before storage when `sharp` succeeds
- private downloads are served with short-lived signed URLs after access checks
- broad `storage.objects` policies are not required for the current server-mediated architecture

## Operational Notes

- if local Prisma `db:push` cannot reach the Supabase direct DB endpoint, apply schema SQL from Supabase SQL Editor
- if Prisma client generation fails on Windows because the query engine DLL is locked, stop running dev/build processes and retry
- rotate any secret that has been exposed in logs, chat, or screenshots
- keep Cloudflare aligned with Vercel/Next caching rather than forcing brittle "cache all HTML" behavior
- keep local Obsidian workspace state out of Git; only the Markdown docs are meant to stay versioned
