# Admin Guide: AHPRA Review Moderation

## Overview

The AHPRA-aware review system flags reviews that may violate Australian health advertising regulations. As an admin, you manage this by reviewing flagged content and making moderation decisions.

## Review Classifications

### ✅ APPROVED (Auto-Published)
- Focus on resource features (clarity, usability, structure)
- No outcome claims
- No therapeutic language
- Examples: "Well-organized", "Clear instructions", "Great for group sessions"

### 🚩 FLAGGED (Manual Review)
- May contain borderline outcome language
- Depends on context (might be ok, might need revision)
- Examples: "Helped me", "Really effective", "Made a difference"

### ❌ REJECTED (Auto-Blocked)
- Clear AHPRA violations
- Patient/client outcome references
- Treatment claims
- User sees rejection message with feedback
- Example: "This cured my anxiety"

## Admin Dashboard Tasks

### 1. Review Flagged Reviews

In the admin panel, go to **Reviews → Flagged** to see:

```
Review List
├─ User: Alice Brown
├─ Resource: "CBT Worksheets for Anxiety"
├─ Rating: 5/5
├─ Text: "This really helped me with my anxiety management."
├─ Flagged: 2 hours ago
├─ Reason: Soft signal "helped me"
└─ Actions: [✓ Approve] [✗ Reject] [📌 Keep Flagged]
```

### 2. Decide: Approve or Reject

#### APPROVE (Remove Flag)
- **Use when:** Review is fine, just triggers soft signal in context
- **Example:** "Helped me structure my practice better" → Approve
  (Focuses on practice structure, not mental health outcomes)
- **Effect:** Review published normally, flag removed
- **Notify:** No notification (silently approved)

#### REJECT (Delete & Notify)
- **Use when:** Review clearly violates AHPRA on manual review
- **Example:** "This helped my clients with their trauma..." → Reject
  (After full read, contains client outcome references)
- **Effect:** Review deleted, user notified
- **Notify:** User gets email:
  ```
  Your review was not published because it includes content 
  that doesn't comply with platform guidelines.
  
  Admin Note: "Your review mentioned client outcomes. 
  Please avoid references to patient/client experiences 
  and focus on the resource itself."
  ```

#### KEEP FLAGGED (Defer)
- **Use when:** Unsure or need more context
- **Effect:** Stays in queue, marked for later review
- **When to use:** Rarely – try to make a decision

### 3. Monitor Patterns

#### Top Reasons for Flagging

```
"Helped me" or "Helped with"     40%
"Really effective"               25%
"Made a difference"              15%
Mental health condition + outcome 15%
"Worked well"                     5%
```

#### When to Escalate

Contact your supervisor if you see:
- ⚠️ Multiple rejections from same user (possible bad actor)
- ⚠️ Repeated approvals of outcome-focused reviews (policy drift)
- ⚠️ High false-positive rate (system needs tuning)
- ⚠️ Pattern of client/patient references (resource creator issue)

### 4. Common Decisions

#### ✓ APPROVE These

| Review Text | Why |
|---|---|
| "Very clear instructions, easy to follow." | Pure resource quality |
| "Great for adolescent groups." | Use case, not outcomes |
| "Professional design and well-organized." | Feature assessment |
| "Would be better with more examples." | Constructive feedback |
| "Helped me organize better." | Focuses on organization (resource feature), not health |

#### ✗ REJECT These

| Review Text | Why | Note |
|---|---|---|
| "Helped my clients feel better." | Patient outcome | Always reject client refs |
| "Cured my depression." | Treatment claim | Hard trigger |
| "My therapist recommended this." | Implicit outcome claim | Suggests therapeutic benefit |
| "Changed my life." | Testimonial language | Hard trigger |
| "Patients reported improvement." | Direct outcome | Always reject |

#### 🚩 REVIEW THESE (Context Matters)

| Review Text | Considerations |
|---|---|
| "Really helped my sessions." | Sessions = resource use (ok), or patient outcomes (not ok)? |
| "Improved my practice significantly." | Improved how? If process/structure = ok. If outcome = reject. |
| "This is effective for CBT." | Describes resource use (ok), or claims therapeutic efficacy (not ok)? |
| "My anxiety decreased after using this." | Personal mental health outcome → REJECT |

**Decision rule:** If you can interpret it neutrally (focusing on resource), approve. If mental health outcomes are explicit, reject.

## Using Admin Utilities

### Get Flagged Reviews

