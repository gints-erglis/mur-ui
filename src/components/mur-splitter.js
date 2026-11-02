// @ts-check

/**
 * <mur-splitter>: two resizable panes (WAI-ARIA window splitter pattern).
 *
 * It fills its parent's height, so the parent needs a definite height.
 * Each pane scrolls on its own.
 *
 * Attributes / properties:
 * - `orientation` / `orientation`: `horizontal` (default) puts the panes side
 *   by side; `vertical` stacks them.
 * - `position` / `position`: size of the first pane in percent, default 50.
 * - `min-start` / `minStart`: minimum size of the first pane in px, default 0.
 * - `min-end` / `minEnd`: minimum size of the second pane in px, default 0.
 * - `persist` / `persist`: localStorage key. When set, a position chosen by the
 *   user is saved, and restored when the element is added to the DOM.
 * - `label` / `label`: accessible name of the divider, default "Resize panes".
 *
 * Slots:
 * - `start`: first pane (left or top).
 * - `end`: second pane (right or bottom).
 *
 * Parts:
 * - `start`, `end`: the pane wrappers.
 * - `divider`: the draggable line between them.
 *
 * Events:
 * - `mur-resize`: the user moved the divider. `detail: { position }`.
 *
 * Keyboard (divider focused): arrow keys along the axis move the divider,
 * Home/End move it to its minimum/maximum.
 */

const DEFAULT_POSITION = 50;
const KEYBOARD_STEP = 2; // percent
const STORAGE_PREFIX = 'mur-splitter:';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }

    :host([hidden]) {
      display: none;
    }

    /* The browser enforces both minimums, also when the window resizes. */
    .split {
      --track: minmax(var(--min-start), calc(var(--position) * 1%)) auto minmax(var(--min-end), 1fr);
      display: grid;
      grid-template-columns: var(--track);
      grid-template-rows: minmax(0, 1fr);
      height: 100%;
      overflow: hidden;
    }

    :host([orientation='vertical']) .split {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: var(--track);
    }

    .pane {
      min-width: 0;
      min-height: 0;
      overflow: auto;
    }

    .pane:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: -2px;
    }

    .divider {
      position: relative;
      z-index: 1;
      width: 1px;
      background: var(--mur-color-border);
      cursor: col-resize;
      touch-action: none;
      user-select: none;
    }

    :host([orientation='vertical']) .divider {
      width: auto;
      height: 1px;
      cursor: row-resize;
    }

    /* A wider invisible area, so the thin line is easy to grab. */
    .divider::before {
      content: '';
      position: absolute;
      inset: 0 calc(var(--mur-space-xs) * -1);
    }

    :host([orientation='vertical']) .divider::before {
      inset: calc(var(--mur-space-xs) * -1) 0;
    }

    .divider:hover,
    .divider.dragging {
      background: var(--mur-color-accent);
      box-shadow: 0 0 0 1px var(--mur-color-accent);
    }

    .divider:focus-visible {
      background: var(--mur-color-focus);
      outline: 2px solid var(--mur-color-focus);
    }
  </style>
  <div class="split">
    <!-- tabindex lets keyboard users scroll the pane in every browser. -->
    <div class="pane" id="start" part="start" tabindex="0"><slot name="start"></slot></div>
    <div class="divider" part="divider" role="separator" tabindex="0" aria-controls="start"
      aria-valuemin="0" aria-valuemax="100"></div>
    <div class="pane" part="end" tabindex="0"><slot name="end"></slot></div>
  </div>
