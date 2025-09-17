"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import TrialButton from "@/components/TrialButton";
import LoginModal from "@/components/LoginModal";

/**
 * Mounts small React "islands" into the header placeholders that the web
 * component renders (#edm-login-island and #edm-login-island-mobile).
 *
 * Also bridges the custom event `edm:open-login` -> clicks the real LoginModal
 * trigger button so the fallback <button id="edm-fallback-login"> works.
 */
function mount(Component: any, el: HTMLElement | null, props: any = {}) {
  if (!el) return;
  const root = createRoot(el);
  root.render(<Component {...props} />);
}

export default function HeaderIslands() {
  useEffect(() => {
    // create slots then mount components
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland = document.getElementById("edm-login-island-mobile");

    if (desktopIsland) {
      // two slots: login + trial
      desktopIsland.innerHTML =
        '<span id="edm-login-slot"></span><span class="ml-3" id="edm-trial-slot"></span>';
      mount(LoginModal, document.getElementById("edm-login-slot"));
      mount(TrialButton, document.getElementById("edm-trial-slot"), {
        variant: "small",
      });
    }

    if (mobileIsland) {
      mobileIsland.innerHTML =
        '<div id="edm-login-slot-m"></div><div class="mt-2" id="edm-trial-slot-m"></div>';
      mount(LoginModal, document.getElementById("edm-login-slot-m"));
      mount(TrialButton, document.getElementById("edm-trial-slot-m"), {
        variant: "small",
      });
    }

    // After LoginModal renders, find its trigger and normalize the label to "Login".
    // Then bridge `edm:open-login` -> click that trigger.
    const tryWireLoginTrigger = () => {
      // Heuristic: grab the first clickable element inside the login mount(s)
      const candidates: HTMLElement[] = [];
      const d = document.getElementById("edm-login-slot");
      const m = document.getElementById("edm-login-slot-m");
      if (d) candidates.push(...Array.from(d.querySelectorAll("button,a")) as HTMLElement[]);
      if (m) candidates.push(...Array.from(m.querySelectorAll("button,a")) as HTMLElement[]);

      const trigger = candidates.find((el) => el instanceof HTMLElement);
      if (!trigger) return;

      // Make it look right
      if (trigger.textContent && trigger.textContent.trim() !== "Login") {
        trigger.textContent = "Login";
      }
      trigger.id = "edm-login-trigger";

      // Bridge: clicking fallback or any script dispatching the event opens the real modal
      const openHandler = () => trigger.click();
      window.addEventListener("edm:open-login" as any, openHandler);

      // Also: if a leftover fallback exists, hijack it to click the real trigger
      document.querySelectorAll("#edm-fallback-login").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          trigger.click();
        });
      });

      // Cleanup on unmount
      return () => {
        window.removeEventListener("edm:open-login" as any, openHandler);
      };
    };

    // Wire once now, and again after a tick in case the modal mounts async
    let cleanup: (() => void) | undefined;
    const t1 = setTimeout(() => {
      cleanup = tryWireLoginTrigger() || cleanup;
    }, 0);
    const t2 = setTimeout(() => {
      cleanup = tryWireLoginTrigger() || cleanup;
    }, 200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cleanup?.();
    };
  }, []);

  return null;
}