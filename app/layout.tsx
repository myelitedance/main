// app/layout.tsx (server component)
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import SiteHeaderWC from "@/components/SiteHeaderWC";
import HeaderIslands from "./HeaderIslands";

// 👇 add this: small client component that re-fires PageView on route changes
import MetaPixel from "./MetaPixel";

export const metadata: Metadata = {
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
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
  themeColor: "#8B5CF6", // dance-purple
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts.css" />

        {/* GA4 (unchanged) */}
        {isProd && GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}

        {/* Meta Pixel (loads the library + init + first PageView) */}
        {isProd && PIXEL_ID && (
          <Script id="fb-pixel" strategy="afterInteractive">{`
            !(function(f,b,e,v,n,t,s){
              if(f.fbq) return; n=f.fbq=function(){ n.callMethod ?
                n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
              if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
              n.queue=[]; t=b.createElement(e); t.async=!0; t.src=v;
              s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
            })(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}</Script>
        )}
      </head>

      <body className="scroll-smooth">
        {/* noscript fallback image for Meta Pixel */}
        {isProd && PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}

        {/* Vercel analytics */}
        {isProd && <Analytics />}
        {isProd && <SpeedInsights />}

        {/* Header assets */}
        <Script src="/components/site-header.js" type="module" strategy="afterInteractive" />
        <SiteHeaderWC />
        <Suspense fallback={null}>
          <HeaderIslands />
        </Suspense>

        {/* Fire PageView on client-side route changes */}
        {isProd && PIXEL_ID && <MetaPixel />}

        {/* Page content offset for fixed header */}
        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}