// @ts-check

/**
 * <mur-tab-panel>: one panel inside <mur-tabs>.
 *
 * <mur-tabs> builds the tab button and handles showing and hiding. While
 * inactive, the panel stays in the DOM, so live content keeps updating.
 *
 * Attributes / properties:
 * - `label` / `label`: text of the tab button.
 *
 * Slots:
 * - (default): panel content.
 *
 * Parts, events: none.
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      height: 100%;
    }

    :host([hidden]) {
      display: none;
    }
  </style>
  <slot></slot>
`;

export class MurTabPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute('label') ?? '';
  }

  set label(value) {
    this.setAttribute('label', value);
  }
}

if (!customElements.get('mur-tab-panel')) {
  customElements.define('mur-tab-panel', MurTabPanel);
}
