// @ts-check

/**
 * <mur-stat>: one headline number, with an optional detail line and trend line.
 *
 * Put what the trend shows into `detail` as well, because the trend line itself
 * is hidden from screen readers.
 *
 * Attributes / properties:
 * - `label` / `label`: what the number is.
 * - `value` / `value`: the number, already formatted.
 * - `detail` / `detail`: small text below the number.
 *
 * Properties:
 * - `trend`: array of numbers, oldest first, default []. Drawn when it has at
 *   least two values, from zero up to the highest value.
 *
 * Parts:
 * - `label`, `value`, `detail`, `trend`.
 *
 * Slots, events: none.
 */

const TREND_WIDTH = 120;
const TREND_HEIGHT = 32;
const TREND_INSET = 4; // room for the line's thickness and the end dot

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: var(--mur-space-xs) var(--mur-space-m);
      min-width: 0;
    }

    :host([hidden]) {
      display: none;
    }

    .label {
      grid-column: 1 / -1;
      color: var(--mur-color-text-muted);
      font-size: var(--mur-font-size-s);
    }

    .value {
      font-size: var(--mur-font-size-l);
      font-weight: 600;
      letter-spacing: -0.01em;
      overflow-wrap: anywhere;
    }

    .detail {
      grid-column: 1 / -1;
      min-height: 1em;
      color: var(--mur-color-text-muted);
      font-size: var(--mur-font-size-s);
    }

    svg {
      display: block;
    }

    svg[hidden] {
      display: none;
    }

    polyline {
      fill: none;
      stroke: var(--mur-color-border-strong);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    circle {
      fill: var(--mur-color-accent);
    }
  </style>
  <div class="label" part="label"></div>
  <div class="value" part="value"></div>
  <svg part="trend" width="${TREND_WIDTH}" height="${TREND_HEIGHT}" aria-hidden="true" hidden>
    <polyline></polyline>
    <circle r="3"></circle>
  </svg>
  <div class="detail" part="detail"></div>
`;

export class MurStat extends HTMLElement {
  static observedAttributes = ['label', 'value', 'detail'];

  /** @type {number[]} */
  #trend = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }

  /** @param {string} name */
  attributeChangedCallback(name) {
    this.shadowRoot.querySelector(`.${name}`).textContent = this.getAttribute(name);
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute('label') ?? '';
  }

  set label(value) {
    this.setAttribute('label', value);
  }

  /** @returns {string} */
  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value);
  }

  /** @returns {string} */
  get detail() {
    return this.getAttribute('detail') ?? '';
  }

  set detail(value) {
    this.setAttribute('detail', value);
  }

  /** @returns {number[]} */
  get trend() {
    return this.#trend;
  }

  set trend(values) {
    this.#trend = values;
    this.#renderTrend();
  }

  #renderTrend() {
    const svg = /** @type {SVGElement} */ (/** @type {unknown} */ (this.shadowRoot.querySelector('svg')));
    const values = this.#trend;
    svg.toggleAttribute('hidden', values.length < 2);
    if (values.length < 2) {
      return;
    }

    const highest = Math.max(...values) || 1;
    const points = values.map((value, index) => {
      const x = TREND_INSET + (index / (values.length - 1)) * (TREND_WIDTH - 2 * TREND_INSET);
      const y = TREND_HEIGHT - TREND_INSET - (value / highest) * (TREND_HEIGHT - 2 * TREND_INSET);
      return [x, y];
    });
    svg.querySelector('polyline').setAttribute('points', points.join(' '));
    const [endX, endY] = points[points.length - 1];
    const dot = svg.querySelector('circle');
    dot.setAttribute('cx', String(endX));
    dot.setAttribute('cy', String(endY));
  }
}

if (!customElements.get('mur-stat')) {
  customElements.define('mur-stat', MurStat);
}
