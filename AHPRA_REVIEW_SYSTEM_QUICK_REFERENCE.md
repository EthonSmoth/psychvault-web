# AHPRA Review System - Developer Quick Reference

## File Structure

```
src/
├── lib/
│   ├── review-compliance.ts          ← Core compliance logic
│   └── review-compliance.test.ts     ← Test cases & harness
├── server/
│   ├── actions/
│   │   └── review-actions.ts         ← Updated with compliance check
│   └── services/
│       └── review-moderation.ts      ← Admin utilities (NEW)
└── components/
    └── resources/
        └── review-form.tsx           ← Updated UI with notices
```

## Key Functions

### Compliance Analysis (`src/lib/review-compliance.ts`)

```typescript
// Main function - returns approval/flag/reject decision
analyseReviewCompliance(reviewText: string): ReviewComplianceResult

// UI text for first-time notice
getFirstReviewNotice(): string

// Guidance text above review box
getReviewGuidanceText(): string

// Gentle rewrite suggestions
suggestReviewRewrite(reviewText: string): string | null
```

### Server Action (`src/server/actions/review-actions.ts`)

```typescript
// Enhanced form state with compliance metadata
type ReviewFormState = {
  error?: string;
  success?: string;
  warning?: string;
  complianceFeedback?: string;
  isFlagged?: boolean;
  isFirstReview?: boolean;
}

// Saves review with compliance check
saveReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState>
```

### Admin Moderation (`src/server/services/review-moderation.ts`)

```typescript
// Get flagged reviews for dashboard
getFlaggedReviewsForModeration(limit: 50, offset: 0)

// Get count of flagged reviews
getCountFlaggedReviews()

// Get recent reviews for spot check
getRecentReviewsForComplianceCheck(hoursBack: 24, limit: 20)

// Get stats (total, flagged, rate, avg rating, recent flags)
getReviewModerationStats()

// Admin actions
approveReview(reviewId: string)
deleteReviewAsAdmin(reviewId: string)
```

## Flow Diagram

```
User submits review
    ↓
Server validates (rating, length, purchase)
    ↓
→ analyseReviewCompliance()
    ├─ Hard trigger? → REJECT (error, feedback)
    ├─ Soft signal? → FLAG (allow, warning)
    └─ Clean? → APPROVE
    ↓
Save review to DB
    ↓
Return state to client (success/error/warning/isFlagged)
    ↓
Client shows:
  - Success message
  - Warning if flagged
  - Error if rejected
```

## Constants

### Hard Triggers (REJECT)

```typescript
"my clients"
"my patient"
"my patients"
"this treated"
"this cured"
"this healed"
"changed my life"
"best psychologist"
// ... (26 total)
```

### Soft Signals (FLAG)

```typescript
"helped me"
"helped with my"
"made a difference"
"really effective"
"worked well"
"anxiety went away"
// ... (16 total)
```

## Testing

### Run Test Suite

```typescript
import { runComplianceTests } from '@/lib/review-compliance.test'

// Run all 27 tests
runComplianceTests()
```

### Test Specific Review

```typescript
import { testReviewCompliance } from '@/lib/review-compliance.test'

testReviewCompliance("Your review text here")
// Returns result with status, reason, feedback
```

## Usage Examples

### Example 1: Hard Trigger (Rejected)

```
User input: "This helped my clients with their trauma."
↓
analyseReviewCompliance() returns:
{
  status: "reject",
  reason: "References 'my clients' + therapeutic outcome",
  feedback: "Please remove references to personal mental health 
             experiences, client outcomes, or treatment effects..."
}
↓
saveReviewAction returns error state
↓
UI displays red error box with feedback
```

### Example 2: Soft Signal (Flagged)

```
User input: "Helped me manage my anxiety symptoms much better."
↓
analyseReviewCompliance() returns:
{
  status: "flag",
  reason: "Potential outcome-based wording detected",
  feedback: "💡 Tip: Keep your review focused on how the resource 
             works (e.g., clarity, usability, structure) rather than 
             personal mental health outcomes."
}
↓
saveReviewAction returns success + warning + isFlagged: true
↓
UI displays:
  - Green success box: "Review submitted"
  - Yellow warning box: "Review flagged for manual review..."
  - Admin sees in dashboard for approval/rejection
```

### Example 2b: Clean Feature Review (Approved)

```
User input: "Really helped me organize my practice better."
↓
analyseReviewCompliance() returns:
{
  status: "approve"
}
↓
saveReviewAction returns success state
↓
UI displays: "Review saved successfully"
```

