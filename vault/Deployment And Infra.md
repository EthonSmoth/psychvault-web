# Deployment And Infra

## Current Model

- Vercel for rendering and app hosting
- Cloudflare in front for DNS/proxy/security
- Supabase for Postgres and Storage
- Stripe for payments
- Resend for outbound email

## Important Environment Notes

- `DATABASE_URL` is the pooled runtime connection
- `DIRECT_URL` is for Prisma schema operations
- private downloads should stay in `SUPABASE_DOWNLOADS_BUCKET`
- `NEXT_PUBLIC_APP_URL` should always match the canonical deployed domain

## Operational Notes

- if local Prisma `db:push` cannot reach Supabase direct DB, apply schema SQL from Supabase SQL Editor
- rotate any secret that has been exposed in logs or chat
- keep Cloudflare aligned with Vercel caching rather than forcing brittle full-page HTML caching
