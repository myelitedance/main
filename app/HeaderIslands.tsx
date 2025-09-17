// app/HeaderIslands.tsx
"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
// Use a path that matches your project. From /app, a relative import is simplest:
import TrialButton from "@/components/TrialButton";
import LoginModal from "@/components/LoginModal";

function mount(Component: any, el: HTMLElement | null, props: any = {}) {
  if (!el) return;
  try {
    const root = createRoot(el);
    root.render(<Component {...props} />);
  } catch (e) {
    console.error("Mount failed", e);
  }
}

export default function HeaderIslands() {
  useEffect(() => {
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland = document.getElementById("edm-login-island-mobile");

    // Desktop: Login + Trial side-by-side
    if (desktopIsland) {
      desktopIsland.innerHTML =
        '<span id="edm-login-slot"></span><span class="ml-3" id="edm-trial-slot"></span>';
      mount(LoginModal, document.getElementById("edm-login-slot"));
      mount(TrialButton, document.getElementById("edm-trial-slot"), { variant: "small" });
    }

    // Mobile: stacked
    if (mobileIsland) {
      mobileIsland.innerHTML =
        '<div id="edm-login-slot-m"></div><div class="mt-2" id="edm-trial-slot-m"></div>';
      mount(LoginModal, document.getElementById("edm-login-slot-m"));
      mount(TrialButton, document.getElementById("edm-trial-slot-m"), { variant: "small" });
    }
  }, []);

  return null;
}