// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.myelitedance.com"),
  title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
  description:
    "Elite Dance & Music in Nolensville, TN offers ballet, tap, jazz, hip hop, acro, and Mini-Movers preschool dance. Supportive, high-quality training for ages 2–18.",
  alternates: { canonical: "/" },
  themeColor: "#8B5CF6",
  openGraph: {
    type: "website",
    title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
    description:
      "Professional, high-quality dance training in an uplifting, supportive environment where every student is seen, challenged, and celebrated.",
    url: "/",
    siteName: "Elite Dance & Music",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Dance & Music | Dance Classes in Nolensville, TN",
    description:
      "Dance classes for ages 2–18 in Nolensville: ballet, tap, jazz, hip hop, acro, and more.",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  // If you want the JSON-LD we can add it with <Script type="application/ld+json" /> below.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={poppins.className}>
        {children}

        {/* Analytics / security (from index.html) */}
        <Script defer src="/_vercel/insights/script.js" />
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        {/* JSON-LD from index.html */}
        <Script id="school-schema" type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "DanceSchool",
  "name": "Elite Dance & Music",
  "url": "https://www.myelitedance.com/",
  "logo": "https://www.myelitedance.com/assets/img/social-card.jpg",
  "telephone": "(615) 776-4202",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7177 Nolensville Rd Suite B-3",
    "addressLocality": "Nolensville",
    "addressRegion": "TN",
    "postalCode": "",
    "addressCountry": "US"
  },
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61573876559298",
    "https://www.instagram.com/elitedancetn/"
  ]
}
        `}</Script>
      </body>
    </html>
  );
}