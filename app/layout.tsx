// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

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
  return (
    <html lang="en">
      <body className="scroll-smooth">{children}</body>
    </html>
  );
}