/**
 * AHPRA Review Compliance - Test Cases & Examples
 *
 * Use this file to validate the compliance system works as expected.
 * All test cases are based on real patterns to watch for.
 */

import { analyseReviewCompliance } from "@/lib/review-compliance";

// ============================================================================
// REJECT CASES (Hard Triggers - Clear AHPRA Violations)
// ============================================================================

const REJECT_TEST_CASES = [
  {
    name: "Client reference + outcome",
    text: "This resource really helped my clients work through their trauma.",
    expectedStatus: "reject" as const,
    reason: "References 'my clients' + therapeutic outcome",
  },
  {
    name: "Patient outcome claim",
    text: "My patients reported feeling much better after using this.",
    expectedStatus: "reject" as const,
    reason: "Direct patient outcome reference",
  },
  {
    name: "Treatment claim",
    text: "This treated my depression effectively.",
    expectedStatus: "reject" as const,
    reason: "Contains 'treated' + mental health condition",
  },
  {
    name: "Cure claim",
    text: "This completely cured my anxiety.",
    expectedStatus: "reject" as const,
    reason: "Direct cure claim for mental health",
  },
  {
    name: "Testimony - life changing",
    text: "This resource changed my life. I couldn't have done it without this.",
    expectedStatus: "reject" as const,
    reason: "Life-changing testimonial language",
  },
  {
    name: "Authority claim",
    text: "Best psychologist I know created this resource.",
    expectedStatus: "reject" as const,
    reason: "Misleading authority claim",
  },
  {
    name: "Transformation claim",
    text: "This transformed my entire practice. Every therapist should use it.",
    expectedStatus: "reject" as const,
    reason: "Transformation + broad therapeutic claim",
  },
  {
    name: "Client outcomes",
    text: "Clients reported improved mood after using these templates.",
    expectedStatus: "reject" as const,
    reason: "Client outcome references",
  },
];

// ============================================================================
// FLAG CASES (Soft Signals - Borderline, Context-Dependent)
// ============================================================================

const FLAG_TEST_CASES = [
  {
    name: "Helped me + mental health term",
    text: "This really helped me with my anxiety management.",
    expectedStatus: "flag" as const,
    reason: "Contains 'helped me' - borderline but context ok",
  },
  {
    name: "Made a difference",
    text: "This made a real difference in how I structure sessions.",
    expectedStatus: "flag" as const,
    reason: "Soft signal 'made a difference' but neutral context",
  },
  {
    name: "Really effective",
    text: "The worksheets are really effective for group therapy.",
    expectedStatus: "flag" as const,
    reason: "Contains 'really effective' - needs manual review",
  },
  {
    name: "Anxiety went away",
    text: "My anxiety went away after I started using these techniques.",
    expectedStatus: "flag" as const,
    reason: "Mental health condition + outcome - soft signal",
  },
  {
    name: "Improved my symptoms",
    text: "These templates definitely improved my PTSD symptoms.",
    expectedStatus: "flag" as const,
    reason: "Direct symptom improvement claim",
  },
  {
    name: "Worked well clinically",
    text: "This worked well clinically in my practice.",
    expectedStatus: "flag" as const,
    reason: "Soft signal 'worked well clinically'",
  },
];

// ============================================================================
// APPROVE CASES (Clear, Resource-Focused Reviews)
// ============================================================================

