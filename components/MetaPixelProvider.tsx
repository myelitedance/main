// components/MetaPixelProvider.tsx
"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { TRACKED_ROUTE_PREFIXES } from "@/lib/tracking";

export default function MetaPixelProvider({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();

  const isTrackedRoute = TRACKED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (!isTrackedRoute) return null;

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{`
        !(function(f,b,e,v,n,t,s){
          if(f.fbq) return; n=f.fbq=function(){ n.callMethod ?
            n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
          if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
          n.queue=[]; t=b.createElement(e); t.async=!0; t.src=v;
          s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
        })(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}</Script>
    </>
  );
}
