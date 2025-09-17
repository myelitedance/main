"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import TrialButton from "@/components/TrialButton";
import LoginModal from "@/components/LoginModal";

function mount(Component: any, el: HTMLElement | null, props: any = {}) {
  if (!el) return;
  const root = createRoot(el);
  root.render(<Component {...props} />);
}

function injectProxyLoginButton(container: HTMLElement, triggerContainerSelector: string) {
  // Find the real trigger that LoginModal renders (button or anchor).
  const triggerContainer = container.querySelector(triggerContainerSelector) || container;
  const realTrigger =
    triggerContainer.querySelector("button, a") as HTMLElement | null;

  if (!realTrigger) return;

  // Hide the original trigger (keep it in the DOM so React’s onClick still works)
  realTrigger.classList.add("hidden");

  // If a proxy is already there, don't add another
  if (container.querySelector(".edm-proxy-login")) return;

  // Create our proxy "Login" button that simply clicks the original trigger
  const proxy = document.createElement("button");
  proxy.type = "button";
  proxy.className =
    "edm-proxy-login inline-flex items-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold";
  proxy.textContent = "Login";
  proxy.addEventListener("click", (e) => {
    e.preventDefault();
    realTrigger.click();
  });

  // Put the proxy where the login component lives
  container.appendChild(proxy);

  // Also listen for the global fallback event -> click real trigger
  const openHandler = () => realTrigger.click();
  window.addEventListener("edm:open-login" as any, openHandler);

  // Clean up listener when we ever re-init (best effort)
  return () => window.removeEventListener("edm:open-login" as any, openHandler);
}

export default function HeaderIslands() {
  useEffect(() => {
    const desktopIsland = document.getElementById("edm-login-island");
    const mobileIsland = document.getElementById("edm-login-island-mobile");

    if (desktopIsland) {
      desktopIsland.innerHTML =
        '<span id="edm-login-slot"></span><span class="ml-3" id="edm-trial-slot"></span>';
      mount(LoginModal, document.getElementById("edm-login-slot"));
      mount(TrialButton, document.getElementById("edm-trial-slot"), { variant: "small" });
    }

    if (mobileIsland) {
      mobileIsland.innerHTML =
        '<div id="edm-login-slot-m"></div><div class="mt-2" id="edm-trial-slot-m"></div>';
      mount(LoginModal, document.getElementById("edm-login-slot-m"));
      mount(TrialButton, document.getElementById("edm-trial-slot-m"), { variant: "small" });
    }

    // Give React a tick to render, then inject proxy buttons for both islands
    const cleanups: Array<(() => void) | void> = [];
    const t = setTimeout(() => {
      const d = document.getElementById("edm-login-slot");
      const m = document.getElementById("edm-login-slot-m");
      if (d) cleanups.push(injectProxyLoginButton(d, ":scope")); // container is fine
      if (m) cleanups.push(injectProxyLoginButton(m, ":scope"));
    }, 0);

    return () => {
      clearTimeout(t);
      cleanups.forEach((fn) => fn && fn());
    };
  }, []);

  return null;
}