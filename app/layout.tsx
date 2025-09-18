// app/layout.tsx (server component)
import "./globals.css"; // ✅ make sure Tailwind styles load in the app
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// JSX-safe wrapper for the custom element (client component)
import SiteHeaderWC from "@/components/SiteHeaderWC";
// React islands that hydrate *inside* the header (client component)
import HeaderIslands from "./HeaderIslands";

export const metadata: Metadata = {
  icons: {
    icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
  ],
  },

  title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
  description:
    "Elite Dance & Music in Nolensville, TN offers ballet, tap, jazz, hip hop, acro, and Mini-Movers recreation dance program. Supportive, high-quality training for ages 2–18.",
  metadataBase: new URL("https://www.myelitedance.com"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Elite Dance & Music",
    url: "https://www.myelitedance.com/",
    title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
    description:
      "Professional, high-quality dance training in an uplifting, supportive environment where every student is seen, challenged, and celebrated.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
    description:
      "Dance classes for ages 2–18 in Nolensville: ballet, tap, jazz, hip hop, acro, and more.",
  },
  themeColor: "#8B5CF6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts.css" />
        {isProd && GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="scroll-smooth">
        {/* Vercel analytics keep working */}
        {isProd && <Analytics />}
        {isProd && <SpeedInsights />}

        {/* Load the web component JS once (served from /public) */}
        <Script src="/components/site-header.js" type="module" strategy="afterInteractive" />

        {/* Custom element wrapper (prevents TS/JSX errors) */}
        <SiteHeaderWC />

        {/* Hydrate islands (LoginModal / TrialButton) into header slots */}
        <Suspense fallback={null}>
          <HeaderIslands />
        </Suspense>

        {/* Page content offset for fixed header */}
        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}