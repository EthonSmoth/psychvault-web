# Auth And Account Security

## Current State

- credentials auth with bcrypt password hashes
- optional Google OAuth provider
- JWT session strategy with explicit 7-day max age
- secure cookies in production with `httpOnly` and `sameSite=lax`
- email verification gates on purchases, uploads, creator actions, follows, messaging, and reporting
- CSRF protection on state-changing server-action forms
- centralized safe redirect validation
- origin validation on state-changing API routes
- database-backed rate limiting with memory fallback
- centralized auth, role, and ownership guard helpers

## Current Auth Performance Posture

- token-derived session data is refreshed from Prisma on a short window instead of every single session read
- this keeps page switches lighter without changing the server-side authorization model
- DB-backed guards such as `requireAuth`, `requireRole`, and `requireAdmin` remain the real source of truth for privileged actions

## Google OAuth

Current repo status:

- Google OAuth is implemented in `src/lib/auth.ts`
- login and signup show the Google button only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set
- Google sign-in marks same-email accounts as verified in the local app model
- redirect handling is sanitized through the shared redirect helper

Operational notes:

- rotate the Google client secret if it has ever been exposed
- keep production callback URLs aligned with the canonical domain

## Apple OAuth

Not implemented yet.

Recommendation:

- only add it if the business case is clear
- do it after Google is stable
- expect stricter operational setup than Google

## CAPTCHA / Turnstile

Not implemented yet.

Recommendation:

- add Cloudflare Turnstile only if signup abuse becomes meaningful
- keep it off the happy path unless there is real bot pressure

## Security Hardening Already Applied

- generic user-facing error responses
- server-side logging with safer formatting
- role and ownership checks on protected operations
- Stripe signature verification before webhook processing
- rate limits on login, signup, verification, checkout, uploads, reporting, reviews, follows, and messaging
- security headers in Next.js config
- stateless CSRF tokens tied to the authenticated user id for protected form actions

## Remaining Gaps

- no Apple OAuth yet
- no CAPTCHA yet
- JWT sessions are bounded, but this is still not a fully server-revoked session model
