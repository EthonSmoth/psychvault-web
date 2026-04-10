# Security Audit - Critical Issues Action Plan

## 🚨 STOP: Do NOT Deploy Without Fixing These

### Critical Issues (Must Fix First)

---

## 1. HTML Injection in Contact Email - CRITICAL

**Risk:** Attackers can inject malicious code into support emails, compromise support staff

**File to Fix:** `src/lib/email.ts`

**Quick Fix:**
```bash
npm install escape-goat
```

Replace lines 23-29 in `src/lib/email.ts`:

```typescript
// ❌ BEFORE (VULNERABLE)
const html = `
  <h2>PsychVault contact form</h2>
  <p><strong>Name:</strong> ${options.name}</p>
  <p><strong>Email:</strong> ${options.email}</p>
  <p><strong>Subject:</strong> ${options.subject}</p>
  <hr />
  <p>${options.message.replace(/\n/g, "<br/>")}</p>
`;

// ✅ AFTER (FIXED)
import { escapeHtml } from 'escape-goat';

const html = `
  <h2>PsychVault contact form</h2>
  <p><strong>Name:</strong> ${escapeHtml(options.name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(options.email)}</p>
  <p><strong>Subject:</strong> ${escapeHtml(options.subject)}</p>
  <hr />
  <p>${escapeHtml(options.message).replace(/\n/g, "<br/>")}</p>
`;
```

**Verification:**
- Test with payload: `<img src=x onerror="alert('XSS')">`
- Verify HTML is escaped in received email

---

## 2. No CSRF Protection - CRITICAL

**Risk:** Attackers can trick logged-in users into deleting stores, creating resources, etc.

**Files Affected:** All `src/server/actions/*.ts` files

**Step 1: Create CSRF utilities**

Create `src/lib/csrf.ts`:
```typescript
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('csrf-token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 // 24 hours
  });
  return token;
}

export async function verifyCSRFToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const cookieStore = await cookies();
  const stored = cookieStore.get('csrf-token')?.value;
  return stored === token && stored !== undefined;
}
```

**Step 2: Protect server actions**

Update `src/server/actions/store-actions.ts`:
```typescript
import { verifyCSRFToken } from "@/lib/csrf";

export async function saveStoreAction(
  _prevState: StoreFormState,
  formData: FormData
): Promise<StoreFormState> {
  // ADD THIS - Verify CSRF token
  const csrfToken = formData.get('csrf-token') as string;
  if (!await verifyCSRFToken(csrfToken)) {
    return { error: "Invalid request. Please refresh and try again." };
  }

  // ... rest of function
}
```

**Step 3: Add token to forms**

Update form components - e.g., `src/components/forms/store-form.tsx`:
```typescript
'use client';

import { generateCSRFToken } from '@/lib/csrf';
import { useEffect, useState } from 'react';

export function StoreForm({ store }: StoreFormProps) {
  const [csrfToken, setCSRFToken] = useState('');

  useEffect(() => {
    generateCSRFToken().then(setCSRFToken);
  }, []);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="csrf-token" value={csrfToken} />
      {/* rest of form */}
    </form>
  );
}
```

---

## 3. Unauthorized API Data Access - CRITICAL

**Risk:** Anyone can access store data including owner emails, password hash hints, all resource files

**File to Fix:** `src/app/api/stores/[slug]/route.ts`

Replace entire GET function with:
```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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
      // ✅ NEVER expose owner email or password fields
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        }
      },
      resources: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          shortDescription: true,
          priceCents: true,
          isFree: true,
          thumbnailUrl: true,
          imageUrl: true,
          averageRating: true,
          reviewCount: true,
          salesCount: true,
          categories: {
            select: { categoryId: true, category: { select: { name: true } } }
          },
          tags: {
            select: { tagId: true, tag: { select: { name: true } } }
          }
          // ✅ Don't include raw files array - too much internal data
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!store) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(store);
}
```

**Also fix:** `src/app/api/resources/[id]/route.ts` - Add auth check:
```typescript
import { auth } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      shortDescription: true,
      priceCents: true,
      isFree: true,
      status: true,
      thumbnailUrl: true,
      averageRating: true,
      reviewCount: true,
      creator: { select: { id: true, name: true } },
      store: { select: { id: true, slug: true, name: true } },
    }
  });

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ Only show published, or if user is the creator
  if (resource.status !== "PUBLISHED" && resource.creator.id !== session?.user?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(resource);
}
```

---

## 4. No Rate Limiting - CRITICAL

**Risk:** Brute force attacks on login, registration, email flooding, webhook spam

**Setup:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

Go to [Upstash Console](https://console.upstash.com/) and create Redis database

Add to `.env`:
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Create `src/lib/ratelimit.ts`:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 min
  analytics: true,
  prefix: "auth",
});

export const registerLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 h"), // 3 attempts per hour
  analytics: true,
  prefix: "register",
});

export const uploadLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "upload",
});

export const contactLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "contact",
});
```

**Apply to login:** Update `src/lib/auth.ts`:
```typescript
import { authLimiter } from "@/lib/ratelimit";

