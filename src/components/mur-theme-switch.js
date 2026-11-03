// @ts-check

/**
 * <mur-theme-switch>: one button that cycles the color theme
 * Auto → Dark → Light → Auto. A thumb slides to the icon of the current theme.
 *
 * Sets `data-theme` on <html> ("light" or "dark"; removed for Auto, so the
 * tokens follow the system) and remembers the choice in localStorage under
 * `mur-theme`. Open tabs of the same site follow each other.
 *
 * The switch applies the remembered theme when it loads. Modules load after the
 * page is drawn, so to avoid a flash of the other theme, also run this classic
 * script in <head>:
 *
 *   try { const t = localStorage.getItem('mur-theme');
 *     if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
 *   } catch {}
 *
 * The element itself is the button (role="button", one Tab stop), so it works
 * as a single control inside <mur-toolbar>. Enter or Space switches.
 *
 * Properties:
 * - `theme`: 'auto' | 'light' | 'dark'. Setting it applies and remembers it.
 *
 * Events:
 * - `mur-theme-change`: after the theme changes, `detail: { theme }`.
 *
 * Parts:
 * - `track`, `thumb`, `icon`.
 *
 * Attributes, slots: none.
 *
 * Icons: Bootstrap Icons (magic, moon, sun), MIT license.
 */

const STORAGE_KEY = 'mur-theme';

/** @typedef {'auto' | 'light' | 'dark'} Theme */

/** Click order, also the order of the icons from left to right. @type {Theme[]} */
const ORDER = ['auto', 'dark', 'light'];

const LABELS = { auto: 'Auto', dark: 'Dark', light: 'Light' };

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      --pad: 0.25rem;
      --thumb: 1.5rem;
      --width: 5.5rem;
      display: inline-block;
      border-radius: calc(var(--thumb) / 2 + var(--pad));
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    :host([hidden]) {
      display: none;
    }

    :host(:focus-visible) {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: 2px;
    }

    .track {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      width: var(--width);
      height: calc(var(--thumb) + var(--pad) * 2);
      padding: 0 var(--pad);
      background: var(--mur-color-hover);
      border-radius: inherit;
    }

    .icon {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: var(--thumb);
      height: var(--thumb);
      color: var(--mur-color-text-muted);
      transition: color 0.3s ease;
    }

    svg {
      width: 1rem;
      height: 1rem;
      fill: currentColor;
    }

    /* Light thumb in both themes, as on a physical switch. */
    .thumb {
      position: absolute;
      top: var(--pad);
      left: var(--pad);
      width: var(--thumb);
      height: var(--thumb);
      border-radius: 50%;
      background: light-dark(var(--mur-color-surface), var(--mur-color-text));
      box-shadow: 0 1px 3px light-dark(color-mix(in srgb, var(--mur-color-text) 25%, transparent), transparent);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    :host([data-state='dark']) .thumb {
      transform: translateX(calc(var(--width) / 2 - var(--thumb) / 2 - var(--pad)));
    }

    :host([data-state='light']) .thumb {
      transform: translateX(calc(var(--width) - var(--thumb) - var(--pad) * 2));
    }

    :host([data-state='auto']) [data-icon='auto'],
    :host([data-state='dark']) [data-icon='dark'],
    :host([data-state='light']) [data-icon='light'] {
      color: light-dark(var(--mur-color-text), var(--mur-color-bg));
    }

    :host(:hover) .track {
      background: color-mix(in srgb, var(--mur-color-hover), var(--mur-color-text) 6%);
    }

    @media (prefers-reduced-motion: reduce) {
      .thumb,
      .icon {
        transition: none;
      }
    }
  </style>
  <span class="track" part="track">
    <span class="icon" part="icon" data-icon="auto">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.672a.5.5 0 1 0 1 0V.843a.5.5 0 0 0-1 0zm4.5.035A.5.5 0 0 0 13.293 2L12 3.293a.5.5 0 1 0 .707.707zM7.293 4A.5.5 0 1 0 8 3.293L6.707 2A.5.5 0 0 0 6 2.707zm-.621 2.5a.5.5 0 1 0 0-1H4.843a.5.5 0 1 0 0 1zm8.485 0a.5.5 0 1 0 0-1h-1.829a.5.5 0 0 0 0 1zM13.293 10A.5.5 0 1 0 14 9.293L12.707 8a.5.5 0 1 0-.707.707zM9.5 11.157a.5.5 0 0 0 1 0V9.328a.5.5 0 0 0-1 0zm1.854-5.097a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L8.646 5.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0l1.293-1.293Zm-3 3a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L.646 13.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0z"/></svg>
    </span>
    <span class="icon" part="icon" data-icon="dark">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286"/></svg>
    </span>
    <span class="icon" part="icon" data-icon="light">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/></svg>
    </span>
    <span class="thumb" part="thumb"></span>
  </span>
`;

/** @returns {Theme} the remembered theme */
function readTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto'; // Storage can be blocked.
  }
}

export class MurThemeSwitch extends HTMLElement {
  /** @type {Theme} */
  #theme = readTheme();

  #internals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#internals = this.attachInternals();
    this.#internals.role = 'button';
    this.addEventListener('click', this.#next);
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('keyup', this.#onKeyup);
  }

  connectedCallback() {
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }
    window.addEventListener('storage', this.#onStorage);
    this.#theme = readTheme();
    this.#render();
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this.#onStorage);
  }

  /** @returns {Theme} */
  get theme() {
    return this.#theme;
  }

  /** @param {Theme} value */
  set theme(value) {
    const theme = ORDER.includes(value) ? value : 'auto';
    if (theme === this.#theme) {
      return;
    }
    this.#theme = theme;
    try {
      if (theme === 'auto') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // Not remembered, but still applied.
    }
    this.#render();
    this.dispatchEvent(new CustomEvent('mur-theme-change', {
      bubbles: true,
      composed: true,
      detail: { theme },
    }));
  }

  #next = () => {
    this.theme = ORDER[(ORDER.indexOf(this.#theme) + 1) % ORDER.length];
  };

  /** Applies the theme to the page and shows it on the switch. */
  #render() {
    if (this.#theme === 'auto') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = this.#theme;
    }
    this.dataset.state = this.#theme;

    const next = ORDER[(ORDER.indexOf(this.#theme) + 1) % ORDER.length];
    this.#internals.ariaLabel = `Theme: ${LABELS[this.#theme]}`;
    this.title = `Theme: ${LABELS[this.#theme]}. Click for ${LABELS[next]}.`;
  }

  /** Enter acts at once, Space on release, as on a native button. @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault();
      this.#next();
    } else if (event.key === ' ') {
      event.preventDefault(); // No page scroll.
    }
  };

  /** @param {KeyboardEvent} event */
  #onKeyup = (event) => {
    if (event.key === ' ') {
      this.#next();
    }
  };

  /** Another tab changed the theme. @param {StorageEvent} event */
  #onStorage = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      this.#theme = readTheme();
      this.#render();
    }
  };
}

if (!customElements.get('mur-theme-switch')) {
  customElements.define('mur-theme-switch', MurThemeSwitch);
}
