import "./globals.css";
import type { Metadata } from "next";
import { getAppBaseUrl } from "@/lib/env";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const baseUrl = getAppBaseUrl();
const supportEmail = process.env.SUPPORT_EMAIL || "support@psychvault.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "PsychVault — Psychology Resources Marketplace",
    template: "%s | PsychVault",
  },
  description:
    "Discover clinician-made psychology resources, worksheets, psychoeducation, report templates, and tools for real clinical practice.",
  applicationName: "PsychVault",
  keywords: [
    "psychology resources",
    "psychologist templates",
    "therapy worksheets",
    "psychoeducation handouts",
    "clinical report templates",
    "NDIS psychology resources",
    "assessment tools",
    "mental health resources",
  ],
  authors: [{ name: "PsychVault" }],
  creator: "PsychVault",
  publisher: "PsychVault",
  other: {
    "contact:email": supportEmail,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo-PNG.png",
    shortcut: "/logo-PNG.png",
    apple: "/logo-PNG.png",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: baseUrl,
    siteName: "PsychVault",
    title: "PsychVault — Psychology Resources Marketplace",
    description:
      "Discover clinician-made psychology resources, worksheets, psychoeducation, report templates, and tools for real clinical practice.",
    images: [
      {
        url: "/logo-PNG.png",
        width: 822,
        height: 253,
        alt: "PsychVault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PsychVault — Psychology Resources Marketplace",
    description:
      "Discover clinician-made psychology resources for real clinical work.",
    images: ["/logo-PNG.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "healthcare",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PsychVault",
    description: "Discover clinician-made psychology resources, worksheets, psychoeducation, report templates, and tools for real clinical practice.",
    url: baseUrl,
    applicationCategory: "E-commerce",
    provider: {
      "@type": "Organization",
      name: "PsychVault",
      url: baseUrl,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: supportEmail,
      },
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "AUD",
      offerDetails: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "AUD",
          name: "Free psychology resources",
        },
        {
          "@type": "Offer",
          price: "1.00",
          priceCurrency: "AUD",
          name: "Paid psychology resources",
        },
      ],
    },
  };

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[var(--background)] text-[var(--text)] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="app-main flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
