# Security Review — PsychVault

Last audited: April 2026. Site is live on Vercel.

---

## Original Audit — Status of All 5 Issues

All five critical issues from the original audit have been resolved. Details below.

---

### 1. HTML Injection in Contact Email — ✅ RESOLVED

`src/lib/email.ts` now imports `htmlEscape` from `escape-goat` and applies it to all user-controlled fields (`name`, `email`, `subject`, `message`) before building the HTML email body. The `escape-goat` package is in production dependencies. Verification emails also escape the recipient name and verification URL.

---

### 2. CSRF Protection — ✅ RESOLVED

`src/lib/csrf.ts` implements a stateless, HMAC-SHA256 signed CSRF token tied to the authenticated user's session ID. Tokens include a nonce, expiry timestamp, and signature verified with `crypto.timingSafeEqual`. This is stronger than the cookie-comparison approach suggested in the original audit — it requires no server state and is bound to the authenticated session. `CSRF_SECRET` is a required env variable in production.

---

### 3. Unauthorized API Data Access — ✅ RESOLVED

Both endpoints now use tight, explicit `select` objects and filter-helper functions:

- `GET /api/stores/[slug]` — uses `getPubliclyVisibleStoreWhere` and selects only public-safe owner fields (`id`, `name`, `image`, `avatarUrl`). No email, password hash, or internal fields are exposed. Files are filtered to `THUMBNAIL` and `PREVIEW` kinds only.
- `GET /api/resources/[id]` — uses `getPubliclyVisiblePublishedResourceWhere`, which enforces published status. No owner PII is included. The old write endpoint (`PUT`) has been retired with a `410 Gone` response.

---

### 4. Rate Limiting — ✅ RESOLVED

Rate limiting is fully implemented using a Postgres-backed store (`RateLimitState` model via Prisma) with an in-memory fallback if the database is temporarily unavailable. Keys are SHA-256 hashed before storage so raw emails and IPs are not persisted in plaintext.

Applied to:

| Endpoint / Action | Key Strategy | Limits |
| --- | --- | --- |
| Login (`loginAction`) | email + IP (both checked) | 5 / 15 min |
| Registration (`/api/register`) | IP + email (both checked) | 5/hr per IP, 3/hr per email |
| Contact form (`/api/contact`) | IP + email (both checked) | 3/hr each |
| Uploads (`/api/upload`) | IP + user ID (both checked) | 20/hr per IP, 25/hr per user |
| Downloads | IP | 60 / 15 min |
| Checkout | IP + user | 10/hr per IP, 15/hr per user |
| Messages (send) | user | 30 / 10 min |
| Email verification | user | 3 send / hr, 10 attempts / 15 min |
| Public browse/detail | IP (in-memory) | 120–180 / min |

---

### 5. File Upload Security — ✅ RESOLVED

`/api/upload` now enforces:

- **Auth gate** — requires authenticated session
- **Email verification gate** — unverified users cannot upload
- **Rate limiting** — both IP and per-user limits
- **Origin check** — `ensureAllowedOrigin` rejects cross-origin requests
- **Upload kind enforcement** — `uploadKind` must be one of `thumbnail`, `preview`, `main`
- **File size limits** — per-kind limits via `UPLOAD_RULES` (10 MB images, 50 MB documents)
- **Extension blocklist** — rejects `.php`, `.exe`, `.dll`, `.sh`, `.bat`, `.js`, `.ts`, `.py`, `.rb`, `.jar`, `.asp`, `.aspx`, `.jsp`, `.cgi`
- **MIME + extension validation** — `validateUpload` in `src/lib/resource-moderation.ts` checks declared MIME against allowed patterns per upload kind
- **Image optimization** — thumbnails and previews are transcoded to WebP via Sharp before storage, stripping metadata
- **Safe filename generation** — strips path traversal characters, limits length to 240 chars

---

## Remaining Issues (Live Site)

---

### A. No Password Reset Flow — HIGH

**Risk:** Users who lose access to their password have no self-service recovery path. On a live site this creates support overhead and user trust problems.

**What to build:**

