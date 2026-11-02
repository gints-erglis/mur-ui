// @ts-check

/**
 * <mur-statusbar>: thin bar for small status text.
 *
 * It has no live-region role, because frequently updating data would flood
 * screen readers. Add `role="status"` to a slotted element if its changes
 * should be announced.
 *
 * Slots:
 * - `start`: left side.
 * - (default): middle, takes the free space.
 * - `end`: right side.
 *
 * Parts:
 * - `start`, `center`, `end`: the wrappers around the slots.
 *
 * Attributes, properties, events: none.
 */

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
  </style>
  <div part="start"><slot name="start"></slot></div>
  <div part="center"><slot></slot></div>
  <div part="end"><slot name="end"></slot></div>
`;

export class MurStatusbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }
}

if (!customElements.get('mur-statusbar')) {
  customElements.define('mur-statusbar', MurStatusbar);
}
