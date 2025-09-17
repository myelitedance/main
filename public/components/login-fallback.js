// public/components/login-fallback.js
// Minimal modal for static .html pages (no React). Listens for `edm:open-login`.

(function () {
  const NEW_DANCER_URL = "https://portal.akadadance.com/signup?schoolId=100";      // TODO: set your real URL
  const RETURNING_URL  = "https://portal.akadadance.com/auth?schoolId=100";  // TODO: set your real URL

  function ensureModal() {
    if (document.getElementById("edm-lite-login-modal")) return;

    const wrap = document.createElement("div");
    wrap.id = "edm-lite-login-modal";
    wrap.className =
      "fixed inset-0 z-[9999] hidden items-center justify-center";
    wrap.innerHTML = `
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm mx-auto">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">Sign in</h3>
        <p class="text-gray-600 mb-6">Choose one:</p>
        <div class="space-y-3">
          <a href="${NEW_DANCER_URL}" class="block w-full text-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold">New Dancer</a>
          <a href="${RETURNING_URL}"  class="block w-full text-center rounded-full border border-gray-300 text-gray-800 px-4 py-2 font-semibold hover:border-dance-purple">Returning Dancer</a>
        </div>
        <button id="edm-lite-close" class="mt-6 text-sm text-gray-500 hover:text-gray-700 underline">Close</button>
      </div>
    `;
    wrap.style.display = "none";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close();
    });
    wrap.querySelector("#edm-lite-close")?.addEventListener("click", close);

    function open()  { wrap.classList.remove("hidden"); wrap.style.display = "flex"; }
    function close() { wrap.classList.add("hidden");    wrap.style.display = "none"; }

    // expose small API
    window.__EDM_LITE_LOGIN__ = { open, close };
  }

  function onOpenLogin() {
    ensureModal();
    window.__EDM_LITE_LOGIN__?.open();
  }

  window.addEventListener("edm:open-login", onOpenLogin);

  // If the header fallback button exists, wire it as a safety
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.id === "edm-fallback-login") {
      e.preventDefault();
      onOpenLogin();
    }
  });
})();