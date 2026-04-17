# AHPRA Review System - Implementation Checklist

## ✅ Completed Components

### Core System
- [x] **Compliance analysis module** (`src/lib/review-compliance.ts`)
  - [x] Hard triggers (reject)
  - [x] Soft signals (flag)
  - [x] User notices and guidance text
  - [x] Rewrite suggestions
  - [x] No database schema changes required

- [x] **Server action updates** (`src/server/actions/review-actions.ts`)
  - [x] Import compliance functions
  - [x] Enhanced ReviewFormState type
  - [x] Compliance check in saveReviewAction
  - [x] First review detection
  - [x] Reject handling (block + feedback)
  - [x] Flag detection (allow + warning)
  - [x] Return compliance metadata to client

- [x] **UI component updates** (`src/components/resources/review-form.tsx`)
  - [x] First-time user notice (sessionStorage)
  - [x] Inline guidance above textarea
  - [x] Real-time rewrite suggestions
  - [x] Error/warning/success states
  - [x] Compliance feedback display
  - [x] Flagging warnings

- [x] **Admin utilities** (`src/server/services/review-moderation.ts`)
  - [x] Flagged review queries
  - [x] Manual review functions
  - [x] Statistics aggregation
  - [x] Ready for dashboard integration

- [x] **Testing utilities** (`src/lib/review-compliance.test.ts`)
  - [x] Test cases (approve/flag/reject)
  - [x] Test runner
  - [x] Manual testing harness
  - [x] 27 test cases (9 reject + 8 flag + 10 approve)

### Documentation
- [x] **System documentation** (AHPRA_REVIEW_SYSTEM.md)
  - [x] Philosophy and approach
  - [x] How it works (5 layers)
  - [x] Code implementation details
  - [x] Compliance protection
  - [x] Testing guide
  - [x] Future enhancements

- [x] **Admin guide** (ADMIN_REVIEW_MODERATION_GUIDE.md)
  - [x] Review classifications
  - [x] Decision framework
  - [x] Approval/rejection guidelines
  - [x] Pattern monitoring
  - [x] Escalation criteria
  - [x] Common decisions table
  - [x] Training checklist

## ⏳ Needs Integration

### Admin Dashboard Features (Not Yet Implemented)

These require integration into your existing admin dashboard at `/admin`:

#### 1. Flagged Reviews Queue
```
Location: /admin/reviews/flagged or /admin?view=flagged-reviews

Needs:
[ ] Table showing flagged reviews
    - Review text (first 100 chars)
    - Buyer name + email
    - Resource title
    - Rating
    - Flag reason
    - Time flagged
[ ] Pagination (50 per page)
[ ] Search by user email or resource title
[ ] Filter by reason (soft signal type)
[ ] Sort by date (oldest/newest)
```

**UI Components to Build:**
- ReviewFlaggedQueue table component
- ReviewModerationAction buttons (Approve/Reject)
- AdminModerationNote text field (optional)

#### 2. Review Moderation Actions
```
Buttons needed:
[ ] Approve (clear flags, publish)
[ ] Reject (delete review, notify user)
[ ] Defer (keep flagged for later)

On Reject:
[ ] Delete review from DB
[ ] Send notification email to user with admin note
[ ] Log action to ModerationEvent table
[ ] Refresh list
```

**Server action to create:**
```typescript
export async function adminRejectReviewAction(
  reviewId: string,
  adminNote?: string,
  csrfToken: string
): Promise<{ success: boolean; error?: string }>
```

#### 3. Review Statistics Dashboard
```
Location: /admin (overview section)

Display:
[ ] Total reviews: 1,523
[ ] Flagged reviews: 43 (2.8%)
[ ] Average rating: 4.6/5
[ ] Flagged last 7 days: 12
[ ] Top flagging reason: "Soft signal: helped me"
```

Use existing function:
```typescript
import { getReviewModerationStats } from "@/server/services/review-moderation";
const stats = await getReviewModerationStats();
```

#### 4. Recent Reviews Spot Check
```
Location: /admin (optional section)

Show last 24 hours of reviews:
[ ] Quick scan of recent submissions
[ ] Highlight any that appear problematic
[ ] Not yet reported/flagged
[ ] Quick action to manually flag if needed
```

### Email Notification (When Review Rejected)
```
Template needed: src/lib/email.ts

Add function:
async function sendReviewRejectionEmail(
  buyerEmail: string,
  buyerName: string,
  adminNote: string,
  resourceTitle: string
)

Email content:
---
Subject: Your review was not published

Hi {buyerName},

Your review for "{resourceTitle}" was not published because it 
includes content that doesn't comply with our platform guidelines.

{adminNote}

You're welcome to resubmit a revised review that focuses on the 
resource itself (e.g., clarity, usability, structure) rather than 
personal outcomes.

Thanks for your understanding!
---
```

