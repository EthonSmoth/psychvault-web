# OAuth And Captcha Research

## Summary

### Current auth posture

- credentials auth is live
- Google OAuth is implemented and can be enabled with env vars
- Apple OAuth is not implemented
- CAPTCHA is not implemented

### Recommended next auth move

Keep Google as the primary social sign-in option and only add Apple if there is a clear business reason.

### CAPTCHA recommendation

If signup abuse becomes real, add Cloudflare Turnstile to account creation first.

## Practical Rollout Order

1. keep Google OAuth stable in production
2. decide whether Apple OAuth is worth the setup burden
3. add Turnstile only if abuse justifies the friction

## Google

Status:

- implemented in the Auth.js config
- exposed on login and signup when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are present
- same-email Google users are linked automatically
- Google users are treated as verified in the local app model

Operational requirements:

- correct browser origins and callback URLs in Google Cloud
- canonical production domain set correctly in env
- secret rotation if the OAuth secret was exposed

## Apple

Status:

- not implemented

Reason to delay:

- stricter operational setup than Google
- requires Apple developer configuration for web sign-in
- more maintenance overhead for lower immediate value

## Turnstile

Status:

- not implemented

When to add:

- only if signup or contact abuse becomes meaningful
- avoid adding friction unless the traffic pattern justifies it

## Relevant Project Touchpoints

- `src/lib/auth.ts`
- `src/components/auth/google-auth-button.tsx`
- `src/components/forms/login-form.tsx`
- `src/components/auth/signup-form.tsx`
- `src/app/api/register/route.ts`
