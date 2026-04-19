import type { Metadata } from"next";
import { RefundPolicyContent } from"@/components/legal/refund-policy-content";

export const metadata: Metadata = {
  title:"Refund Policy",
  description:
"Understand how PsychVault handles digital delivery, cancellations, refund requests, and customer support for marketplace purchases.",
  alternates: {
    canonical:"/refund-policy",
  },
};

// Renders the marketplace refund policy for production and legal review flows.
export default function RefundPolicyPage() {
  return <RefundPolicyContent />;
}