### Admin Navigation Updates
```
File: src/app/admin/page.tsx or layout

Add to sidebar/tabs:
[ ] Reviews
    ├─ Flagged ({count}) ← NEW
    ├─ Reported ← existing
    └─ Spot Check (last 24h) ← NEW
```

## 🔍 Testing

### Pre-Deployment Testing

- [ ] Run compliance test suite: `npm run test:compliance`
  - Verify all 27 test cases pass
  - Check reject cases block correctly
  - Check flag cases allow through
  - Check approve cases pass through

- [ ] Manual UI testing:
  - [ ] First time user sees notice
  - [ ] Notice appears once per session only
  - [ ] Inline guidance visible
  - [ ] Rewrite suggestions appear
  - [ ] Hard trigger blocks with feedback
  - [ ] Soft signal allows with warning
  - [ ] Existing reviews update correctly

- [ ] Admin dashboard testing:
  - [ ] Flagged reviews display correctly
  - [ ] Approve removes flag
  - [ ] Reject deletes review + sends email
  - [ ] Stats calculations correct
  - [ ] Pagination works

### Production Monitoring

After deployment, monitor:
- [ ] Review submission success rate (target: >95%)
- [ ] Rejection rate (target: 5-10% hard triggers)
- [ ] Flagging rate (target: 5-15% soft signals)
- [ ] Admin approval rate (target: 70%+ of flags)
- [ ] User resubmission rate (track rejections → rewrites)
- [ ] False positive rate (track incorrectly flagged approvals)

## 📦 Deployment Steps

### 1. Code Deployment
```bash
# Files deployed:
✓ src/lib/review-compliance.ts (NEW)
✓ src/lib/review-compliance.test.ts (NEW)
✓ src/server/actions/review-actions.ts (UPDATED)
✓ src/components/resources/review-form.tsx (UPDATED)
✓ src/server/services/review-moderation.ts (NEW)

# Documentation deployed:
✓ AHPRA_REVIEW_SYSTEM.md (NEW)
✓ ADMIN_REVIEW_MODERATION_GUIDE.md (NEW)
✓ IMPLEMENTATION_CHECKLIST.md (THIS FILE)

# No Prisma migrations needed
# No database schema changes
```

### 2. Feature Flags (Optional)
```typescript
// Can deploy with feature flag if needed
export const COMPLIANCE_CHECK_ENABLED = process.env.COMPLIANCE_CHECK_ENABLED !== "false";
```

### 3. Rollout Strategy

**Option A: Immediate Full Rollout**
- Deploy all code
- System active immediately
- Reviews checked for compliance
- Flagged reviews await admin integration

**Option B: Staged Rollout**
- Day 1: Deploy code, compliance checks active
- Day 3: Admin dashboard integration complete
- Day 5: Full monitoring and statistics

## 🎓 Team Training

Before going live:
- [ ] Engineers: Code review & testing
- [ ] Admins: Review moderation guide training
- [ ] QA: Test case validation
- [ ] Support: FAQ for rejection messages
- [ ] Legal: Review compliance approach

## 📋 Remaining To-Do

### High Priority (Before Launch)
- [ ] Integrate admin dashboard components
- [ ] Add review rejection email
- [ ] Deploy and test in staging
- [ ] Admin team training
- [ ] Create support FAQs

### Medium Priority (Week 1)
- [ ] Monitor false positive rate
- [ ] Adjust soft signals if needed
- [ ] Document any edge cases found
- [ ] Set up admin alerts for high flag rates

### Low Priority (Week 2+)
- [ ] Consider ML-based improvements
- [ ] Add user appeal process
- [ ] Build compliance reports
- [ ] Train junior admins

## 🚀 Go-Live Checklist

- [ ] All code deployed and tested
- [ ] Admin dashboard ready
- [ ] Email template active
- [ ] Documentation finalized
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Support team briefed
- [ ] Legal review complete

## 📞 Support Contacts

- **Compliance Questions:** Legal team
- **Admin Dashboard Issues:** Engineering team
- **False Positives:** Review with senior admin
- **User Appeals:** Customer support
- **AHPRA Inquiries:** Legal + compliance officer

---

**Status:** ✅ Core system complete, awaiting admin dashboard integration

**Last Updated:** 2026-04-17

**Next Review:** 2026-05-01 (post-launch feedback)
