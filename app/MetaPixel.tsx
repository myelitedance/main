// app/MetaPixel.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Wait for fbq to be available and then send PageView on route changes
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]); // include querystring changes too

  return null;
}