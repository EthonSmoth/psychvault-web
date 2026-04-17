/**
 * AHPRA-Aware Review Compliance System
 *
 * This module provides lightweight review analysis aligned with Australian
 * health advertising regulations. Focus is on education + light detection,
 * not aggressive keyword banning.
 *
 * Philosophy:
 * - Most reviews go through
 * - Users are informed upfront what to avoid
 * - Clear breaches → rejected
 * - Borderline content → flagged for manual review
 */

export type ReviewComplianceResult = {
  status: "approve" | "flag" | "reject";
  reason?: string;
  feedback?: string;
};

/**
 * Hard triggers that indicate clear AHPRA violations:
 * - Testimonial-style language (personal outcomes)
 * - Therapeutic claims
 * - Client/patient references
 */
const HARD_TRIGGERS = [
  // Client/patient references
  "my clients",
  "my patient",
  "my patients",
  "clients reported",
  "patients reported",

  // Treatment/cure claims (most restrictive)
  "this treated",
  "this cured",
  "this healed",
  "treated my",
  "cured my",
  "healed my",

  // Outcome-based testimonial language
  "changed my life",
  "life changing",
  "transformed my",
  "saved my",

  // Misleading authority claims
  "best psychologist",
  "best therapist",
  "best psychologist in",
  "only psychologist",
];

/**
 * Soft signals that suggest outcome-focused wording.
 * These are flagged (not rejected) because they're borderline
 * and depend on context.
 */
const SOFT_SIGNALS = [
  // Outcome language
  "helped me",
  "helped with my",
  "made a difference",
  "really effective",
  "worked well",
  "worked great",
  "very effective",
  "highly effective",
  "worked clinically",
  "improved my",
  "better after",
  "feels better",
  "anxiety went away",
  "depression went away",
  "stress went away",

  // Benefit claims (context matters)
  "for treatment",
  "for therapy",
];

/**
 * Analyse a review for AHPRA compliance.
 *
 * Returns:
 * - "approve": Clear to publish
 * - "flag": Flagged for manual review (but allow publish)
 * - "reject": Clear breach (block submission)
 */
export function analyseReviewCompliance(
  reviewText: string
): ReviewComplianceResult {
  if (!reviewText || reviewText.trim().length === 0) {
    // Empty reviews are fine (just ratings)
    return { status: "approve" };
  }

  const text = reviewText.toLowerCase().trim();

  // Check hard triggers
  for (const phrase of HARD_TRIGGERS) {
    if (text.includes(phrase)) {
      return {
        status: "reject",
        reason: "Likely clinical testimonial or therapeutic claim (AHPRA restriction)",
        feedback:
          "Please remove references to personal mental health experiences, client outcomes, or treatment effects. Reviews should focus on the resource itself (e.g., clarity, usability, structure).",
      };
    }
  }

  // Check soft signals
  for (const phrase of SOFT_SIGNALS) {
    if (text.includes(phrase)) {
      return {
        status: "flag",
        reason: "Potential outcome-based wording detected",
        feedback:
          "💡 Tip: Keep your review focused on how the resource works (e.g., clarity, usability, structure) rather than personal outcomes.",
      };
    }
  }

  return {
    status: "approve",
  };
}

/**
 * Get the first-time user notice (shown once before first review)
 */
export function getFirstReviewNotice(): string {
  return `
Reviews on this platform must comply with Australian health advertising regulations.

Please ensure your review:
• **Focuses on the resource itself** (e.g., usability, structure, quality)
• **Does NOT include** personal mental health experiences
• **Does NOT reference** client or patient outcomes
• **Does NOT make claims** about treatment effectiveness

Reviews that include clinical outcomes or therapeutic claims may be removed.
  `.trim();
}

/**
 * Get guidance text for inline help above review box
 */
export function getReviewGuidanceText(): string {
  return `Write a review about the resource (e.g., clarity, usability, structure).

Avoid:
• Personal mental health experiences
• Client or patient outcomes
• Statements about treatment effectiveness`;
}

/**
 * Check if a review appears to be a first review by a user
 * (used to decide whether to show first-time notice)
 */
export function isLikelyFirstReview(existingReview: { rating: number; body: string | null } | null): boolean {
  return !existingReview;
}

/**
 * Suggest a gentle rewrite for flagged content
 * (Optional nudge, not forced)
 */
export function suggestReviewRewrite(reviewText: string): string | null {
  const text = reviewText.toLowerCase();

  if (text.includes("helped me")) {
    return "💡 Try focusing on what made the resource useful (e.g., 'easy to use', 'well structured', 'clear examples').";
  }

  if (text.includes("made a difference")) {
    return "💡 Try describing the resource features instead (e.g., 'comprehensive', 'practical', 'well organized').";
  }

  if (text.includes("really effective") || text.includes("worked well")) {
    return "💡 Try describing why (e.g., 'clear instructions', 'good layout', 'comprehensive').";
  }

  return null;
}