`;

export class MurSplitter extends HTMLElement {
  static observedAttributes = ['orientation', 'position', 'min-start', 'min-end', 'label'];

  /** @type {HTMLElement} */
  #split;

  /** @type {HTMLElement} */
  #divider;

  /** Pointer distance from the divider's edge while dragging, otherwise null. @type {number | null} */
  #dragOffset = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.append(template.content.cloneNode(true));
    this.#split = root.querySelector('.split');
    this.#divider = root.querySelector('.divider');
    this.#divider.addEventListener('keydown', this.#onKeydown);
    this.#divider.addEventListener('pointerdown', this.#onPointerdown);
    this.#divider.addEventListener('pointermove', this.#onPointermove);
    this.#divider.addEventListener('lostpointercapture', this.#onDragEnd);
    this.#render();
  }

  connectedCallback() {
    this.#restore();
  }

  disconnectedCallback() {
    this.#dragOffset = null;
    this.#divider.classList.remove('dragging');
  }

  attributeChangedCallback() {
    this.#render();
  }

  /** @returns {'horizontal' | 'vertical'} */
  get orientation() {
    return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
  }

  set orientation(value) {
    this.setAttribute('orientation', value);
  }

  /** @returns {number} */
  get position() {
    const value = Number(this.getAttribute('position') ?? DEFAULT_POSITION);
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : DEFAULT_POSITION;
  }

  set position(value) {
    this.setAttribute('position', String(value));
  }

  /** @returns {number} */
  get minStart() {
    return this.#pixels('min-start');
  }

  set minStart(value) {
    this.setAttribute('min-start', String(value));
  }

  /** @returns {number} */
  get minEnd() {
    return this.#pixels('min-end');
  }

  set minEnd(value) {
    this.setAttribute('min-end', String(value));
  }

  /** @returns {string | null} */
  get persist() {
    return this.getAttribute('persist');
  }

  set persist(value) {
    if (value === null) {
      this.removeAttribute('persist');
    } else {
      this.setAttribute('persist', value);
    }
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute('label') ?? 'Resize panes';
  }

  set label(value) {
    this.setAttribute('label', value);
  }

  /**
   * @param {string} name
   * @returns {number}
   */
  #pixels(name) {
    const value = Number(this.getAttribute(name));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  #render() {
    const horizontal = this.orientation === 'horizontal';
    this.#split.style.setProperty('--position', String(this.position));
    this.#split.style.setProperty('--min-start', `${this.minStart}px`);
    this.#split.style.setProperty('--min-end', `${this.minEnd}px`);
    // The line runs across the axis: side-by-side panes have a vertical divider.
    this.#divider.setAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
    this.#divider.setAttribute('aria-valuenow', String(Math.round(this.position)));
    this.#divider.setAttribute('aria-label', this.label);
  }

  /** Applies a position chosen by the user, keeping both panes at their minimum. @param {number} position */
  #moveTo(position) {
    const rect = this.#split.getBoundingClientRect();
    const size = this.orientation === 'horizontal' ? rect.width : rect.height;
    const dividerRect = this.#divider.getBoundingClientRect();
    const dividerSize = this.orientation === 'horizontal' ? dividerRect.width : dividerRect.height;
    if (size === 0) {
      return;
    }

    const min = (this.minStart / size) * 100;
    const max = ((size - dividerSize - this.minEnd) / size) * 100;
    const clamped = Math.max(min, Math.min(position, max));
    const rounded = Math.round(clamped * 10) / 10;
    if (rounded === this.position) {
      return;
    }

    this.position = rounded;
    this.dispatchEvent(new CustomEvent('mur-resize', {
      bubbles: true,
      composed: true,
      detail: { position: rounded },
    }));
  }

  #restore() {
    if (!this.persist) {
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + this.persist);
      if (stored !== null && Number.isFinite(Number(stored))) {
        this.position = Number(stored);
      }
    } catch {
      // Storage can be blocked. The splitter still works, it just forgets.
    }
  }

  #save() {
    if (!this.persist) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_PREFIX + this.persist, String(this.position));
    } catch {
      // See #restore.
    }
  }

  /**
   * Pointer coordinate along the splitter's axis.
   * @param {PointerEvent} event
   * @returns {number}
   */
  #pointerCoordinate(event) {
    return this.orientation === 'horizontal' ? event.clientX : event.clientY;
  }

  /**
   * Coordinate where an element starts along the splitter's axis.
   * @param {Element} element
   * @returns {number}
   */
  #startOf(element) {
    const rect = element.getBoundingClientRect();
    return this.orientation === 'horizontal' ? rect.left : rect.top;
  }

  /** @param {PointerEvent} event */
  #onPointerdown = (event) => {
    if (event.button !== 0) {
      return;
    }
    // Remember where the divider was grabbed, so it does not jump to the pointer.
    this.#dragOffset = this.#pointerCoordinate(event) - this.#startOf(this.#divider);
    this.#divider.setPointerCapture(event.pointerId);
    this.#divider.classList.add('dragging');
  };

  /** @param {PointerEvent} event */
  #onPointermove = (event) => {
    if (this.#dragOffset === null) {
      return;
    }
    const rect = this.#split.getBoundingClientRect();
    const size = this.orientation === 'horizontal' ? rect.width : rect.height;
    const offset = this.#pointerCoordinate(event) - this.#dragOffset - this.#startOf(this.#split);
    this.#moveTo((offset / size) * 100);
  };

  /** Runs after pointerup and pointercancel, because both release the capture. */
  #onDragEnd = () => {
    if (this.#dragOffset === null) {
      return;
    }
    this.#dragOffset = null;
    this.#divider.classList.remove('dragging');
    this.#save();
  };

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const horizontal = this.orientation === 'horizontal';
    let position;
    switch (event.key) {
      case horizontal ? 'ArrowLeft' : 'ArrowUp':
        position = this.position - KEYBOARD_STEP;
        break;
      case horizontal ? 'ArrowRight' : 'ArrowDown':
        position = this.position + KEYBOARD_STEP;
        break;
      case 'Home':
        position = 0;
        break;
      case 'End':
        position = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.#moveTo(position);
    this.#save();
  };
}

if (!customElements.get('mur-splitter')) {
  customElements.define('mur-splitter', MurSplitter);
}
