// @ts-check

/**
 * <mur-toolbar>: horizontal bar of controls (WAI-ARIA toolbar pattern).
 *
 * The toolbar is one Tab stop. Inside it, Left/Right move between controls
 * (wrapping around) and Home/End jump to the first/last one.
 *
 * Text fields, selects, and radios need the arrow keys themselves, so arrows
 * skip them and they stay in the normal Tab order.
 *
 * Give the toolbar an accessible name with the `aria-label` attribute.
 *
 * Slots:
 * - `start`: left side.
 * - (default): middle, takes the free space.
 * - `end`: right side.
 *
 * Controls may be slotted directly or nested inside a slotted wrapper.
 *
 * Parts:
 * - `start`, `center`, `end`: the wrappers around the slots.
 *
 * Attributes, properties, events: none.
 */

/** Controls reached with arrow keys. */
const ITEM_SELECTOR = [
  'button',
  'a[href]',
  'input[type="checkbox"]',
  '[tabindex]:not(input, textarea, select, [contenteditable])',
].join(', ');

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--mur-space-m);
      box-sizing: border-box;
      min-height: var(--mur-toolbar-height);
      padding: var(--mur-space-s) var(--mur-space-l);
      background: var(--mur-color-surface);
      border-block-end: 1px solid var(--mur-color-border);
    }

    :host([hidden]) {
      display: none;
    }

    div {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--mur-space-s);
    }

    /* Auto basis: when space runs out, the whole group wraps to its own row. */
    [part='center'] {
      flex: 1 1 auto;
    }
  </style>
  <div part="start"><slot name="start"></slot></div>
  <div part="center"><slot></slot></div>
  <div part="end"><slot name="end"></slot></div>
`;

export class MurToolbar extends HTMLElement {
  /** The control that holds the toolbar's single Tab stop. @type {HTMLElement | null} */
  #current = null;

  /** Keeps the Tab stop valid when controls are added, removed, or disabled. */
  #observer = new MutationObserver(() => this.#updateTabStops());

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.attachInternals().role = 'toolbar';
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('focusin', this.#onFocusin);
  }

  connectedCallback() {
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'slot'],
    });
    this.#updateTabStops();
  }

  disconnectedCallback() {
    this.#observer.disconnect();
  }

  /**
   * Usable controls in visual order: start, center, end.
   * @returns {HTMLElement[]}
   */
  #items() {
    /** @type {HTMLElement[]} */
    const items = [];
    for (const slot of this.shadowRoot.querySelectorAll('slot')) {
      for (const element of slot.assignedElements()) {
        if (element.matches(ITEM_SELECTOR)) {
          items.push(/** @type {HTMLElement} */ (element));
        } else {
          items.push(...element.querySelectorAll(ITEM_SELECTOR));
        }
      }
    }
    return items.filter((item) => !item.matches(':disabled') && !item.closest('[hidden]'));
  }

  /** Gives tabindex="0" to the current control and "-1" to all the others. */
  #updateTabStops() {
    const items = this.#items();
    if (!this.#current || !items.includes(this.#current)) {
      this.#current = items[0] ?? null;
    }
    for (const item of items) {
      item.tabIndex = item === this.#current ? 0 : -1;
    }
  }

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const items = this.#items();
    const index = items.indexOf(/** @type {HTMLElement} */ (event.target));
    if (index === -1) {
      return; // A text field or other control that keeps its own keys.
    }

    let next;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[next].focus();
  };

  /** Clicking or arrowing to a control moves the Tab stop there. @param {FocusEvent} event */
  #onFocusin = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (this.#items().includes(target)) {
      this.#current = target;
      this.#updateTabStops();
    }
  };
}

if (!customElements.get('mur-toolbar')) {
  customElements.define('mur-toolbar', MurToolbar);
}