```typescript
import { getFlaggedReviewsForModeration } from "@/server/services/review-moderation";

const flagged = await getFlaggedReviewsForModeration(limit: 50);
```

Returns:
```
{
  review: { id, buyerId, resourceId, rating, body, createdAt },
  buyer: { name, email },
  resource: { title, slug, creator },
  reviewReports: [{ reason, createdAt }, ...]
}
```

### Get Recent Reviews for Spot Check

```typescript
import { getRecentReviewsForComplianceCheck } from "@/server/services/review-moderation";

const recent = await getRecentReviewsForComplianceCheck(hoursBack: 24);
```

### Get Moderation Stats

```typescript
import { getReviewModerationStats } from "@/server/services/review-moderation";

const stats = await getReviewModerationStats();
// {
//   totalReviews: 1523,
//   flaggedReviews: 43,
//   flagRatio: "2.82%",
//   averageRating: "4.6",
//   recentFlaggings: 12
// }
```

### Approve a Review

```typescript
import { approveReview } from "@/server/services/review-moderation";

await approveReview(reviewId);
```

### Reject a Review

```typescript
import { deleteReviewAsAdmin } from "@/server/services/review-moderation";

await deleteReviewAsAdmin(reviewId);
// User is automatically notified
```

## Quality Control

### Self-Check Questions

When reviewing a flagged review, ask yourself:

1. **Is there a client/patient reference?** → REJECT
2. **Does it claim treatment or cure?** → REJECT
3. **Is the mental health outcome explicit?** → REJECT
4. **Can I interpret this neutrally?** → APPROVE
5. **Is it genuinely borderline?** → Keep context notes

### Consistency Guidelines

- ✅ Be consistent week-to-week
- ✅ Document why you rejected (helps users improve)
- ✅ Approve neutral uses of soft signals
- ✅ Reject clear outcome claims
- ✅ When in doubt, approve (not reject)

### Review Your Decisions

Monthly, check:
- Rejection rate (should be ~5-10% of all reviews)
- Appeal rate (should be <5%)
- Escalations (should be <2)
- Average time to decide (target: <5 min per review)

## Communicating with Users

### When Rejecting

**Good rejection message:**
```
Your review mentioned client outcomes. Platform guidelines require 
reviews to focus on the resource itself (e.g., clarity, usability, structure).

Try: "Well-organized worksheets with clear instructions. Great for 
group sessions" instead of "helped my clients."

Feel free to resubmit!
```

**Avoid:**
```
❌ "Your review violates AHPRA regulations."
❌ "This is prohibited content."
❌ (No explanation)
```

### When Approving Borderline Reviews

No notification needed. Review just appears after removal of flag.

## Escalation Criteria

### Contact Supervisor If

1. **Review pattern issue:** Same creator repeatedly flagged
2. **System pattern:** >15% false positive rate
3. **Ambiguous case:** Unsure after 5 minutes of review
4. **Potential abuse:** User appears to be testing system
5. **AHPRA question:** Unsure if something violates regulation

### When to Update System

Contact engineering if:
- Recurring false positives (same phrase)
- New trigger pattern emerging
- System seems too aggressive/lenient
- New AHPRA guidance received

## Training Checklist

- [ ] Understand reject criteria (hard triggers)
- [ ] Understand flag criteria (soft signals)
- [ ] Know 5 examples of each (approve/flag/reject)
- [ ] Practice with 10 test reviews
- [ ] Review sample decisions from senior admin
- [ ] Know how to document decisions
- [ ] Know escalation process
- [ ] Certified to review live flags

## Common Questions

**Q: Should I approve "helped me" reviews?**
A: Depends on context. "Helped me organize" = ok. "Helped my anxiety" = reject.

**Q: What if review is vague?**
A: Benefit of doubt goes to user. If it could be innocent, approve.

**Q: Can I suggest rewrites?**
A: Not in rejection message. System shows gentle suggestions during submission.

**Q: What if resource creator says review is unfair?**
A: Check your decision against guidelines. If it was correct, stand firm.

**Q: How long to keep deciding?**
A: Target 5 minutes per review. If >10 min, escalate for help.

## Keyboard Shortcuts (Dashboard)

- `a` = Approve current review
- `r` = Reject current review  
- `n` = Next review
- `p` = Previous review
- `?` = Help

## Resources

- **AHPRA Guideline:** [Link to specific AHPRA section]
- **Internal Policy:** See AHPRA_REVIEW_SYSTEM.md
- **Test Cases:** See src/lib/review-compliance.test.ts
- **Escalation:** #moderation-help on internal Slack
