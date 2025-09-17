"use client";

import { useEffect, useRef } from "react";
import LoginModal from "@/components/LoginModal";

/**
 * - Renders ONE hidden <LoginModal /> inside the Next app tree (so it has all providers/portals).
 * - Writes a plain <button> into the header islands that dispatches a window event.
 * - Listens for that event and programmatically clicks the REAL LoginModal trigger.
 */
export default function HeaderIslands() {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Put a plain "Login" button in the header islands that fires a global event.
    const mountLoginButton = (containerId: string) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = `
        <button type="button"
          class="inline-flex items-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold"
          id="${containerId}-btn">
          Login
        </button>
      `;
      const btn = document.getElementById(`${containerId}-btn`);
      btn?.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("edm:open-login"));
      });
    };

    mountLoginButton("edm-login-island");
    mountLoginButton("edm-login-island-mobile");

    // After <LoginModal /> renders, find its true trigger button/anchor once.
    // We render it hidden below in JSX, so it's inside the app tree.
    const findTrigger = () => {
      const host = document.getElementById("edm-login-hidden");
      if (!host) return null;
      const el = host.querySelector("button, a") as HTMLElement | null;
      return el || null;
    };

    // Try a couple of times to catch async mount
    const t1 = setTimeout(() => (triggerRef.current ||= findTrigger()), 0);
    const t2 = setTimeout(() => (triggerRef.current ||= findTrigger()), 200);

    const openHandler = () => {
      // Ensure we have the trigger; if not, attempt to refind
      if (!triggerRef.current) triggerRef.current = findTrigger();
      triggerRef.current?.click();
    };

    window.addEventListener("edm:open-login" as any, openHandler);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("edm:open-login" as any, openHandler);
    };
  }, []);

  // Hidden mount: the real LoginModal (with its own trigger) lives INSIDE the Next tree
  // Programmatic click works even if hidden; the modal itself portals to <body>.
  return (
    <div id="edm-login-hidden" className="hidden">
      <LoginModal />
    </div>
  );
}