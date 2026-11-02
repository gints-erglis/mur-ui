// @ts-check

import './mur-tab-panel.js';

/**
 * <mur-tabs>: tab buttons built from <mur-tab-panel> children
 * (WAI-ARIA tabs pattern, with automatic activation).
 *
 * It fills its parent's height, so the parent needs a definite height.
 * The active panel scrolls on its own.
 *
 * Attributes / properties:
 * - `selected` / `selected`: index of the active panel, default 0.
 * - `label` / `label`: accessible name of the tab list.
 *
 * Children:
 * - `<mur-tab-panel label="...">`: one per tab. Other children are not shown.
 *
 * Parts:
 * - `tablist`: the row of tabs.
 * - `tab`: each tab button; the active one also has `selected`.
 * - `panel`: the wrapper around each panel.
 *
 * Events:
 * - `mur-tab-change`: the user chose another tab. `detail: { index }`.
 *
 * Keyboard (tab focused): Left/Right move between tabs (wrapping around),
 * Home/End jump to the first/last one.
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      min-width: 0;
      min-height: 0;
    }

    :host([hidden]) {
      display: none;
    }

    .tablist {
      display: flex;
      gap: var(--mur-space-xs);
      padding-inline: var(--mur-space-s);
      overflow-x: auto;
      scrollbar-width: thin;
      background: var(--mur-color-surface);
      border-block-end: 1px solid var(--mur-color-border);
    }

    button {
      flex: none;
      padding: var(--mur-space-s) var(--mur-space-m);
      background: transparent;
      border: 0;
      border-radius: var(--mur-radius) var(--mur-radius) 0 0;
      color: var(--mur-color-text-muted);
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
    }

    button:hover {
      background: var(--mur-color-hover);
      color: var(--mur-color-text);
    }

    button[aria-selected='true'] {
      box-shadow: inset 0 -2px var(--mur-color-accent);
      color: var(--mur-color-text);
      font-weight: 600;
    }

    button:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: -2px;
    }

    .panels {
      min-height: 0;
    }

    [role='tabpanel'] {
      height: 100%;
      overflow: auto;
    }

    [role='tabpanel']:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: -2px;
    }
  </style>
  <div class="tablist" part="tablist" role="tablist"></div>
  <div class="panels"></div>
`;

export class MurTabs extends HTMLElement {
  static observedAttributes = ['selected', 'label'];

  /** @type {HTMLElement} */
  #tablist;

  /** @type {HTMLElement} */
  #panels;

  /** Rebuilds the tabs when panels are added or removed, or a label changes. */
  #observer = new MutationObserver(() => this.#syncWithPanels());

  constructor() {
    super();
    // Manual slots keep tabs and panel wrappers in this one shadow root, so
    // their ARIA ID references work, and panels need no `slot` attribute.
    const root = this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
    root.append(template.content.cloneNode(true));
    this.#tablist = root.querySelector('.tablist');
    this.#panels = root.querySelector('.panels');
    this.#tablist.addEventListener('click', this.#onClick);
    this.#tablist.addEventListener('keydown', this.#onKeydown);
  }

  connectedCallback() {
    this.#syncWithPanels();
  }

  disconnectedCallback() {
    this.#observer.disconnect();
  }

  attributeChangedCallback() {
    this.#render();
  }

  /** @returns {number} */
  get selected() {
    const value = Number(this.getAttribute('selected'));
    if (!Number.isInteger(value) || value < 0) {
      return 0;
    }
    return Math.min(value, Math.max(this.#panelElements().length - 1, 0));
  }

  set selected(value) {
    this.setAttribute('selected', String(value));
  }

  /** @returns {string | null} */
  get label() {
    return this.getAttribute('label');
  }

  set label(value) {
    if (value === null) {
      this.removeAttribute('label');
    } else {
      this.setAttribute('label', value);
    }
  }

  /** @returns {Element[]} */
  #panelElements() {
    return [...this.children].filter((child) => child.matches('mur-tab-panel'));
  }

  /** Watches the current panels, then redraws. */
  #syncWithPanels() {
    this.#observer.disconnect();
    if (this.isConnected) {
      this.#observer.observe(this, { childList: true });
      for (const panel of this.#panelElements()) {
        this.#observer.observe(panel, { attributes: true, attributeFilter: ['label'] });
      }
    }
    this.#render();
  }

  /**
   * Adds or removes one tab and wrapper pair at a time, reusing the existing
   * ones, so focus and scroll positions survive unrelated changes.
   */
  #render() {
    const panels = this.#panelElements();

    while (this.#tablist.children.length < panels.length) {
      this.#addPair(this.#tablist.children.length);
    }
    while (this.#tablist.children.length > panels.length) {
      this.#tablist.lastElementChild.remove();
      this.#panels.lastElementChild.remove();
    }

    const selected = this.selected;
    panels.forEach((panel, index) => {
      const tab = /** @type {HTMLElement} */ (this.#tablist.children[index]);
      const wrapper = /** @type {HTMLElement} */ (this.#panels.children[index]);
      const isSelected = index === selected;

      tab.textContent = panel.getAttribute('label') || `Tab ${index + 1}`;
      tab.tabIndex = isSelected ? 0 : -1;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('part', isSelected ? 'tab selected' : 'tab');
      wrapper.hidden = !isSelected;
      wrapper.querySelector('slot').assign(panel);
    });

    if (this.label) {
      this.#tablist.setAttribute('aria-label', this.label);
    } else {
      this.#tablist.removeAttribute('aria-label');
    }
  }

  /** @param {number} index */
  #addPair(index) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `panel-${index}`);
    this.#tablist.append(tab);

    const wrapper = document.createElement('div');
    wrapper.id = `panel-${index}`;
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'tabpanel');
    wrapper.setAttribute('part', 'panel');
    wrapper.setAttribute('aria-labelledby', `tab-${index}`);
    wrapper.append(document.createElement('slot'));
    this.#panels.append(wrapper);
  }

  /** Applies a tab chosen by the user. @param {number} index */
  #choose(index) {
    if (index === this.selected) {
      return;
    }
    this.selected = index;
    this.dispatchEvent(new CustomEvent('mur-tab-change', {
      bubbles: true,
      composed: true,
      detail: { index },
    }));
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const tab = /** @type {HTMLElement} */ (event.target).closest('[role="tab"]');
    if (tab) {
      this.#choose([...this.#tablist.children].indexOf(tab));
    }
  };

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const count = this.#tablist.children.length;
    let next;
    switch (event.key) {
      case 'ArrowRight':
        next = (this.selected + 1) % count;
        break;
      case 'ArrowLeft':
        next = (this.selected - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.#choose(next);
    /** @type {HTMLElement} */ (this.#tablist.children[next]).focus();
  };
}

if (!customElements.get('mur-tabs')) {
  customElements.define('mur-tabs', MurTabs);
}
