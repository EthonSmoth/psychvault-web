# OAuth And Captcha Research

## Summary

### Best next auth move

Add Google OAuth first.

Why:

- lower implementation friction than Apple
- good user familiarity
- strong fit for marketplace signup/login

### CAPTCHA recommendation

Add Cloudflare Turnstile to account creation before adding it elsewhere.

Why:

- lowest-friction CAPTCHA option here
- already aligned with the Cloudflare edge in front of the app
- server-side validation is simple and required

### Apple OAuth recommendation

Feasible, but do it after Google unless it is a business requirement.

Why:

- stricter Apple account setup
- more operational steps for web authentication
- more likely to slow rollout than Google

## Practical rollout order

1. Google OAuth
2. Turnstile on signup
3. Apple OAuth

## Official source notes

### Google

Google’s current web guidance centers on Google Identity Services and obtaining a web client ID with the correct browser origins configured.

Relevant docs:

- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/accounts/docs/OAuth2Login

Repo note:

- Google OAuth is now implemented in the Auth.js config and exposed on login/signup when env vars are set.
- You still need to configure the Google Cloud OAuth client and allowed redirect URI.

### Apple

Apple’s web sign-in flow requires a Services ID and association to a primary App ID with Sign in with Apple enabled.

Relevant docs:

- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web
- https://developer.apple.com/help/account/configure-app-capabilities/about-sign-in-with-apple/

### Cloudflare Turnstile

Cloudflare requires server-side token validation through Siteverify. Tokens are single-use and expire after five minutes.

Relevant docs:

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/troubleshooting/testing/

## Repo impact notes

### Google OAuth

Likely changes:

- add provider to `src/lib/auth.ts`
- link OAuth users to existing accounts carefully
- decide how `emailVerified` should behave for OAuth accounts

### Apple OAuth

Likely changes:

- add provider to `src/lib/auth.ts`
- configure Apple web return URLs
- ensure branding/domain config matches production host

### Turnstile

Likely changes:

- add widget to signup UI
- verify token in `src/app/api/register/route.ts`
- fail closed if token validation is missing or invalid
