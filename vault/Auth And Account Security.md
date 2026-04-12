# Auth And Account Security

## Current State

- credentials auth with bcrypt password hashes
- optional Google OAuth provider
- JWT session strategy with explicit 7-day max age
- secure cookies in production with `httpOnly` and `sameSite=lax`
- email verification gates on purchases, uploads, creator actions, follows, messaging, and reporting
- CSRF protection on server-action forms
- centralized safe redirect validation
- origin validation on state-changing API routes
- database-backed rate limiting with memory fallback
- centralized auth, role, and ownership guard helpers

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
- rate limits on login, signup, verification, checkout, uploads, reporting, reviews, and messaging
- security headers in Next.js config

## Remaining Gaps

- no password reset flow yet
- no Apple OAuth yet
- no CAPTCHA yet
- long-lived JWT sessions are bounded, but not a full server-side idle timeout model
