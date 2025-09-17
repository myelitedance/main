// public/components/login-fallback.js
// Pure JS modal that matches the React <LoginModal/> look & behavior
// Opens when header raises `window.dispatchEvent(new CustomEvent('edm:open-login'))`
// and also if a #edm-fallback-login button is clicked.

(function () {
  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'edm-login-fallback-modal';
    modalEl.className = 'fixed inset-0 z-50 hidden';

    modalEl.innerHTML = `
      <div class="absolute inset-0 bg-black/50"></div>
      <div class="relative min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative mx-4">
          <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-900 text-2xl" aria-label="Close">&times;</button>
          <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">Login to Your Account</h3>
          <div class="space-y-4">
            <button
              data-action="new"
              class="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all">
              New Dancer
            </button>
            <button
              data-action="returning"
              class="w-full bg-gradient-to-r from-dance-purple to-dance-pink text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all">
              Returning Dancer
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Close handlers
    const closeBtn = modalEl.querySelector('button[aria-label="Close"]');
    const backdrop = modalEl.firstElementChild;

    function close() { modalEl.classList.add('hidden'); }
    function escToClose(e){ if (e.key === 'Escape') close(); }

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    document.addEventListener('keydown', escToClose);

    // Actions
    modalEl.querySelector('[data-action="new"]')?.addEventListener('click', () => {
      window.location.href = 'https://portal.akadadance.com/signup?schoolId=100';
    });
    modalEl.querySelector('[data-action="returning"]')?.addEventListener('click', () => {
      window.location.href = 'https://portal.akadadance.com/auth?schoolId=100';
    });

    return modalEl;
  }

  function openModal() {
    const el = ensureModal();
    el.classList.remove('hidden');
  }

  // 1) Header fires this event on click
  window.addEventListener('edm:open-login', openModal);

  // 2) If the header injected a fallback button, click it -> open
  function wireButtons() {
    document.querySelectorAll('#edm-fallback-login').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
    });
  }

  // Wire now and after small delay in case header loads async
  wireButtons();
  setTimeout(wireButtons, 300);
})();