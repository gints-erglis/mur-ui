// @ts-check

/**
 * <mur-meter>: one value against a limit, such as disk usage.
 *
 * The bar changes color at the warning and critical levels, and a word says the
 * same, so the state is never shown by color alone.
 *
 * Attributes / properties:
 * - `label` / `label`: what is measured.
 * - `value` / `value`: current value, default 0.
 * - `max` / `max`: the limit, default 100.
 * - `value-text` / `valueText`: readable value, e.g. "4.2 of 16 GB". Default is
 *   the percentage.
 * - `warning-at` / `warningAt`: percentage for the warning state, default 80.
 * - `critical-at` / `criticalAt`: percentage for the critical state, default 90.
 *
 * Parts:
 * - `label`, `value`, `state`, `track`, `fill`.
 *
 * Slots, events: none.
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      --fill: var(--mur-color-accent);
      display: block;
      min-width: 0;
    }

    :host([hidden]) {
      display: none;
    }

    .top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0 var(--mur-space-m);
      margin-block-end: var(--mur-space-xs);
      font-size: var(--mur-font-size-s);
    }

    .value {
      color: var(--mur-color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .state {
      font-weight: 600;
    }

    .track {
      height: 0.5rem;
      overflow: hidden;
      border-radius: var(--mur-radius);
      background: color-mix(in srgb, var(--fill) 18%, transparent);
    }

    .fill {
      height: 100%;
      background: var(--fill);
      border-radius: var(--mur-radius);
    }
  </style>
  <div class="top">
    <span class="label" part="label"></span>
    <span>
      <span class="state" part="state"></span>
      <span class="value" part="value"></span>
    </span>
  </div>
  <div class="track" part="track"><div class="fill" part="fill"></div></div>
`;

export class MurMeter extends HTMLElement {
  static observedAttributes = ['label', 'value', 'max', 'value-text', 'warning-at', 'critical-at'];

  #internals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.#internals = this.attachInternals();
    this.#internals.role = 'meter';
    this.#internals.ariaValueMin = '0';
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute('label') ?? '';
  }

  set label(value) {
    this.setAttribute('label', value);
  }

  /** @returns {number} */
  get value() {
    return this.#number('value', 0);
  }

  set value(value) {
    this.setAttribute('value', String(value));
  }

  /** @returns {number} */
  get max() {
    return this.#number('max', 100);
  }

  set max(value) {
    this.setAttribute('max', String(value));
  }

  /** @returns {string | null} */
  get valueText() {
    return this.getAttribute('value-text');
  }

  set valueText(value) {
    if (value === null) {
      this.removeAttribute('value-text');
    } else {
      this.setAttribute('value-text', value);
    }
  }

  /** @returns {number} */
  get warningAt() {
    return this.#number('warning-at', 80);
  }

  set warningAt(value) {
    this.setAttribute('warning-at', String(value));
  }

  /** @returns {number} */
  get criticalAt() {
    return this.#number('critical-at', 90);
  }

  set criticalAt(value) {
    this.setAttribute('critical-at', String(value));
  }

  /**
   * @param {string} name
   * @param {number} fallback
   * @returns {number}
   */
  #number(name, fallback) {
    const text = this.getAttribute(name);
    const value = Number(text);
    return text !== null && Number.isFinite(value) ? value : fallback;
  }

  #render() {
    const root = this.shadowRoot;
    const max = this.max;
    const value = Math.min(Math.max(this.value, 0), Math.max(max, 0));
    const percent = max > 0 ? Math.round((value / max) * 100) : 0;

    let state = '';
    let fill = '';
    if (percent >= this.criticalAt) {
      state = 'Critical';
      fill = 'var(--mur-color-danger)';
    } else if (percent >= this.warningAt) {
      state = 'High';
      fill = 'var(--mur-color-warning)';
    }

    const text = this.valueText ?? `${percent}%`;
    root.querySelector('.label').textContent = this.label;
    root.querySelector('.state').textContent = state;
    root.querySelector('.value').textContent = text;
    const track = /** @type {HTMLElement} */ (root.querySelector('.track'));
    const bar = /** @type {HTMLElement} */ (root.querySelector('.fill'));
    bar.style.width = `${percent}%`;
    // The variable lives on the shadow elements, so the host's style stays the user's.
    track.style.setProperty('--fill', fill || 'var(--mur-color-accent)');
    bar.style.setProperty('--fill', fill || 'var(--mur-color-accent)');

    this.#internals.ariaLabel = this.label;
    this.#internals.ariaValueNow = String(value);
    this.#internals.ariaValueMax = String(max);
    this.#internals.ariaValueText = state ? `${text}, ${state}` : text;
  }
}

if (!customElements.get('mur-meter')) {
  customElements.define('mur-meter', MurMeter);
}
