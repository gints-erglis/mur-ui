// @ts-check

/**
 * <mur-panel>: titled card, the building block of a dashboard.
 *
 * Attributes / properties:
 * - `label` / `label`: the title, also the panel's accessible name.
 * - `scrollable` / `scrollable`: boolean. The body scrolls on its own, and can
 *   be scrolled with the keyboard. The panel then needs a limited height.
 *
 * Slots:
 * - (default): panel content.
 * - `actions`: controls on the right side of the header.
 *
 * Parts:
 * - `header`, `title`, `body`.
 *
 * Events: none.
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--mur-color-surface);
      border: 1px solid var(--mur-color-border);
      border-radius: var(--mur-radius-l);
    }

    :host([hidden]) {
      display: none;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--mur-space-m);
      padding: var(--mur-space-m) var(--mur-space-l);
      border-block-end: 1px solid var(--mur-color-border);
    }

    h2 {
      margin: 0;
      font-size: var(--mur-font-size-m);
      font-weight: 600;
    }

    .body {
      flex: 1;
      min-height: 0;
    }

    :host([scrollable]) .body {
      overflow: auto;
    }

    .body:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: -2px;
    }
  </style>
  <header part="header">
    <h2 part="title"></h2>
    <slot name="actions"></slot>
  </header>
  <div class="body" part="body"><slot></slot></div>
`;

export class MurPanel extends HTMLElement {
  static observedAttributes = ['label', 'scrollable'];

  #internals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#internals = this.attachInternals();
    this.#internals.role = 'region';
  }

  attributeChangedCallback() {
    this.shadowRoot.querySelector('h2').textContent = this.label;
    this.#internals.ariaLabel = this.label;
    const body = /** @type {HTMLElement} */ (this.shadowRoot.querySelector('.body'));
    if (this.scrollable) {
      body.tabIndex = 0;
    } else {
      body.removeAttribute('tabindex');
    }
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute('label') ?? '';
  }

  set label(value) {
    this.setAttribute('label', value);
  }

  /** @returns {boolean} */
  get scrollable() {
    return this.hasAttribute('scrollable');
  }

  set scrollable(value) {
    this.toggleAttribute('scrollable', Boolean(value));
  }
}

if (!customElements.get('mur-panel')) {
  customElements.define('mur-panel', MurPanel);
}
