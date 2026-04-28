import"./globals.css";
import"./components.css";
import type { Metadata, Viewport } from"next";
import { Suspense } from"react";
import { getAppBaseUrl, getBusinessAddress, getSupportEmail, getSupportPhone } from"@/lib/env";
import { serializeJsonLd } from"@/lib/input-safety";
import { GoogleAnalytics } from"@/components/analytics/google-analytics";
import { Navbar } from"@/components/layout/navbar";
import { Footer } from"@/components/layout/footer";

const baseUrl = getAppBaseUrl();
const supportEmail = getSupportEmail();
const supportPhone = getSupportPhone();
const businessAddress = getBusinessAddress();
const socialProfiles = [
  "https://www.facebook.com/PsychVaultHQ",
  "https://www.instagram.com/psychvaulthq",
];

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default:"PsychVault - Psychology Resources Marketplace",
    template:"%s | PsychVault",
  },
  description:
"Discover psychology resources, worksheets, psychoeducation, report templates, and tools designed by practising clinicians for real clinical work.",
  applicationName:"PsychVault",
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
  authors: [{ name:"PsychVault" }],
  creator:"PsychVault",
  publisher:"PsychVault",
  other: {
"contact:email": supportEmail,
    ...(supportPhone ? {"contact:phone_number": supportPhone } : {}),
  },
  icons: {
    icon:"/logo-PNG.png",
    shortcut:"/logo-PNG.png",
    apple:"/logo-PNG.png",
  },
  openGraph: {
    type:"website",
    locale:"en_AU",
    url: baseUrl,
    siteName:"PsychVault",
    title:"PsychVault - Psychology Resources Marketplace",
    description:
"Discover psychology resources, worksheets, psychoeducation, report templates, and tools designed by practising clinicians for real clinical work.",
    images: [
      {
        url:"/opengraph-image",
        width: 1200,
        height: 630,
        alt:"PsychVault",
      },
    ],
  },
  twitter: {
    card:"summary_large_image",
    title:"PsychVault - Psychology Resources Marketplace",
    description:
"Discover psychology resources designed by practising clinicians for real clinical work.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
"max-image-preview":"large",
"max-snippet": -1,
"max-video-preview": -1,
    },
  },
  category:"healthcare",
};

export const viewport: Viewport = {
  width:"device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
"@context":"https://schema.org",
"@type":"Organization",
    name:"PsychVault",
    description:
"Discover psychology resources, worksheets, psychoeducation, report templates, and tools designed by practising clinicians for real clinical work.",
    url: baseUrl,
    logo: `${baseUrl}/logo-PNG.png`,
    sameAs: socialProfiles,
    contactPoint: {
"@type":"ContactPoint",
      contactType:"customer support",
      email: supportEmail,
      ...(supportPhone ? { telephone: supportPhone } : {}),
    },
    ...(businessAddress ? { address: businessAddress } : {}),
  };

  const websiteSchema = {
"@context":"https://schema.org",
"@type":"WebSite",
    name:"PsychVault",
    url: baseUrl,
    description:
"Discover psychology resources, worksheets, psychoeducation, report templates, and tools designed by practising clinicians for real clinical work.",
    publisher: {
"@type":"Organization",
      name:"PsychVault",
      url: baseUrl,
    },
    potentialAction: {
"@type":"SearchAction",
      target: `${baseUrl}/resources?q={search_term_string}`,
"query-input":"required name=search_term_string",
    },
  };

  const webApplicationSchema = {
"@context":"https://schema.org",
"@type":"WebApplication",
    name:"PsychVault",
    description:
"Discover psychology resources, worksheets, psychoeducation, report templates, and tools designed by practising clinicians for real clinical work.",
    url: baseUrl,
    applicationCategory:"E-commerce",
    provider: {
"@type":"Organization",
      name:"PsychVault",
      url: baseUrl,
      sameAs: socialProfiles,
      contactPoint: {
"@type":"ContactPoint",
        contactType:"customer support",
        email: supportEmail,
        ...(supportPhone ? { telephone: supportPhone } : {}),
      },
    },
    offers: {
"@type":"AggregateOffer",
      priceCurrency:"AUD",
      offerDetails: [
        {
"@type":"Offer",
          price:"0",
          priceCurrency:"AUD",
          name:"Free psychology resources",
        },
        {
"@type":"Offer",
          price:"1.00",
          priceCurrency:"AUD",
          name:"Paid psychology resources",
        },
      ],
    },
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          </>
        )}
        <link rel="preconnect" href="https://checkout.stripe.com" />
        {/* Consent Mode v2 default — must run synchronously before any gtag call.
            analytics_storage is granted by default so anonymous hits fire immediately.
            Ad signals stay denied until a cookie banner calls gtag('consent','update'). */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.dataLayer=window.dataLayer||[];" +
                "function gtag(){dataLayer.push(arguments);}" +
                "gtag('consent','default',{" +
                  "ad_storage:'denied'," +
                  "ad_user_data:'denied'," +
                  "ad_personalization:'denied'," +
                  "analytics_storage:'granted'," +
                  "wait_for_update:500" +
                "});",
            }}
          />
        ) : null}
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text)] antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webApplicationSchema) }}
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
