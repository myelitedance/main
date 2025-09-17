// Elite Dance & Music header web component (light DOM so Tailwind & React islands work)
// Reads /partials/nav.json for links

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.renderSkeleton();
    this.loadNav();
    this.bindEvents();
    this.markActive();
  }

  renderSkeleton() {
    const forcedPath = this.getAttribute('data-page');
    this.innerHTML = `
      <nav class="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <a href="/" class="text-2xl font-bold bg-gradient-to-r from-dance-purple via-dance-pink to-dance-blue bg-clip-text text-transparent">
                Elite Dance &amp; Music
              </a>
            </div>

            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-8" id="edm-nav-desktop">
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
            <div id="edm-login-island-mobile" class="px-3 py-2"></div>
          </div>
        </div>
      </nav>
    `;
    if (forcedPath) this._forcedPath = forcedPath;
  }

  async loadNav() {
    try {
      const res = await fetch('/partials/nav.json', { cache: 'no-store' });
      const links = await res.json();

      const desktop = this.querySelector('#edm-nav-desktop');
      const mobile  = this.querySelector('#edm-nav-mobile');

      const mkDesktop = (l) => {
        if (l.scroll) {
          return `<button data-scroll="${l.href.replace('#','')}" class="text-gray-700 hover:text-dance-purple transition-colors ${l.label==='Home' ? 'text-dance-purple font-semibold' : ''}">
            ${l.label}
          </button>`;
        }
        return `<a href="${l.href}" class="block px-3 py-2 text-gray-700 hover:text-dance-purple">${l.label}</a>`;
      };

      const mkMobile = (l) => {
        if (l.scroll) {
          return `<button data-scroll="${l.href.replace('#','')}" class="block px-3 py-2 text-gray-700 hover:text-dance-purple ${l.label==='Home' ? 'text-dance-purple font-semibold underline underline-offset-4' : ''}">
            ${l.label}
          </button>`;
        }
        return `<a href="${l.href}" class="block px-3 py-2 text-gray-700 hover:text-dance-purple">${l.label}</a>`;
      };

      if (desktop) desktop.insertAdjacentHTML('afterbegin', links.map(mkDesktop).join(''));
      if (mobile)  mobile.insertAdjacentHTML('afterbegin',  links.map(mkMobile).join(''));

      // Fallback CTA for purely static pages (Next will replace via islands)
      const fallbackCTA = `<a href="/book-trial" class="inline-flex items-center rounded-full bg-gradient-to-r from-dance-purple to-dance-pink text-white px-4 py-2 font-semibold">
        Try a Class
      </a>`;
      const dIsland = this.querySelector('#edm-login-island');
      const mIsland = this.querySelector('#edm-login-island-mobile');
      if (dIsland) dIsland.innerHTML = fallbackCTA;
      if (mIsland) mIsland.innerHTML = fallbackCTA;

      this.bindScrollButtons();
      this.markActive();
    } catch (e) {
      console.error('Header nav failed', e);
    }
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
    this.querySelectorAll('a[href]').forEach(a => {
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