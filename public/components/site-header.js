// public/components/site-header.js
// Elite Dance & Music header web component (light DOM)
// - Reads /partials/nav.json for links
// - Smooth-scroll on "/" only; from other pages, anchors go to "/#id"
// - Provides a "Login" fallback that React can replace (Next) or a static helper can catch

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.renderSkeleton();
    this.loadNav();
    this.bindEvents();
    this.markActive();
  }

  renderSkeleton() {
    const forcedPath = this.getAttribute('data-page');
    this._forcedPath = forcedPath || null;

    this.innerHTML = `
      <nav class="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              - <a href="/" class="text-2xl font-bold gradient-text">
<a href="/" data-no-active class="text-2xl font-bold gradient-text bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
    Elite Dance &amp; Music
  </a>
            </div>

            <div class="hidden md:block">
              <div class="ml-6 flex items-baseline space-x-4" id="edm-nav-desktop">
                <!-- links injected here -->
                <span id="edm-login-island" class="ml-2"></span>
              </div>
            </div>

            <button aria-label="Open menu" class="md:hidden p-2" id="edm-mobile-toggle">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="md:hidden hidden bg-white border-t" id="edm-mobile">
          <div class="px-2 pt-2 pb-3 space-y-1" id="edm-nav-mobile">
            <!-- links injected here -->
            <div id="edm-login-island-mobile" class="px-3 py-2"></div>
          </div>
        </div>
      </nav>
    `;
  }

  async loadNav() {
    try {
      const res = await fetch('/partials/nav.json', { cache: 'no-store' });
      const links = await res.json();

      const desktop = this.querySelector('#edm-nav-desktop');
      const mobile  = this.querySelector('#edm-nav-mobile');

      const herePath = (this._forcedPath || (typeof location !== 'undefined' ? location.pathname : '/')) || '/';
      const onHome = (herePath.replace(/\/+$/,'') || '/') === '/';

      const mkDesktop = (l) => this._linkHTML(l, onHome, /*desktop*/true);
      const mkMobile  = (l) => this._linkHTML(l, onHome, /*desktop*/false);

      if (desktop) desktop.insertAdjacentHTML('afterbegin', links.map(mkDesktop).join(''));
      if (mobile)  mobile.insertAdjacentHTML('afterbegin',  links.map(mkMobile).join(''));

      // --- Fallback "Login" button (replaced by React island on Next pages) ---
      const fallbackLogin = `
        <button type="button"
          class="inline-flex items-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold"
          id="edm-fallback-login">
          Login
        </button>`;

      const dIsland = this.querySelector('#edm-login-island');
      const mIsland = this.querySelector('#edm-login-island-mobile');
      if (dIsland) dIsland.innerHTML = fallbackLogin;
      if (mIsland) mIsland.innerHTML = fallbackLogin;

      // Clicking the fallback fires a window event that static pages can handle.
      this.querySelectorAll('#edm-fallback-login').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('edm:open-login'));
        });
      });

      this.bindScrollButtons();
      this.markActive();
    } catch (e) {
      console.error('Header nav failed', e);
    }
  }

  // Create appropriate link/button markup for desktop/mobile
  _linkHTML(l, onHome, isDesktop) {
    const baseClasses = isDesktop
      ? 'block px-3 py-2 text-gray-700 hover:text-dance-purple'
      : 'block px-3 py-2 text-gray-700 hover:text-dance-purple';

    // Scroll links behave differently off the homepage
    if (l.scroll) {
      if (onHome) {
        const extra = (l.label === 'Home' && isDesktop)
          ? ' text-dance-purple font-semibold'
          : (l.label === 'Home' && !isDesktop)
            ? ' text-dance-purple font-semibold underline underline-offset-4'
            : '';
        return `<button data-scroll="${l.href.replace('#','')}" class="${baseClasses}${extra}">${l.label}</button>`;
      }
      // Not on home: navigate to the home anchor
      const id = l.href.startsWith('#') ? l.href : `#${l.href}`;
      return `<a href="/${id}" class="${baseClasses}">${l.label}</a>`;
    }

    // Normal link
    return `<a href="${l.href}" class="${baseClasses}">${l.label}</a>`;
  }

  bindEvents() {
    const toggle = this.querySelector('#edm-mobile-toggle');
    const panel  = this.querySelector('#edm-mobile');
    if (toggle && panel) {
      toggle.addEventListener('click', () => panel.classList.toggle('hidden'));
    }
  }

  bindScrollButtons() {
    const clickScroll = (id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      const panel = this.querySelector('#edm-mobile');
      if (panel && !panel.classList.contains('hidden')) panel.classList.add('hidden');
    };
    this.querySelectorAll('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => clickScroll(btn.getAttribute('data-scroll')));
    });
  }

  markActive() {
    let path = this._forcedPath || (typeof location !== 'undefined' ? location.pathname : '/');
    path = (path || '/').replace(/\/+$/,'') || '/';
    this.querySelectorAll('a[href]:not([data-no-active])').forEach(a => {
    const href = (a.getAttribute('href') || '').replace(/\/+$/,'') || '/';
    if (!href.startsWith('#') && href === path) {
      a.setAttribute('aria-current','page');
      a.classList.add('text-dance-purple','font-semibold');
    }
  });
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}