Credentials({
  credentials: { /* ... */ },
  authorize: async (credentials) => {
    const email = credentials?.email as string | undefined;
    if (!email) return null;

    // ✅ Check rate limit BEFORE database query
    const { limit, remaining } = await authLimiter.limit(email);
    if (!limit) return null; // Too many attempts

    const user = await db.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return null;

    return { /* ... */ };
  }
})
```

**Apply to registration:** Update `src/app/api/register/route.ts`:
```typescript
import { registerLimiter } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    // ✅ Rate limit registration by email
    const { limit, remaining } = await registerLimiter.limit(parsed.data.email);
    if (!limit) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again in an hour." },
        { status: 429 }
      );
    }

    // ... rest of function
  } catch (error) {
    logger.error("Failed to register user", error);
    return jsonError();
  }
}
```

**Apply to contact form:** Update `src/app/api/contact/route.ts`:
```typescript
import { contactLimiter } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid contact request." }, { status: 400 });
    }

    // ✅ Rate limit by IP for unauthenticated requests
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { limit } = await contactLimiter.limit(ip);
    if (!limit) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await sendContactEmail(parsed.data);
    return NextResponse.json({ message: "Contact message sent." }, { status: 201 });
  } catch (error) {
    return jsonError("Unable to send contact message.", 500, error);
  }
}
```

---

## 5. Weak File Upload Security - CRITICAL

**Risk:** Malware upload, arbitrary code execution, storage exhaustion

**Setup:**
```bash
npm install file-type
```

Replace `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadLimiter } from "@/lib/ratelimit";
import { FileTypeResult } from 'file-type';
import FileType from 'file-type';
import crypto from 'crypto';

// ✅ Define allowed MIME types - only safe formats
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

// ✅ Strict size limits per type
const MAX_SIZES: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024,       // 5MB
  'image/png': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
  'application/pdf': 50 * 1024 * 1024, // 50MB
  'text/plain': 10 * 1024 * 1024,      // 10MB
  'application/zip': 100 * 1024 * 1024, // 100MB
};

function getSafeFileName(name: string) {
  return (
    name
      .split(/[/\\]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .substring(0, 240) || "upload-file"
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Rate limit uploads per user
  const { limit, remaining } = await uploadLimiter.limit(session.user.id);
  if (!limit) {
    return NextResponse.json(
      { error: "Upload limit exceeded. Max 10 uploads per hour." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ✅ Validate actual file content, not just extension
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const detectedType: FileTypeResult | undefined = await FileType.fromBuffer(fileBuffer);

  if (!detectedType || !ALLOWED_MIMETYPES.includes(detectedType.mime)) {
    return NextResponse.json(
      { error: "File type not allowed. Accept: PDF, JPEG, PNG, WEBP, TXT, ZIP" },
      { status: 400 }
    );
  }

  // ✅ Verify declared MIME type matches actual content
  if (file.type && file.type !== detectedType.mime) {
    return NextResponse.json(
      { error: "File MIME type mismatch. File content doesn't match extension." },
      { status: 400 }
    );
  }

  // ✅ Enforce size limits per type
  const maxSize = MAX_SIZES[detectedType.mime] || 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File exceeds max size of ${Math.round(maxSize / 1024 / 1024)}MB` },
      { status: 413 }
    );
  }

  // ✅ Generate truly random filename (prevent enumeration)
  const randomName = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const safeName = getSafeFileName(file.name);
  const path = `uploads/${session.user.id}/${timestamp}-${randomName}-${safeName}`;

  // ✅ Upload to PRIVATE bucket
  const { data, error } = await supabase.storage
    .from("psychvault-resources-private") // Private bucket!
    .upload(path, fileBuffer, {
      contentType: detectedType.mime,
      upsert: false,
    });

  if (error || !data?.path) {
    return NextResponse.json(
      { error: error?.message || "Unable to upload file." },
      { status: 500 }
    );
  }

  // ✅ Return SIGNED URL valid for limited time, not public URL
  try {
    const { data: signedUrl } = await supabase.storage
      .from("psychvault-resources-private")
      .createSignedUrl(data.path, 3600); // 1 hour validity

    if (!signedUrl?.signedUrl) {
      return NextResponse.json(
        { error: "Unable to generate file URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrl.signedUrl, // Use signed URL, not public URL
      name: safeName,
      mime: detectedType.mime,
      size: file.size,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to generate secure file URL." },
      { status: 500 }
    );
  }
}
```

**Update Supabase:** Create private bucket in Supabase console:
- Create new bucket: `psychvault-resources-private`
- Set to PRIVATE (not public)
- Update code to use this bucket instead

---

## Verification Checklist

After applying fixes, verify:

```bash
# 1. Test CSRF protection
- Try submitting form without csrf-token ❌ Should fail
- Submit with valid token ✅ Should work

# 2. Test HTML injection fix
- Send contact: `<img src=x onerror="alert('xss')">` 
- Check email - should be escaped/HTML encoded ✅

# 3. Test rate limiting
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com", "password":"test", "name":"test"}' \
  # Run 4 times quickly
# 4th request should get 429 status ✅

# 4. Test upload validation
- Try uploading renamed .exe file → Should reject ✅
- Try uploading oversized file → Should reject ✅
- Upload valid PDF → Should work ✅

# 5. Test API authorization
curl http://localhost:3000/api/resources/nonexistent-id
# Should return 404 with minimal data ✅
```

---

## Timeline

- **Hour 1:** Implement CSRF protection (`src/lib/csrf.ts` + update all forms)
- **Hour 1:** Fix HTML injection in email
- **Hour 2:** Add rate limiting (Upstash setup + implementation)
- **Hour 2:** Fix vulnerable API endpoints (data selection + auth checks)
- **Hour 2:** Replace file upload validation with content-based checking

**Total: 8 hours of focused work**

---

## Next Steps After Critical Fixes

1. Add session security headers (middleware)
2. Fix remaining HIGH severity issues
3. Add password complexity validation
4. Implement comprehensive security headers
5. Set up security logging

See `SECURITY_AUDIT.md` for complete details on all vulnerabilities.
