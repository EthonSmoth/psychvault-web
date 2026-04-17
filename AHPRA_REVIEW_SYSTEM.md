# AHPRA-Aware Review System (Balanced Approach)

## Overview

This system implements lightweight review compliance aligned with Australian health advertising regulations (AHPRA), focused on **education** and **proportionate action** rather than aggressive keyword banning.

## Philosophy

- **Most reviews go through** – Users are trusted by default
- **Users are informed upfront** – Clear guidance before submission
- **Proportionate action** – Clear breaches rejected, borderline flagged
- **Scalable moderation** – Minimal false positives

## How It Works

### 1. First-Time User Notice (Session-Based)

When a user submits their first review, they see a prominent notice:

```
📋 Platform Guidelines

Reviews on this platform must comply with Australian health advertising regulations.

Please ensure your review:
• Focuses on the resource itself (e.g. usability, structure, quality)
• Does NOT include personal mental health experiences
• Does NOT reference client or patient outcomes
• Does NOT make claims about treatment effectiveness

Reviews that include clinical outcomes or therapeutic claims may be removed.
```

This notice appears once per session in localStorage and is the most important compliance lever (handles ~80% of issues through user education).

### 2. Inline Guidance (Above Review Box)

```
Write a review about the resource (e.g., clarity, usability, structure).

Avoid:
• Personal mental health experiences
• Client or patient outcomes
• Statements about treatment effectiveness
```

### 3. Lightweight Analysis (Server-Side)

Reviews are analyzed for two categories:

#### Hard Triggers (Block Submission)

These are clear AHPRA violations:
- **Client/patient references:** "my clients", "my patients", "clients reported"
- **Treatment claims:** "this treated", "this cured", "this healed"
- **Testimonial language:** "changed my life", "transformed my"
- **Authority claims:** "best psychologist in", "only therapist"

**Action:** Rejected with helpful feedback

#### Soft Signals (Flag for Review)

These suggest outcome-focused wording but depend on context:
- "helped me", "made a difference", "really effective"
- "worked well clinically", "improved my"
- "anxiety went away", "depression went away"

**Action:** Allowed but flagged for manual review (admin can investigate)

### 4. Real-Time Rewrite Suggestions

As users type, gentle nudges appear:

```
💡 Try focusing on what made the resource useful 
(e.g., 'easy to use', 'well structured', 'clear examples').
```

These are suggestions, not blocks.

### 5. Compliance Feedback

**On rejection:**
```
Please remove references to personal mental health experiences, client 
outcomes, or treatment effects. Reviews should focus on the resource 
itself (e.g., clarity, usability, structure).
```

**On flagging:**
```
💡 Tip: Keep your review focused on how the resource works 
(e.g., clarity, usability, structure) rather than outcomes.
```

## Code Implementation

### Module: `src/lib/review-compliance.ts`

Provides three main functions:

#### `analyseReviewCompliance(reviewText: string): ReviewComplianceResult`

```typescript
{
  status: "approve" | "flag" | "reject",
  reason?: string,
  feedback?: string
}
```

Returns action and user-facing feedback.

#### `getFirstReviewNotice(): string`

Returns the first-time user notice text.

#### `getReviewGuidanceText(): string`

Returns inline guidance for the review box.

#### `suggestReviewRewrite(reviewText: string): string | null`

Generates a gentle rewrite suggestion based on detected phrases.

### Server Action: `saveReviewAction()`

Enhanced with:
1. Compliance analysis via `analyseReviewCompliance()`
2. First-review detection (count reviews by user)
3. Rejection handling (block + feedback)
4. Flagging warning (allow + warning message)
5. State returned to client for UI updates

#### Return State

```typescript
type ReviewFormState = {
  error?: string;          // Rejection message
  success?: string;        // Success message
  warning?: string;        // Flagging warning
  complianceFeedback?: string;
  isFlagged?: boolean;
  isFirstReview?: boolean;
}
```

### Component: `ReviewForm`

Enhanced with:
1. **First-time notice** – Shows once per session (sessionStorage)
2. **Inline guidance** – Always visible above textarea
3. **Real-time suggestions** – Generated as user types
4. **Error/warning/success states** – Appropriate messaging

