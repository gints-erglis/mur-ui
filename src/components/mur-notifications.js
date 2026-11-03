// @ts-check

/**
 * <mur-notifications>: stack of short messages in the corner of the window.
 *
 * Put one in the page and call `notify()`. Messages are announced politely to
 * screen readers. A message stays while the pointer or focus is on it, and has
 * a close button. Only the newest few are kept.
 *
 * Methods:
 * - `notify({ title, message, href, timeout })`: shows a message. `title` is
 *   required. `message` is optional text. `href` makes the title a link.
 *   `timeout` is milliseconds before it closes, default 10000.
 *
 * Parts:
 * - `item`, `title`, `message`, `close`.
 *
 * Attributes, properties, slots, events: none.
 */

const DEFAULT_TIMEOUT = 10000;
const MAX_ITEMS = 5;

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      inset-block-end: calc(var(--mur-statusbar-height) + var(--mur-space-m));
      inset-inline-end: var(--mur-space-l);
      z-index: 100;
      width: min(22rem, calc(100vw - 2 * var(--mur-space-l)));
    }

    :host([hidden]) {
      display: none;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--mur-space-s);
    }

    .item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0 var(--mur-space-s);
      align-items: start;
      padding: var(--mur-space-m);
      background: var(--mur-color-surface);
      border: 1px solid var(--mur-color-border-strong);
      border-inline-start: 3px solid var(--mur-color-accent);
      border-radius: var(--mur-radius);
      box-shadow: 0 0.5rem 1.5rem color-mix(in srgb, var(--mur-color-text) 18%, transparent);
      color: var(--mur-color-text);
      font-family: var(--mur-font);
      font-size: var(--mur-font-size-m);
    }

    @media (prefers-reduced-motion: no-preference) {
      .item {
        animation: arrive 180ms ease-out;
      }

      @keyframes arrive {
        from {
          opacity: 0;
          transform: translateY(0.5rem);
        }
      }
    }

    .title {
      font-weight: 600;
    }

    a {
      color: inherit;
      text-underline-offset: 0.2em;
    }

    .message {
      grid-column: 1;
      color: var(--mur-color-text-muted);
      font-size: var(--mur-font-size-s);
    }

    button {
      grid-column: 2;
      grid-row: 1 / span 2;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      background: transparent;
      border: 0;
      border-radius: var(--mur-radius);
      color: var(--mur-color-text-muted);
      cursor: pointer;
      font: inherit;
    }

    button:hover {
      background: var(--mur-color-hover);
      color: var(--mur-color-text);
    }

    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: 1px;
    }
  </style>
  <div class="list" role="status" aria-live="polite"></div>
`;

export class MurNotifications extends HTMLElement {
  /** Timers of the open messages. @type {Map<HTMLElement, ReturnType<typeof setTimeout>>} */
  #timers = new Map();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }

  disconnectedCallback() {
    for (const item of [...this.#timers.keys()]) {
      this.#close(item);
    }
  }

  /** @param {{ title: string, message?: string, href?: string, timeout?: number }} options */
  notify({ title, message, href, timeout = DEFAULT_TIMEOUT }) {
    const item = document.createElement('div');
    item.className = 'item';
    item.part.add('item');

    const heading = document.createElement('div');
    heading.className = 'title';
    heading.part.add('title');
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = title;
      heading.append(link);
    } else {
      heading.textContent = title;
    }
    item.append(heading);

    const close = document.createElement('button');
    close.type = 'button';
    close.part.add('close');
    close.textContent = '×';
    close.setAttribute('aria-label', `Close: ${title}`);
    close.addEventListener('click', () => this.#close(item));
    item.append(close);

    if (message) {
      const text = document.createElement('div');
      text.className = 'message';
      text.part.add('message');
      text.textContent = message;
      item.append(text);
    }

    // Stay open while someone is reading or using the message.
    const hold = () => clearTimeout(this.#timers.get(item));
    const release = () => {
      if (!item.matches(':hover') && !item.contains(this.shadowRoot.activeElement)) {
        this.#schedule(item, timeout);
      }
    };
    item.addEventListener('pointerenter', hold);
    item.addEventListener('focusin', hold);
    item.addEventListener('pointerleave', release);
    item.addEventListener('focusout', () => queueMicrotask(release));

    const list = this.shadowRoot.querySelector('.list');
    list.append(item);
    this.#schedule(item, timeout);

    const oldest = [...this.#timers.keys()];
    if (oldest.length > MAX_ITEMS) {
      this.#close(oldest[0]);
    }
  }

  /**
   * @param {HTMLElement} item
   * @param {number} timeout
   */
  #schedule(item, timeout) {
    clearTimeout(this.#timers.get(item));
    this.#timers.set(item, setTimeout(() => this.#close(item), timeout));
  }

  /** @param {HTMLElement} item */
  #close(item) {
    clearTimeout(this.#timers.get(item));
    this.#timers.delete(item);
    item.remove();
  }
}

if (!customElements.get('mur-notifications')) {
  customElements.define('mur-notifications', MurNotifications);
}
