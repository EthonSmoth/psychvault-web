# Auth And Account Security

## Current State

- credentials auth only
- bcrypt password hashes
- JWT session strategy
- email verification gates on sensitive actions
- CSRF protection on server-action forms
- database-backed rate limiting with memory fallback

## OAuth Recommendation

### Google

Recommended as the first OAuth provider.

Why:

- lowest setup friction
- strong user familiarity
- good fit for both buyers and creators

Suggested env vars:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Suggested implementation file:

- `src/lib/auth.ts`

Current repo status:

- Google OAuth is now wired as an optional provider.
- Login and signup pages show the Google button only when the Google env vars are present.
- Google sign-in marks the user as email-verified in the local app model.
- Same-email accounts are linked automatically for Google sign-in.

### Apple

Possible, but should come after Google unless required immediately.

Why:

- more operational setup
- Apple developer configuration is stricter
- more moving parts for web callbacks and domain setup

Suggested env vars:

- `AUTH_APPLE_ID`
- `AUTH_APPLE_SECRET`
- `AUTH_APPLE_ISSUER`

## CAPTCHA Recommendation

Best fit: Cloudflare Turnstile.

Why:

- already aligned with Cloudflare at the edge
- lower friction than traditional CAPTCHA
- good protection for signup without making the app feel hostile

Suggested env vars:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Recommended rollout order:

1. signup
2. contact form if needed
3. resend verification if abused

## Notes

- do not force CAPTCHA on every auth action unless abuse is real
- keep provider rollout incremental
- decide whether social-login users count as verified immediately or still need email policy checks
