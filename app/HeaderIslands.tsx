"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import LoginModal from "@/components/LoginModal";

function mount(Component: any, el: HTMLElement | null, props: any = {}) {
  if (!el) return;
  const root = createRoot(el);
  root.render(<Component {...props} />);
}

export default function HeaderIslands() {
  useEffect(() => {
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland  = document.getElementById("edm-login-island-mobile");

    // Remove the fallback "Try a Class" CTA the web component adds
    if (desktopIsland) desktopIsland.innerHTML = "";
    if (mobileIsland)  mobileIsland.innerHTML  = "";

    // Mount JUST the Login modal trigger (button text comes from your LoginModal)
    if (desktopIsland) {
      const slot = document.createElement("span");
      desktopIsland.appendChild(slot);
      mount(LoginModal, slot);
    }

    if (mobileIsland) {
      const slotM = document.createElement("div");
      mobileIsland.appendChild(slotM);
      mount(LoginModal, slotM, {
        // Optional: make the mobile button full-width; remove if your LoginModal styles its own trigger
        buttonClassName:
          "w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-3 font-semibold",
      });
    }
  }, []);

  return null;
}