import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how PsychVault collects, uses, stores, and protects personal information across browsing, accounts, purchases, and support.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

// Renders the public privacy policy page at the production-friendly route.
export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