const APPROVE_TEST_CASES = [
  {
    name: "Feature-focused positive review",
    text: "Great layout and very clear instructions. Templates are well-designed.",
    expectedStatus: "approve" as const,
    reason: "Focuses on resource qualities, no outcome claims",
  },
  {
    name: "Use case description",
    text: "Perfect for group sessions with adolescents. Easy to customize.",
    expectedStatus: "approve" as const,
    reason: "Describes use case, not outcomes",
  },
  {
    name: "Quality assessment",
    text: "Well-structured, professional presentation, and comprehensive.",
    expectedStatus: "approve" as const,
    reason: "Pure quality assessment",
  },
  {
    name: "Technical review",
    text: "The worksheets are downloadable in multiple formats. Very convenient.",
    expectedStatus: "approve" as const,
    reason: "Technical feature review",
  },
  {
    name: "Rating without text",
    text: "",
    expectedStatus: "approve" as const,
    reason: "No text = no compliance issues",
  },
  {
    name: "Neutral with minor concern",
    text: "Good resource but could use more examples for practitioners new to CBT.",
    expectedStatus: "approve" as const,
    reason: "Neutral feedback, no compliance issues",
  },
  {
    name: "Audience assessment",
    text: "This is excellent for experienced therapists who want quick resources.",
    expectedStatus: "approve" as const,
    reason: "Audience assessment without outcome claims",
  },
  {
    name: "Value for money",
    text: "Great value for the amount of content provided.",
    expectedStatus: "approve" as const,
    reason: "Price/value assessment",
  },
  {
    name: "Usability feedback",
    text: "Easy to navigate, professional design. Clear fonts and good organization.",
    expectedStatus: "approve" as const,
    reason: "Pure usability feedback",
  },
  {
    name: "Professional review",
    text: "As a clinical psychologist with 15 years experience, I can say this is well-designed.",
    expectedStatus: "approve" as const,
    reason: "Professional opinion on resource quality, not outcomes",
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

export async function runComplianceTests() {
  console.log("\n🔍 AHPRA Review Compliance Test Suite\n");

  let passed = 0;
  let failed = 0;

  // Test REJECT cases
  console.log("❌ Testing REJECT cases (hard triggers)...\n");
  for (const testCase of REJECT_TEST_CASES) {
    const result = analyseReviewCompliance(testCase.text);
    const pass = result.status === testCase.expectedStatus;
    passed += pass ? 1 : 0;
    failed += pass ? 0 : 1;

    console.log(`${pass ? "✓" : "✗"} ${testCase.name}`);
    console.log(`  Text: "${testCase.text}"`);
    console.log(`  Expected: ${testCase.expectedStatus}, Got: ${result.status}`);
    console.log(`  Reason: ${testCase.reason}`);
    if (result.feedback) {
      console.log(`  Feedback: ${result.feedback}`);
    }
    console.log();
  }

  // Test FLAG cases
  console.log("🚩 Testing FLAG cases (soft signals)...\n");
  for (const testCase of FLAG_TEST_CASES) {
    const result = analyseReviewCompliance(testCase.text);
    const pass = result.status === testCase.expectedStatus;
    passed += pass ? 1 : 0;
    failed += pass ? 0 : 1;

    console.log(`${pass ? "✓" : "✗"} ${testCase.name}`);
    console.log(`  Text: "${testCase.text}"`);
    console.log(`  Expected: ${testCase.expectedStatus}, Got: ${result.status}`);
    console.log(`  Reason: ${testCase.reason}`);
    if (result.feedback) {
      console.log(`  Feedback: ${result.feedback}`);
    }
    console.log();
  }

  // Test APPROVE cases
  console.log("✅ Testing APPROVE cases (clean reviews)...\n");
  for (const testCase of APPROVE_TEST_CASES) {
    const result = analyseReviewCompliance(testCase.text);
    const pass = result.status === testCase.expectedStatus;
    passed += pass ? 1 : 0;
    failed += pass ? 0 : 1;

    console.log(`${pass ? "✓" : "✗"} ${testCase.name}`);
    console.log(`  Text: "${testCase.text.substring(0, 60)}${testCase.text.length > 60 ? "..." : ""}"`);
    console.log(`  Expected: ${testCase.expectedStatus}, Got: ${result.status}`);
    console.log(`  Reason: ${testCase.reason}`);
    console.log();
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log("✅ All tests passed!");
  } else {
    console.log(`⚠️  ${failed} test(s) failed.`);
  }
}

// ============================================================================
// MANUAL TEST - Try your own review text
// ============================================================================

export function testReviewCompliance(reviewText: string) {
  const result = analyseReviewCompliance(reviewText);

  console.log("\n📝 Review Compliance Analysis");
  console.log(`\nReview text:\n"${reviewText}"\n`);
  console.log(`Status: ${result.status}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  if (result.feedback) console.log(`Feedback: ${result.feedback}`);

  return result;
}

/*
USAGE:

1. Run all tests:
   import { runComplianceTests } from '@/lib/review-compliance.test'
   runComplianceTests()

2. Test specific review:
   import { testReviewCompliance } from '@/lib/review-compliance.test'
   testReviewCompliance("Your review text here")
*/
