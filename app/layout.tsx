// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import ClientAnalytics from "./client-analytics";

export const metadata: Metadata = {
  title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
  description:
    "Elite Dance & Music in Nolensville, TN offers ballet, tap, jazz, hip hop, acro, and Mini-Movers preschool dance. Supportive, high-quality training for ages 2–18.",
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
        <ClientAnalytics />
        {children}
        {isProd && <Analytics />}
        {isProd && <SpeedInsights />}
      </body>
    </html>
  );
}