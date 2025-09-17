// global.d.ts
import type React from "react";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * Custom Web Component used in layout.tsx
       * Allows: <site-header></site-header>
       */
      "site-header": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
export {};