## Admin Moderation

### Flagged Reviews

Flagged reviews appear in admin dashboard with:
- Review text
- Reason flagged
- User profile
- Option to approve or reject

**Action buttons:**
- ✓ Approve – Remove flag, publish normally
- ✗ Reject – Remove review, notify user with reason
- 📌 Keep flagged – Leave for later review

### Admin Notes

When rejecting a flagged review, admins can provide context:

```
Example: "This mentions client outcomes; please remove and resubmit."
```

## Testing Compliance

### Test Cases

#### Should REJECT (Hard Triggers)

❌ *"This helped my clients with anxiety"*
❌ *"My patients reported feeling better"*
❌ *"This cured my depression"*
❌ *"Best psychologist I know"*

#### Should FLAG (Soft Signals)

🚩 *"Really helped me organize my thoughts"*
🚩 *"Made a real difference in my practice"*
🚩 *"My anxiety went away after using this"*

#### Should APPROVE

✅ *"Well-structured, easy to follow"*
✅ *"Great for group sessions"*
✅ *"Clear examples and templates"*
✅ *"This is a 5/5 because the layout is excellent"*

## Why This Approach Works

### 1. Aligns with AHPRA's Actual Concerns

AHPRA focuses on:
- ✔ Misleading health claims
- ✔ Testimonial-based promotion
- ✔ Unsubstantiated effectiveness statements

Not:
- ✗ Every mention of mental health terms
- ✗ All outcome-related language

### 2. Preserves User Engagement

Heavy filtering:
- ❌ Kills reviews (users give up)
- ❌ Frustrates creators
- ❌ Reduces social proof

This approach:
- ✅ Keeps reviews flowing
- ✅ Nudges into compliance
- ✅ Maintains credibility

### 3. Scales Moderation

- Fewer false positives = less manual review
- Clear thresholds = consistent decisions
- First-notice + inline guidance = proactive
- Flagging layer = soft review for borderline cases

## Compliance Protection

### What This Shows Regulators

✔ **Informed users** – First-notice + inline guidance
✔ **Clear boundaries** – Documented hard triggers
✔ **Reasonable steps** – Automated detection + manual review layer
✔ **Proportionate action** – Flag-then-review approach

### Real-World Scenario

> "A user submitted a review saying 'This helped me manage my anxiety better.' 
> This triggers a soft signal, so it's flagged. An admin reviews it, sees the 
> context is neutral (just describing how they used the resource), and approves it.
> Meanwhile, another review says 'This cured my depression' – hard trigger, rejected 
> immediately with helpful feedback."

This demonstrates that PsychVault:
- Takes compliance seriously
- Has reasonable processes
- Acts proportionately
- Supports user experience

## Migration & Deployment

### No Database Migration Required

The system uses:
- Existing `Review` model (no schema changes)
- Client-side sessionStorage for first-notice tracking
- Server-side logic for compliance analysis

### Deployment Steps

1. Deploy new files:
   - `src/lib/review-compliance.ts`
   - Updated `src/server/actions/review-actions.ts`
   - Updated `src/components/resources/review-form.tsx`

2. No Prisma migration needed

3. Test with sample reviews (see Test Cases above)

4. Monitor flagged reviews in admin dashboard

## Future Enhancements

### Optional Additions

- **ML-based detection** – Train on flagged reviews for improved accuracy
- **User appeal process** – Let users contest rejected reviews
- **Compliance reports** – Dashboard showing rejection reasons + trends
- **Creator warnings** – Alert creators before flagging
- **Feedback loop** – Track which flags were correctly/incorrectly flagged

## Summary

This balanced AHPRA-aware review system:
- ✅ Educates users proactively
- ✅ Blocks clear violations
- ✅ Flags borderline cases for review
- ✅ Suggests gentle rewrites
- ✅ Maintains user engagement
- ✅ Scales moderation
- ✅ Demonstrates due diligence to regulators

The key insight: You don't need perfect language control. You need to show you've **informed users**, **set clear boundaries**, and **taken reasonable steps**.
