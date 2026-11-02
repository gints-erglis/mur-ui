// @ts-check

/**
 * <mur-statusbar>: thin bar for small status text.
 *
 * It has no live-region role, because frequently updating data would flood
 * screen readers. Add `role="status"` to a slotted element if its changes
 * should be announced.
 *
 * Properties:
 * - `source`: a data source. When set, the bar shows its connection status and
 *   last update time on the right. `null` (default) hides them.
 *
 * Slots:
 * - `start`: left side.
 * - (default): middle, takes the free space.
 * - `end`: right side.
 *
 * Parts:
 * - `start`, `center`, `end`: the wrappers around the slots.
 * - `source`: the connection status.
 *
 * Attributes, events: none.
 */

/** @typedef {import('../data/store.js').DataSource} DataSource */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      align-items: center;
      gap: var(--mur-space-l);
      box-sizing: border-box;
      min-height: var(--mur-statusbar-height);
      padding: var(--mur-space-xs) var(--mur-space-l);
      background: var(--mur-color-surface);
      border-block-start: 1px solid var(--mur-color-border);
      color: var(--mur-color-text-muted);
      font-size: var(--mur-font-size-s);
      font-variant-numeric: tabular-nums;
    }

    :host([hidden]) {
      display: none;
    }

    div {
      display: flex;
      align-items: center;
      gap: var(--mur-space-m);
    }

    [part='center'] {
      flex: 1;
      min-width: 0;
    }

    [part='source'] {
      gap: var(--mur-space-s);
    }

    [part='source'][hidden] {
      display: none;
    }

    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--mur-color-border-strong);
    }

    .dot.online {
      background: var(--mur-color-success);
    }
  </style>
  <div part="start"><slot name="start"></slot></div>
  <div part="center"><slot></slot></div>
  <div part="end"><slot name="end"></slot></div>
  <div part="source" hidden><span class="dot"></span><span class="text"></span></div>
`;

export class MurStatusbar extends HTMLElement {
  /** @type {DataSource | null} */
  #source = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.#source?.addEventListener('status', this.#render);
    this.#render();
  }

  disconnectedCallback() {
    this.#source?.removeEventListener('status', this.#render);
  }

  /** @returns {DataSource | null} */
  get source() {
    return this.#source;
  }

  set source(value) {
    this.#source?.removeEventListener('status', this.#render);
    this.#source = value;
    if (this.isConnected) {
      this.#source?.addEventListener('status', this.#render);
    }
    this.#render();
  }

  #render = () => {
    const root = this.shadowRoot;
    /** @type {HTMLElement} */ (root.querySelector('[part="source"]')).hidden = !this.#source;
    if (!this.#source) {
      return;
    }

    const { status, lastUpdate } = this.#source;
    const online = status === 'online';
    root.querySelector('.dot').classList.toggle('online', online);
    const time = lastUpdate ? `updated ${lastUpdate.toLocaleTimeString()}` : 'no updates yet';
    root.querySelector('.text').textContent = `${online ? 'Online' : 'Offline'} · ${time}`;
  };
}

if (!customElements.get('mur-statusbar')) {
  customElements.define('mur-statusbar', MurStatusbar);
}