1. Add a `PasswordResetToken` model (or reuse `VerificationToken` with a `type` discriminator)
2. Build `POST /api/auth/forgot-password` — validates the email, creates a token, sends a reset link via Resend
3. Build a `/reset-password?token=...` page — validates the token, accepts a new password, hashes with bcrypt, clears the token
4. Apply rate limiting (`checkRateLimit`) to the forgot-password endpoint (3 requests/hr per email)

---

### B. Incomplete Content Security Policy — MEDIUM

**Risk:** The CSP in `next.config.js` only covers `base-uri`, `frame-ancestors`, `object-src`, and `form-action`. Without a `script-src` directive, the browser falls back to allowing all scripts including inline, which means the CSP provides no XSS protection beyond the React rendering layer.

**Current CSP:**
```
base-uri 'self'; frame-ancestors 'none'; object-src 'none';
form-action 'self' https://checkout.stripe.com https://appleid.apple.com
```

**Suggested additions for `next.config.js`:**

```js
"default-src 'self'",
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com",
"style-src 'self' 'unsafe-inline'",
"img-src 'self' data: blob: https:",
"font-src 'self' data:",
"connect-src 'self' https://www.google-analytics.com https://api.stripe.com",
"frame-src https://js.stripe.com https://hooks.stripe.com",
"worker-src blob:",
```

Note: `'unsafe-inline'` on `script-src` is needed while Next.js inlines scripts. A proper nonce-based CSP would require Next.js middleware to inject nonces — viable but more involved.

---

### C. Google OAuth `allowDangerousEmailAccountLinking` — MEDIUM

**Risk:** In `src/lib/auth.ts`, the Google provider is configured with `allowDangerousEmailAccountLinking: true`. This allows a Google account to link to an existing PsychVault credentials account purely by matching the email address. If an attacker controls a Google account with the same email as a PsychVault user, they can take over that account without the user's password.

**File:** `src/lib/auth.ts:99`

**Mitigation options:**

1. Remove `allowDangerousEmailAccountLinking: true` (simplest — Google sign-in to an email that already has a password account would require the user to first add Google via account settings)
2. Keep it but add an email verification check on the Google `signIn` callback — only allow linking if the PsychVault account's email is already verified (it currently auto-verifies on Google sign-in, which is the right move)

Option 2 is the more user-friendly path. The current code already calls `db.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } })` on Google sign-in, which is reasonable. But the underlying account-linking risk remains.

---

### D. Upload File Content Not Verified by Magic Bytes — LOW

**Risk:** Upload validation checks the declared MIME type and file extension but does not inspect the actual file bytes. A user could rename a disallowed file type (e.g. `.html` to `.pdf`) and bypass the extension check. Supabase Storage does not execute uploaded files, so this is low exploitability, but malformed files could cause issues downstream (e.g. a ZIP bomb or corrupted PDF sent through the platform).

**Suggested fix:** Add the `file-type` package to inspect actual file magic bytes before accepting the upload:

```bash
npm install file-type
```

In `src/app/api/upload/route.ts`, after reading the file buffer (which already happens for image optimization), add:

```ts
import { fileTypeFromBuffer } from "file-type";

const buffer = Buffer.from(await file.arrayBuffer());
const detected = await fileTypeFromBuffer(buffer);

if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
  return NextResponse.json({ error: "File content does not match allowed types." }, { status: 400 });
}
```

---

### E. No Bot Protection on Auth Endpoints — LOW

**Risk:** Rate limiting protects against brute-force from a single IP or email, but an attacker using a distributed botnet can still enumerate accounts and attempt credential stuffing across many IPs. There is no CAPTCHA or proof-of-work challenge on login, registration, or the contact form.

**Recommended:** Cloudflare Turnstile is the lowest-friction option (invisible by default, challenge on suspicion). Cloudflare is already in the planned infrastructure stack so the site is behind CF — enabling Bot Fight Mode or adding Turnstile to login and signup would add meaningful protection with minimal UX impact.

---

## Not Applicable / Out of Scope

- **Apple OAuth** — not implemented and not required yet. Add when demand warrants it.
- **Password complexity rules** — 8-character minimum is enforced. Consider adding a complexity requirement (e.g. require at least one non-letter character) if credential stuffing becomes a concern.
- **HSTS preloading** — HSTS `max-age=63072000; includeSubDomains; preload` is set in production. Submit `psychvault.com.au` to the HSTS preload list once you are confident the domain and all subdomains will always serve HTTPS.
