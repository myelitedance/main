"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import LoginModal from "@/components/LoginModal";

function mount(Component: any, el: HTMLElement | null) {
  if (!el) return;
  const root = createRoot(el);
  root.render(<Component />);
}

/** Finds the first clickable element that LoginModal renders (button or anchor) */
function findLoginTrigger(containerId: string): HTMLElement | null {
  const host = document.getElementById(containerId);
  if (!host) return null;
  // Look only inside the LoginModal mount
  return (host.querySelector("button, a") as HTMLElement | null) || null;
}

function normalizeTriggerLabel(trigger: HTMLElement | null) {
  if (!trigger) return;
  // Make sure the button says "Login" and looks like your header CTA
  trigger.textContent = "Login";
  trigger.classList.add(
    "inline-flex",
    "items-center",
    "rounded-full",
    "bg-gradient-to-r",
    "from-dance-purple",
    "to-dance-pink",
    "text-white",
    "px-4",
    "py-2",
    "font-semibold"
  );
}

export default function HeaderIslands() {
  useEffect(() => {
    // 1) Mount LoginModal into the islands
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland = document.getElementById("edm-login-island-mobile");

    if (desktopIsland) {
      desktopIsland.innerHTML = '<span id="edm-login-slot"></span>';
      mount(LoginModal, document.getElementById("edm-login-slot"));
    }
    if (mobileIsland) {
      mobileIsland.innerHTML = '<span id="edm-login-slot-m"></span>';
      mount(LoginModal, document.getElementById("edm-login-slot-m"));
    }

    // 2) After React paints, grab the real trigger and standardize it
    const t = setTimeout(() => {
      const dTrigger = findLoginTrigger("edm-login-slot");
      const mTrigger = findLoginTrigger("edm-login-slot-m");

      normalizeTriggerLabel(dTrigger);
      normalizeTriggerLabel(mTrigger);

      // 3) Fallback event from the WC -> click the real trigger
      const open = () => (dTrigger || mTrigger)?.click();
      window.addEventListener("edm:open-login" as any, open);

      // cleanup
      return () => window.removeEventListener("edm:open-login" as any, open);
    }, 0);

    return () => clearTimeout(t);
  }, []);

  return null;
}