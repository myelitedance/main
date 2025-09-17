// app/layout.tsx
import Script from "next/script";
import SiteHeaderWC from "@/components/SiteHeaderWC";
import HeaderIslands from "./HeaderIslands";
// ...your existing imports & metadata

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
        {/* your analytics keep working */}
        {/* ...ClientAnalytics / Analytics / SpeedInsights etc. */}

        {/* Load the web component JS once */}
        <Script src="/components/site-header.js" type="module" strategy="afterInteractive" />

        {/* Use the JSX-safe wrapper */}
        <SiteHeaderWC />

        {/* Islands to replace the fallback CTA inside the header */}
        <HeaderIslands />

        <div className="pt-16">{children}</div>
      </body>
    </html>
  );
}