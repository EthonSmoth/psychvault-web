import type { Metadata } from "next";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the marketplace rules for using PsychVault, including accounts, digital purchases, licensing, refunds, and creator responsibilities.",
  alternates: {
    canonical: "/terms-of-service",
  },
};

// Renders the public terms page at the production-friendly route.
export default function TermsOfServicePage() {
  return <TermsOfServiceContent />;
}
