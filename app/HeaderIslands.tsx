"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
//import TrialButton from "@/components/TrialButton";
import LoginModal from "@/components/LoginModal";

/**
 * Renders LoginModal + a visible "Login" button.
 * The button opens the modal by programmatically clicking the first
 * clickable element rendered by LoginModal (button or anchor).
 * Also listens for window "edm:open-login" so static fallback continues to work.
 */
function LoginIsland({ withTrial = false }: { withTrial?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  // Find the internal trigger rendered by LoginModal
  const findInternalTrigger = () => {
    const host = hostRef.current;
    if (!host) return null;
    // Look for something clickable inside our island subtree,
    // but ignore our own proxy button (data-proxy attr).
    const trigger = host.querySelector(
      "button:not([data-proxy-login]), a:not([data-proxy-login])"
    ) as HTMLElement | null;
    return trigger || null;
  };

  const openModal = () => {
    const trigger = findInternalTrigger();
    trigger?.click();
  };

  useEffect(() => {
    // Bridge global fallback -> open modal
    const handler = () => openModal();
    window.addEventListener("edm:open-login" as any, handler);
    // Also re-try once after a tick in case LoginModal renders async
    const t = setTimeout(() => {
      /* no-op: just ensures DOM settled before first use */
    }, 0);
    return () => {
      window.removeEventListener("edm:open-login" as any, handler);
      clearTimeout(t);
    };
  }, []);

  return (
    <div ref={hostRef} className="inline-flex items-center gap-3">
      {/* Keep LoginModal mounted so its internal trigger exists */}
      <LoginModal />

      {/* Our visible proxy trigger */}
      <button
        type="button"
        data-proxy-login
        onClick={(e) => {
          e.preventDefault();
          openModal();
        }}
        className="inline-flex items-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold"
      >
        Login
      </button>
    </div>
  );
}

// ---- minimal mount helpers ----
function mount(el: HTMLElement | null, node: React.ReactNode) {
  if (!el) return;
  const root = createRoot(el);
  root.render(node);
}

export default function HeaderIslands() {
  useEffect(() => {
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland = document.getElementById("edm-login-island-mobile");

    if (desktopIsland) {
      desktopIsland.innerHTML = '<span id="edm-login-slot"></span>';
      mount(
        document.getElementById("edm-login-slot"),
        <LoginIsland withTrial={true} />
      );
    }

    if (mobileIsland) {
      mobileIsland.innerHTML = '<div id="edm-login-slot-m"></div>';
      mount(document.getElementById("edm-login-slot-m"), <LoginIsland withTrial={true} />);
    }
  }, []);

  return null;
}