## Admin Dashboard Integration

### Required Components

```typescript
// In admin page/route
import { 
  getFlaggedReviewsForModeration,
  getReviewModerationStats,
  approveReview,
  deleteReviewAsAdmin 
} from '@/server/services/review-moderation'

// Fetch data
const flaggedReviews = await getFlaggedReviewsForModeration(50, 0)
const stats = await getReviewModerationStats()

// Actions
await approveReview(reviewId)
await deleteReviewAsAdmin(reviewId)
```

### Create Server Action for Admin

```typescript
// Add to src/server/actions/admin-actions.ts
export async function adminApproveReviewAction(
  reviewId: string,
  csrfToken: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.role === 'ADMIN') return { error: "Unauthorized" }
  
  verifyCSRFToken(csrfToken, session.user.id)
  await approveReview(reviewId)
  
  return { success: true }
}

export async function adminRejectReviewAction(
  reviewId: string,
  adminNote: string,
  csrfToken: string
): Promise<{ success: boolean; error?: string }> {
  // Similar validation + delete + send email
}
```

## Session Storage (First-Time Notice)

The first-time notice uses browser `sessionStorage` to show once per session:

```typescript
// In ReviewForm component
useEffect(() => {
  if (isFirstReview && !sessionStorage.getItem('reviewNoticeShown')) {
    setShowFirstNotice(true)
    sessionStorage.setItem('reviewNoticeShown', 'true')
  }
}, [isFirstReview])
```

This means:
- ✅ Notice shows on first review submission
- ✅ Only once per browser session
- ✅ Clears when browser closed or refreshed
- ✅ No database needed

## Customization

### Add New Hard Trigger

```typescript
// src/lib/review-compliance.ts
const HARD_TRIGGERS = [
  // ... existing
  "new phrase to reject",
]
```

### Add New Soft Signal

```typescript
const SOFT_SIGNALS = [
  // ... existing
  "new phrase to flag",
]
```

### Change First-Time Notice

```typescript
export function getFirstReviewNotice(): string {
  return `Your custom notice here...`
}
```

### Adjust Rewrite Suggestions

```typescript
export function suggestReviewRewrite(reviewText: string): string | null {
  // Add custom logic
}
```

## Performance Considerations

- ✅ Compliance check runs server-side (secure, can't be bypassed)
- ✅ String matching only (minimal CPU impact)
- ✅ No ML or external APIs (instant)
- ✅ First-notice uses sessionStorage (no server call)
- ✅ Rewrite suggestions run client-side (minimal overhead)

## Debugging

### Enable Debug Logging

```typescript
// In review-actions.ts
logger.info('Compliance check', { 
  status: complianceResult.status,
  reason: complianceResult.reason 
})
```

### Test in Browser DevTools

```javascript
// Check if first notice was shown
sessionStorage.getItem('reviewNoticeShown') // 'true' or null

// View form state
// Check Network tab for saveReviewAction request
```

### Test Edge Cases

```typescript
// Empty review (rating only)
analyseReviewCompliance("") // → approve

// Case insensitivity
analyseReviewCompliance("MY CLIENTS") // → reject (lowercased)

// Partial phrase matching
analyseReviewCompliance("myclientsname") // → doesn't trigger

// Multiple hard triggers
analyseReviewCompliance("This treated my clients successfully")
// → reject (first trigger found)
```

## Migration Path (If Needed)

The system is designed to require **zero database migrations**:

```
Old schema:
  Review { id, buyerId, resourceId, rating, body, createdAt, updatedAt }

New behavior:
  - Same schema
  - Additional server-side logic only
  - No schema changes
  - No data migration
```

If you later want to track flagged reviews formally:

```sql
-- Optional future migration
ALTER TABLE Review ADD COLUMN isFlagged BOOLEAN DEFAULT FALSE;
ALTER TABLE Review ADD COLUMN complianceReason VARCHAR(255);
```

But this is NOT required for current implementation.

## Support & Questions

- **How does it work?** → See AHPRA_REVIEW_SYSTEM.md
- **How do I use it as admin?** → See ADMIN_REVIEW_MODERATION_GUIDE.md
- **What's the complete checklist?** → See IMPLEMENTATION_CHECKLIST.md
- **Test my logic:** → Use review-compliance.test.ts

---

**Last Updated:** 2026-04-17  
**Version:** 1.0  
**Status:** ✅ Production-ready (awaiting admin dashboard integration)
